<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { ordersApi } from '@/api/orders'
import { CategoryLogo } from '@/components/brand/CategoryLogos'

const { t } = useI18n()

const products = ref<any[]>([])
const orders = ref<any[]>([])
const auctions = ref<any[]>([])
const loading = ref(true)

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}
const parseImages = (images: any): string[] => {
  if (Array.isArray(images)) return images
  try { const arr = JSON.parse(images); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

// ===== 統計定義（與四個分頁一致，唔好另立一套）=====
// 商品：全部（同商品列表三 tab 總和）
// 待處理訂單：pending/pending_paid/paid/confirmed（同訂單管理 TAB_STATUSES.todo 口徑）
// 總收入：confirmed/shipped/delivered（同訂單管理「已收款」/收益管理口徑；預約單冇經過 paid）
const stats = computed(() => {
  const done = ['confirmed', 'shipped', 'delivered']
  const todo = ['pending', 'pending_paid', 'paid', 'confirmed']
  const activeAuctionList = auctions.value.filter((a: any) => a.status === 'active')
  const reservationProducts = products.value.filter((p: any) => p.listingType === 'reservation')
  return {
    totalProducts: products.value.length,
    activeAuctions: auctions.value.filter((a: any) => a.status === 'active').length,
    reservationCount: reservationProducts.length,
    saleCount: products.value.filter((p: any) => (p.listingType || 'sale') === 'sale').length,
    todoOrders: orders.value.filter((o: any) => todo.includes(o.status)).length,
    validOrders: orders.value.filter((o: any) => o.status !== 'cancelled').length,
    totalEarnings: orders.value
      .filter((o: any) => done.includes(o.status))
      .reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0),
  }
})

// 最新訂單（同訂單管理行結構：商品+類型tag/買家/金額/狀態/時間，無 ORD- 號）
const recentOrders = computed(() =>
  orders.value
    .slice(0, 5)
    .map((o: any) => {
      const images = parseImages(o.product?.images)
      return {
        id: o.id,
        productId: o.productId || '',
        productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
        productImage: images[0] || '',
        buyerNickname: o.buyer?.nickname || '-',
        amount: Number(o.totalPrice) || 0,
        status: o.status,
        type: o.type,
        createdAt: o.createdAt,
      }
    })
)

// 進行中拍賣（同商品列表拍賣 tab 行結構）
const activeAuctionList = computed(() =>
  auctions.value
    .filter((a: any) => a.status === 'active')
    .slice(0, 5)
    .map((a: any) => {
      const images = parseImages(a.product?.images)
      return {
        id: a.id,
        productId: a.productId,
        title: a.product?.titleZh || a.product?.titleEn || '未知商品',
        image: resolveImageUrl(images[0] || ''),
        category: a.product?.category || 'other',
        currentPrice: Number(a.currentPrice) || 0,
        bidCount: a.bidCount || 0,
        endTime: a.endTime,
      }
    })
)

const ORDER_TYPE: Record<string, { text: string; cls: string }> = {
  direct_purchase: { text: '直購', cls: 't-sale' },
  buy_now: { text: '拍賣直購', cls: 't-auction' },
  auction_win: { text: '拍賣得標', cls: 't-auction' },
  reservation_deposit: { text: '預約訂金', cls: 't-reserve' },
  reservation_full: { text: '預約尾款', cls: 't-reserve' },
}
const typeTag = (type: string) => ORDER_TYPE[type] || { text: type, cls: 't-sale' }

const ORDER_STATUS: Record<string, { cls: string; text: string }> = {
  pending: { cls: 'st-pending', text: '待付款' },
  pending_paid: { cls: 'st-pending-paid', text: '待確認' },
  paid: { cls: 'st-paid', text: '已付款' },
  confirmed: { cls: 'st-confirmed', text: '已確認' },
  shipped: { cls: 'st-shipped', text: '已發貨' },
  delivered: { cls: 'st-delivered', text: '已完成' },
  cancelled: { cls: 'st-cancelled', text: '已取消' },
  refunded: { cls: 'st-cancelled', text: '已退款' },
}
const orderStatus = (s: string) => ORDER_STATUS[s] || { cls: 'st-cancelled', text: s }

const nextStepFor = (o: { status: string; type: string }): string => {
  if (o.status === 'pending') return '等待買家付款'
  if (o.status === 'pending_paid') return '請確認收款'
  if (o.status === 'confirmed') {
    return o.type === 'reservation_deposit' ? '待買家到店付尾款' : '待發貨'
  }
  if (o.status === 'shipped') return '待買家確認收貨'
  return ''
}

const loadData = async () => {
  loading.value = true
  try {
    // limit=200（同訂單管理一致，確保統計唔會截斷）
    const [productsRes, auctionsRes, ordersRes] = await Promise.all([
      productApi.getMyProducts({ limit: 200 }),
      auctionApi.getMyAuctions({ limit: 200 }),
      ordersApi.getSellerOrders(1, 200),
    ])
    products.value = (Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data as any)?.data) || []
    auctions.value = auctionsRes.data?.data || []
    orders.value = ordersRes.data?.data || []
  } catch (e) {
    console.error('Failed to load dashboard', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="seller-dashboard">
    <!-- Stats Grid（同四分頁 summary-bar/stat-item 風格） -->
    <div class="summary-bar">
      <div class="stat-item" :class="{ alert: stats.todoOrders > 0 }">
        <span class="stat-label">待處理訂單</span>
        <span class="stat-value">{{ stats.todoOrders }} <small>筆</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">商品</span>
        <span class="stat-value">{{ stats.totalProducts }} <small>件</small></span>
        <small class="stat-meta">拍賣 {{ stats.activeAuctions }} · 預訂 {{ stats.reservationCount }} · 銷售 {{ stats.saleCount }}</small>
      </div>
      <div class="stat-item">
        <span class="stat-label">有效訂單</span>
        <span class="stat-value">{{ stats.validOrders }} <small>筆</small></span>
      </div>
      <div class="stat-item primary">
        <span class="stat-label">總收入</span>
        <span class="stat-value money">{{ formatPrice(stats.totalEarnings) }}</span>
        <small class="stat-meta">同收益管理</small>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/seller/auctions?action=create" class="action-card">
        <span class="action-icon">➕</span>
        <span class="action-text">發布新商品</span>
      </router-link>
      <router-link to="/seller/auctions" class="action-card">
        <span class="action-icon">🔨</span>
        <span class="action-text">商品列表</span>
      </router-link>
      <router-link to="/seller/orders" class="action-card">
        <span class="action-icon">📦</span>
        <span class="action-text">處理訂單</span>
      </router-link>
      <router-link to="/seller/earnings" class="action-card">
        <span class="action-icon">💳</span>
        <span class="action-text">查看收益</span>
      </router-link>
    </div>

    <!-- Recent Activity -->
    <div class="dashboard-grid">
      <!-- Recent Orders -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 最新訂單</h3>
          <router-link to="/seller/orders" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <StateView v-if="loading" state="loading" title="加載中..." />
          <StateView v-else-if="!recentOrders.length" state="empty" icon="📋" title="暫無訂單" />
          <div v-else class="order-list">
            <div v-for="order in recentOrders" :key="order.id" class="order-item">
              <img v-if="order.productImage" :src="resolveImageUrl(order.productImage)" class="row-thumb" :alt="order.productTitle" />
              <span v-else class="row-emoji">🃏</span>
              <div class="oi-info">
                <div class="oi-title">{{ order.productTitle }}</div>
                <div class="oi-meta">
                  <span class="type-tag" :class="typeTag(order.type).cls">{{ typeTag(order.type).text }}</span>
                  <span class="status-badge" :class="orderStatus(order.status).cls">{{ orderStatus(order.status).text }}</span>
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

      <!-- Active Auctions -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔥 進行中拍賣</h3>
          <router-link to="/seller/auctions" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <StateView v-if="loading" state="loading" title="加載中..." />
          <StateView v-else-if="!activeAuctionList.length" state="empty" icon="🔥" title="暫無進行中拍賣" />
          <div v-else class="auction-list">
            <div v-for="auction in activeAuctionList" :key="auction.id" class="auction-item">
              <img v-if="auction.image" :src="auction.image" class="row-thumb-sm" :alt="auction.title" />
              <span v-else class="row-emoji-sm"><CategoryLogo :category="auction.category" :size="20" /></span>
              <div class="auction-info">
                <div class="auction-title">{{ auction.title }}</div>
                <div class="auction-meta">
                  <span>🔨 {{ auction.bidCount }} 次出價</span>
                  <span>•</span>
                  <span>截止 {{ formatDateTime(auction.endTime) }}</span>
                </div>
              </div>
              <div class="auction-price">
                <div class="current-price">{{ formatPrice(auction.currentPrice) }}</div>
                <div class="price-label">當前價</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-dashboard { display: flex; flex-direction: column; gap: var(--space-4); }

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
.stat-meta { font-size: var(--text-xs); color: var(--text-muted); margin-left: 4px; }
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

/* 最新訂單（同訂單管理卡片行結構）*/
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
.oi-meta, .oi-info .type-tag { display: inline-flex; }
.oi-right { text-align: right; flex-shrink: 0; }
.oi-amount { font-family: var(--font-num); font-weight: 700; color: var(--primary); font-size: var(--text-sm); }
.oi-date { font-size: var(--text-xs); color: var(--text-muted); }
.oi-info > div:last-child { display: flex; gap: 6px; flex-wrap: wrap; }

/* 類型 tag（同四分頁色制）*/
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
.st-paid { background: #3b82f633; color: #3b82f6; }
.st-confirmed { background: #10b9814d; color: #10b981; }
.st-shipped { background: #8b5cf64d; color: #8b5cf6; }
.st-delivered { background: #10b98166; color: #059669; }
.st-cancelled { background: #ef44444d; color: #ef4444; }

/* 進行中拍賣（同商品列表行結構）*/
.auction-list { display: flex; flex-direction: column; gap: var(--space-2); }

.auction-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  min-width: 0;
}

.row-thumb-sm {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--bg-card);
  flex-shrink: 0;
}

.row-emoji-sm {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card); border-radius: var(--radius-md); flex-shrink: 0;
  overflow: hidden;
}

.auction-info { flex: 1; min-width: 0; }
.auction-title { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); margin-bottom: var(--space-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.auction-meta { font-size: var(--text-xs); color: var(--text-secondary); display: flex; gap: var(--space-2); white-space: nowrap; }
.auction-price { text-align: right; flex-shrink: 0; }
.current-price { font-family: var(--font-num); font-size: var(--text-base); font-weight: 700; color: var(--primary); }
.price-label { font-size: var(--text-xs); color: var(--text-secondary); }

/* ===== 手機適配（<768px，同四分頁）===== */
@media (max-width: 767px) {
  /* min-width 傳遞鏈修復 */
  .seller-dashboard,
  .summary-bar,
  .stat-item,
  .quick-actions,
  .dashboard-grid,
  .card {
    min-width: 0;
  }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); flex-wrap: wrap; }
  .stat-value { font-size: var(--text-base); }
  .stat-meta { display: none; }

  .quick-actions { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .action-card { padding: var(--space-4); }

  .dashboard-grid { grid-template-columns: 1fr; }
  .card-header { padding: var(--space-3) var(--space-4); }
  .card-body { padding: var(--space-3); }
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .seller-dashboard { max-width: 100%; }
}
</style>