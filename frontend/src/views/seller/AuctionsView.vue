<script setup lang="ts">
import { formatPrice, formatDate } from '@/utils/format'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { reservationApi } from '@/api/reservations'

const router = useRouter()

// ===== 三個分頁：拍賣 / 預訂 / 銷售 =====
type TabKey = 'auction' | 'reservation' | 'sale'
const activeTab = ref<TabKey>('auction')

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'auction', label: '拍賣', icon: '🔨' },
  { key: 'reservation', label: '預訂', icon: '📅' },
  { key: 'sale', label: '銷售', icon: '🏷️' },
]

const loading = ref(true)
const error = ref('')

interface Row {
  id: string
  productId: string
  title: string
  image: string
  category: string
  price: string          // 主價（拍賣=當前價 / 預訂=訂金 / 銷售=售價）
  priceLabel: string
  extra: string          // 輔助資訊（出價數/已訂名額/庫存）
  status: string         // 狀態 badge
  statusKey: string
  timeText: string       // 截止時間 / 到期時間
  viewLink: string       // 查看連結
}

const rows = ref<Row[]>([])
const counts = ref<Record<TabKey, number>>({ auction: 0, reservation: 0, sale: 0 })

const categories: Record<string, string> = {
  pokemon: '🎯', yugioh: '🎯', onepiece: '🎯',
  sports: '⚽', other: '🎴',
}

const parseImages = (images: any): string[] => {
  if (Array.isArray(images)) return images
  try { const arr = JSON.parse(images); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

const resolveImage = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return (import.meta.env.VITE_API_URL || '') + url
}

// ===== 拍賣分頁：GET /auctions/seller/my =====
const loadAuctionRows = async () => {
  const res = await auctionApi.getMyAuctions({ limit: 200 })
  const list = res.data?.data || []
  return list.map((a: any): Row => {
    const p = a.product || {}
    const imgs = parseImages(p.images)
    const st = (a.status || 'active').toLowerCase()
    return {
      id: a.id,
      productId: a.productId,
      title: p.titleZh || p.titleEn || '未知商品',
      image: resolveImage(imgs[0] || ''),
      category: p.category || 'other',
      price: formatPrice(a.currentPrice),
      priceLabel: '當前價',
      extra: `出價 ${a.bidCount || 0} 次`,
      statusKey: st,
      status: st === 'active' ? '進行中' : st === 'pending' ? '待開始' : st === 'ended' ? '已結束' : '已取消',
      timeText: a.endTime ? new Date(a.endTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      viewLink: `/auction/${a.id}`,
    }
  })
}

// ===== 預訂分頁：GET /reservations/seller =====
const loadReservationRows = async () => {
  const res = await reservationApi.getSellerReservations()
  const list = res.data?.data || res.data || []
  // 按 productId 合併（同一商品多名買家 → 顯示訂單數）
  const byProduct = new Map<string, { product: any; count: number; qty: number; latest: any }>()
  for (const r of list) {
    const p = r.product || {}
    const key = r.productId
    const entry = byProduct.get(key) || { product: p, count: 0, qty: 0, latest: r }
    entry.count++
    entry.qty += r.quantity || 1
    byProduct.set(key, entry)
  }
  return Array.from(byProduct.entries()).map(([pid, e]): Row => {
    const imgs = parseImages(e.product.images)
    const st = e.latest.status?.toLowerCase() || 'pending'
    return {
      id: e.latest.id,
      productId: e.product.id || '',
      title: e.product.titleZh || e.product.titleEn || '未知商品',
      image: resolveImage(imgs[0] || ''),
      category: e.product.category || 'other',
      price: formatPrice(e.latest.depositAmount),
      priceLabel: '訂金',
      extra: `已訂 ${e.count} 單 / ${e.qty} 件`,
      statusKey: st === 'deposit_paid' ? 'confirmed' : st,
      status: st === 'deposit_paid' ? '已付訂金' : st === 'pending' ? '待付訂金' : st === 'confirmed' ? '已確認' : st === 'completed' ? '已完成' : st === 'cancelled' ? '已取消' : st === 'expired' ? '已過期' : st,
      timeText: e.product.reservationDeadline ? `截止 ${formatDate(e.product.reservationDeadline)}` : '',
      viewLink: `/product/${e.product.id}`,
    }
  })
}

// ===== 銷售分頁：GET /products/seller（listingType=sale）=====
const loadSaleRows = async () => {
  const res = await productApi.getMyProducts({ limit: 200 })
  const list = (Array.isArray(res.data) ? res.data : (res.data as any)?.data) || []
  return list
    .filter((p: any) => (p.listingType || 'sale') === 'sale')
    .map((p: any): Row => {
      const imgs = parseImages(p.images)
      const st = p.status || 'active'
      return {
        id: p.id,
        productId: p.id,
        title: p.titleZh || p.titleEn || '未知商品',
        image: resolveImage(imgs[0] || ''),
        category: p.category || 'other',
        price: formatPrice(p.price),
        priceLabel: '售價',
        extra: `庫存 ${p.quantity ?? p.stock ?? 0}`,
        statusKey: st,
        status: st === 'active' ? '在售' : st === 'draft' ? '草稿' : st === 'sold' ? '已售' : st === 'removed' ? '已下架' : st,
        timeText: p.soldAt ? `售出 ${formatDate(p.soldAt)}` : '',
        viewLink: `/product/${p.id}`,
      }
    })
}

const loadTab = async () => {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'auction') rows.value = await loadAuctionRows()
    else if (activeTab.value === 'reservation') rows.value = await loadReservationRows()
    else rows.value = await loadSaleRows()
  } catch (e: any) {
    console.error('Failed to load list:', e)
    error.value = e.response?.data?.message || '載入失敗，請重試'
    rows.value = []
  } finally {
    loading.value = false
  }
}

const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  activeTab.value = key
  loadTab()
}

// 初始載入三個 tab 數量（拍賣即時載，其餘兩個並行統計）
const loadCounts = async () => {
  try {
    const [a, r, p] = await Promise.all([
      auctionApi.getMyAuctions({ limit: 200 }),
      reservationApi.getSellerReservations().catch(() => ({ data: { data: [] } })),
      productApi.getMyProducts({ limit: 200 }),
    ])
    const pl = (Array.isArray(p.data) ? p.data : (p.data as any)?.data) || []
    counts.value = {
      auction: (a.data?.data || []).length,
      reservation: new Set((r.data?.data || []).map((x: any) => x.productId)).size,
      sale: pl.filter((x: any) => (x.listingType || 'sale') === 'sale').length,
    }
  } catch { /* counts 非關鍵 */ }
}

const getStatusClass = (key: string) => {
  const map: Record<string, string> = {
    active: 'active', confirmed: 'active',
    pending: 'pending', deposit_paid: 'pending',
    ended: 'ended', completed: 'ended', sold: 'ended',
    cancelled: 'cancelled', removed: 'cancelled', expired: 'cancelled',
    draft: 'pending',
  }
  return map[key] || 'ended'
}

const goCreate = () => router.push('/seller/products?action=create')

onMounted(() => {
  loadTab()
  loadCounts()
})
</script>

<template>
  <div class="product-list-management">
    <!-- Tab 分頁 -->
    <div class="list-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="list-tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
        <span class="tab-count">{{ counts[tab.key] }}</span>
      </button>
      <button class="btn-new" @click="goCreate">+ 發布新商品</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="loadTab">重試</button>
    </div>

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="empty-state">
      <div class="empty-icon">{{ activeTab === 'auction' ? '🔨' : activeTab === 'reservation' ? '📅' : '🏷️' }}</div>
      <h3>暫無{{ tabs.find(t => t.key === activeTab)?.label }}商品</h3>
      <p>點击「+ 發布新商品」並選擇對應銷售模式即可創建。</p>
    </div>

    <!-- List (table) -->
    <div v-else class="list-table">
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>{{ activeTab === 'auction' ? '當前價' : activeTab === 'reservation' ? '訂金' : '售價' }}</th>
            <th>{{ activeTab === 'auction' ? '出價' : activeTab === 'reservation' ? '已訂' : '庫存' }}</th>
            <th>狀態</th>
            <th>{{ activeTab === 'auction' ? '截止時間' : activeTab === 'reservation' ? '預約截止' : '備註' }}</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="activeTab + row.id">
            <td>
              <div class="product-cell">
                <img v-if="row.image" :src="row.image" class="row-thumb" :alt="row.title" />
                <span v-else class="category-emoji">{{ categories[row.category] || '🎴' }}</span>
                <span class="product-title">{{ row.title }}</span>
              </div>
            </td>
            <td class="price-cell highlight">{{ row.price }}</td>
            <td>{{ row.extra }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(row.statusKey)">{{ row.status }}</span>
            </td>
            <td>{{ row.timeText || '—' }}</td>
            <td>
              <button class="btn-action view" @click="router.push(row.viewLink)">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.product-list-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.list-tabs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.list-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.list-tab:hover {
  border-color: var(--primary);
}

.list-tab.active {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

.tab-count {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.15);
  font-size: var(--text-xs);
  font-weight: 600;
}

.list-tab:not(.active) .tab-count {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.tab-icon {
  font-size: 14px;
}

.btn-new {
  margin-left: auto;
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.btn-new:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.loading-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: var(--space-10);
  background: var(--bg-card);
  border: 1px solid var(--danger);
  border-radius: var(--radius-xl);
  color: var(--danger);
}

.btn-retry {
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.empty-state h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
}

.list-table {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

td {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

tr:last-child td {
  border-bottom: none;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.row-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--bg-elevated);
}

.category-emoji {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
}

.product-title {
  font-weight: 500;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-cell {
  font-family: var(--font-num);
}

.price-cell.highlight {
  color: var(--primary);
  font-weight: 700;
}

.status-badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.active {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.ended {
  background: #6b72804d;
  color: #6b7280;
}

.status-badge.cancelled {
  background: #ef44444d;
  color: #ef4444;
}

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-action.view {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-action.view:hover {
  background: var(--primary);
  color: white;
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .product-list-management {
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .list-tabs {
    flex-wrap: wrap;
  }
  .btn-new {
    margin-left: 0;
    width: 100%;
  }
  .list-table {
    overflow-x: auto;
  }
  table {
    min-width: 640px;
  }
}
</style>