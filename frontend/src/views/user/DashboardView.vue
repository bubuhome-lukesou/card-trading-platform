<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const { t } = useI18n()
const authStore = useAuthStore()

// ===== 資料（全量拉取 limit=200 計真統計，同 seller 口徑） =====
const orders = ref<any[]>([])
const bids = ref<any[]>([])
const loading = ref(true)

// ===== 統計（summary-bar 風格，同訂單頁口徑） =====
// 累計消費 = confirmed,shipped,delivered（全站收款口徑，同 admin 用戶管理 totalSpend 一致；訂金已確認即已付出）
// 進行中 = pending/pending_paid/confirmed/shipped
const stats = computed(() => {
  const activeBids = bids.value.filter((b: any) => {
    const auction = b.auction || {}
    const ended = auction.endTime ? new Date(auction.endTime) < new Date() : false
    return !ended && b.status === 'active'
  }).length
  return {
    totalOrders: orders.value.filter((o: any) => o.status !== 'cancelled').length,
    todoOrders: orders.value.filter((o: any) => ['pending', 'pending_paid', 'confirmed', 'shipped'].includes(o.status)).length,
    totalBids: bids.value.length,
    activeBids,
    totalSpent: orders.value
      .filter((o: any) => ['confirmed', 'shipped', 'delivered'].includes(o.status))
      .reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0),
  }
})

// ===== 最新訂單（行結構同「我的訂單」列表：商品+tag/商家/金額/狀態/時間，無 ORD- 號） =====
const recentOrders = computed(() =>
  orders.value.slice(0, 5).map((o: any) => {
    let images: string[] = []
    try {
      images = typeof o.product?.images === 'string'
        ? JSON.parse(o.product.images)
        : (Array.isArray(o.product?.images) ? o.product.images : [])
    } catch {}
    return {
      id: o.id,
      productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
      productImage: images[0] || '',
      sellerNickname: o.seller?.nickname || '未知商家',
      amount: Number(o.totalPrice) || 0,
      status: o.status,
      type: o.type,
      createdAt: o.createdAt,
    }
  })
)

// ===== 我的出價（行結構：商品+出價/當前價/狀態，點擊跳拍賣詳情） =====
const recentBids = computed(() =>
  bids.value.slice(0, 5).map((b: any) => {
    const auction = b.auction || {}
    const product = auction.product || {}
    const now = new Date()
    const ended = auction.endTime ? new Date(auction.endTime) < now : false
    const isWinner = auction.winnerId === authStore.user?.id
    let bidStatus: string = 'winning'
    if (b.status === 'won' || isWinner) bidStatus = 'won'
    else if (b.status === 'outbid' || (auction.winnerId && !isWinner)) bidStatus = 'outbid'
    else if (ended) bidStatus = 'ended'
    return {
      id: b.id,
      auctionId: b.auctionId,
      title: product.titleZh || product.titleEn || '拍賣商品',
      yourBid: Number(b.amount) || 0,
      currentBid: Number(auction.currentPrice || b.amount) || 0,
      status: bidStatus,
      endTime: auction.endTime || '',
    }
  })
)

const BID_STATUS: Record<string, { cls: string; key: string }> = {
  outbid: { cls: 'st-cancelled', key: 'user.bidOutbid' },
  winning: { cls: 'st-confirmed', key: 'user.bidWinning' },
  won: { cls: 'st-delivered', key: 'user.bidWon' },
  ended: { cls: 'st-default', key: 'user.bidEnded' },
}
const bidStatus = (s: string) => BID_STATUS[s] || { cls: 'st-default', key: s }

// ===== 徽章（同訂單頁一致） =====
const ORDER_TYPE: Record<string, { key: string; cls: string }> = {
  direct_purchase: { key: 'user.typeDirect', cls: 't-sale' },
  buy_now: { key: 'user.typeBuyNow', cls: 't-auction' },
  auction_win: { key: 'user.typeAuctionWin', cls: 't-auction' },
  reservation_deposit: { key: 'user.typeReserveDeposit', cls: 't-reserve' },
  reservation_full: { key: 'user.typeReserveFull', cls: 't-reserve' },
}
const typeTag = (type: string) => ORDER_TYPE[type] || { key: '', cls: 't-sale' }

const ORDER_STATUS: Record<string, { cls: string; key: string }> = {
  pending: { cls: 'st-pending', key: 'user.stPending' },
  pending_paid: { cls: 'st-pending-paid', key: 'user.stPendingMerchant' },
  confirmed: { cls: 'st-confirmed', key: 'user.stConfirmed' },
  shipped: { cls: 'st-shipped', key: 'user.stShipped' },
  delivered: { cls: 'st-delivered', key: 'user.stDelivered' },
  cancelled: { cls: 'st-cancelled', key: 'user.stCancelled' },
  refunded: { cls: 'st-cancelled', key: 'user.stRefunded' },
}
const orderStatus = (s: string, type?: string) => {
  if (type === 'reservation_deposit' && s === 'confirmed') return { cls: 'st-confirmed', key: 'user.stPendingBalance' }
  if (type === 'reservation_deposit' && s === 'pending') return { cls: 'st-pending', key: 'user.stPendingDeposit' }
  const found = ORDER_STATUS[s] || { cls: 'st-default', key: '' }
  return found.key ? { cls: found.cls, text: t(found.key) } : { cls: found.cls, text: s }
}

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

const loadData = async () => {
  loading.value = true
  try {
    // 全量拉取（limit=200）— 統計唔會截斷
    const [bidsRes, ordersRes] = await Promise.all([
      api.get('/bids/my', { params: { limit: 200 } }),
      api.get('/orders', { params: { page: 1, limit: 200 } }),
    ])
    bids.value = bidsRes.data?.data || []
    orders.value = (ordersRes.data?.data || ordersRes.data || [])
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="user-dashboard">
    <!-- 歡迎 -->
    <div class="welcome-section">
      <h1>{{ t('user.welcomeBack', { name: authStore.user?.nickname || t('user.roleCollectorFallback') }) }}</h1>
      <p>{{ t('user.welcomeSub') }}</p>
    </div>

    <!-- 統計條（同四分頁 summary-bar/stat-item 風格） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item" :class="{ alert: stats.todoOrders > 0 }">
        <span class="stat-label">{{ t('user.statActiveOrders') }}</span>
        <span class="stat-value">{{ stats.todoOrders }} <small>{{ t('user.unitOrders') }}</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">{{ t('user.statOrders') }}</span>
        <span class="stat-value">{{ stats.totalOrders }} <small>{{ t('user.unitOrders') }}</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">{{ t('user.statActiveBids') }}</span>
        <span class="stat-value">{{ stats.activeBids }} <small>/ {{ t('user.unitAll', { total: stats.totalBids }) }}</small></span>
      </div>
      <div class="stat-item primary">
        <span class="stat-label">{{ t('user.statTotalSpent') }}</span>
        <span class="stat-value money">{{ formatPrice(stats.totalSpent) }}</span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/auctions" class="action-card">
        <span class="action-icon">🔨</span>
        <span class="action-text">{{ t('user.actAuctions') }}</span>
      </router-link>
      <router-link to="/marketplace" class="action-card">
        <span class="action-icon">🛒</span>
        <span class="action-text">{{ t('user.actMarketplace') }}</span>
      </router-link>
      <router-link to="/user/favorites" class="action-card">
        <span class="action-icon">❤️</span>
        <span class="action-text">{{ t('user.myFavorites') }}</span>
      </router-link>
      <router-link to="/user/wallet" class="action-card">
        <span class="action-icon">💳</span>
        <span class="action-text">{{ t('user.wallet') }}</span>
      </router-link>
    </div>

    <!-- Recent Activity -->
    <div class="dashboard-grid">
      <!-- 我的訂單（行結構同「我的訂單」列表） -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('user.latestOrders') }}</h3>
          <router-link to="/user/orders" class="see-all">{{ t('user.viewAll') }}</router-link>
        </div>
        <div class="card-body">
          <StateView v-if="loading" state="loading" :title="t('user.loadingShort')" />
          <StateView v-else-if="!recentOrders.length" state="empty" icon="📦" :title="t('user.noOrders')" />
          <div v-else class="order-list">
            <div v-for="order in recentOrders" :key="order.id" class="order-item">
              <img v-if="order.productImage" :src="resolveImageUrl(order.productImage)" class="row-thumb" :alt="order.productTitle" />
              <span v-else class="row-emoji">🃏</span>
              <div class="oi-info">
                <div class="oi-title">{{ order.productTitle }}</div>
                <div class="oi-meta">
                  <span class="type-tag" :class="typeTag(order.type).cls">{{ typeTag(order.type).key ? t(typeTag(order.type).key) : order.type }}</span>
                  <span class="status-badge" :class="orderStatus(order.status, order.type).cls">{{ orderStatus(order.status, order.type).text }}</span>
                </div>
              </div>
              <div class="oi-right">
                <div class="oi-amount">{{ formatPrice(order.amount) }}</div>
                <div class="oi-date">{{ formatDate(order.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的出價 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🎯 {{ t('user.myBids') }}</h3>
        </div>
        <div class="card-body">
          <StateView v-if="loading" state="loading" :title="t('user.loadingShort')" />
          <StateView v-else-if="!recentBids.length" state="empty" icon="🎯" :title="t('user.noBids')" />
          <div v-else class="order-list">
            <div
              v-for="bid in recentBids"
              :key="bid.id"
              class="order-item clickable"
              @click="$router.push(`/auction/${bid.auctionId}`)"
            >
              <span class="row-emoji">🔨</span>
              <div class="oi-info">
                <div class="oi-title">{{ bid.title }}</div>
                <div class="oi-meta">
                  <span class="status-badge" :class="bidStatus(bid.status).cls">{{ t(bidStatus(bid.status).key) }}</span>
                </div>
              </div>
              <div class="oi-right">
                <div class="oi-amount">{{ formatPrice(bid.yourBid) }}</div>
                <div class="oi-date">{{ t('user.currentBid', { price: formatPrice(bid.currentBid) }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-dashboard { display: flex; flex-direction: column; gap: var(--space-4); }

.welcome-section h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.welcome-section p {
  color: var(--text-secondary);
}

/* ===== 統計條（同四分頁 summary-bar/stat-item）===== */
.summary-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 0;
}

.stat-label { font-size: var(--text-xs); color: var(--text-secondary); white-space: nowrap; }

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}

.stat-value small { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }
.stat-value.money { color: #10b981; }
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }
.stat-item.primary { border-color: rgba(99, 102, 241, 0.5); background: rgba(99, 102, 241, 0.08); }

/* ===== Quick Actions ===== */
.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.action-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 16px #667eea33; }
.action-icon { font-size: 26px; }
.action-text { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }

/* ===== Recent Activity ===== */
.dashboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.card-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
.see-all { font-size: var(--text-sm); color: var(--primary); text-decoration: none; }
.see-all:hover { text-decoration: underline; }
.card-body { padding: var(--space-4); }

.order-list { display: flex; flex-direction: column; gap: var(--space-2); }

.order-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  min-width: 0;
}

.order-item.clickable { cursor: pointer; transition: background var(--transition-fast); }
.order-item.clickable:hover { background: var(--bg-card); outline: 1px solid var(--border); }

.row-emoji {
  font-size: 20px;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card); border-radius: var(--radius-md); flex-shrink: 0;
}

.order-item img {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--bg-card);
  flex-shrink: 0;
}

.oi-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oi-title { font-size: var(--text-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.oi-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.oi-right { text-align: right; flex-shrink: 0; }
.oi-amount { font-family: var(--font-num); font-weight: 700; color: var(--primary); font-size: var(--text-sm); }
.oi-date { font-size: var(--text-xs); color: var(--text-muted); }

/* 類型 tag（同列表色制）*/
.type-tag {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  width: fit-content;
}
.type-tag.t-sale { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.type-tag.t-auction { background: rgba(236, 72, 153, 0.18); color: #ec4899; }
.type-tag.t-reserve { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }

.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; white-space: nowrap; }
.st-pending { background: #f59e0b4d; color: #f59e0b; }
.st-pending-paid { background: #fb923c4d; color: #fb923c; }
.st-confirmed { background: #10b9814d; color: #10b981; }
.st-shipped { background: #8b5cf64d; color: #8b5cf6; }
.st-delivered { background: #10b98166; color: #059669; }
.st-cancelled { background: #ef44444d; color: #ef4444; }
.st-default { background: #6b72804d; color: #6b7280; }

/* ===== 手機適配（<768px，同四分頁）===== */
@media (max-width: 767px) {
  .user-dashboard,
  .summary-bar,
  .stat-item,
  .quick-actions,
  .dashboard-grid,
  .card {
    min-width: 0;
  }

  .welcome-section h1 { font-size: var(--text-xl); }
  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); flex-wrap: wrap; }
  .stat-value { font-size: var(--text-base); }

  .quick-actions { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .action-card { padding: var(--space-4); }

  .dashboard-grid { grid-template-columns: 1fr; }
  .card-header { padding: var(--space-3) var(--space-4); }
  .card-body { padding: var(--space-3); }
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .user-dashboard { max-width: 100%; }
}
</style>