<script setup lang="ts">
import { ref } from 'vue'

const auctions = ref([
  { id: '1', title: 'Pokemon 1st Edition Base Set', seller: 'CardMaster', currentPrice: 12800, bids: 23, status: 'active', endTime: '2026-04-21 18:00' },
  { id: '2', title: 'Yu-Gi-Oh Blue-Eyes White Dragon', seller: 'DragonSeller', currentPrice: 6800, bids: 15, status: 'active', endTime: '2026-04-21 22:00' },
  { id: '3', title: 'MTG Black Lotus', seller: 'MagicCards', currentPrice: 25000, bids: 8, status: 'active', endTime: '2026-04-22 10:00' },
  { id: '4', title: 'Old Auction', seller: 'CardMaster', currentPrice: 5000, bids: 5, status: 'ended', endTime: '2026-04-15 10:00' },
])

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}

const handleCancel = (id: string) => {
  if (confirm('确定要取消此拍卖吗？')) {
    const auction = auctions.value.find(a => a.id === id)
    if (auction) auction.status = 'cancelled'
  }
}
</script>

<template>
  <div class="auctions-page">
    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>拍卖</th>
            <th>卖家</th>
            <th>当前价格</th>
            <th>出价次数</th>
            <th>状态</th>
            <th>截止时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="auction in auctions" :key="auction.id">
            <td class="title">{{ auction.title }}</td>
            <td>{{ auction.seller }}</td>
            <td class="price">{{ formatPrice(auction.currentPrice) }}</td>
            <td>{{ auction.bids }}</td>
            <td><span class="status-badge" :class="auction.status">{{ auction.status === 'active' ? '进行中' : auction.status === 'ended' ? '已结束' : '已取消' }}</span></td>
            <td>{{ auction.endTime }}</td>
            <td>
              <button v-if="auction.status === 'active'" @click="handleCancel(auction.id)" class="btn-action cancel">取消</button>
              <button v-else class="btn-action view">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.auctions-page { display: flex; flex-direction: column; gap: var(--space-6); }
.data-table { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.title { font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { font-family: var(--font-num); color: var(--primary); font-weight: 600; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.active { background: #10b98133; color: #10b981; }
.status-badge.ended { background: #6b728033; color: #6b7280; }
.status-badge.cancelled { background: #ef444433; color: #ef4444; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; }
.btn-action.cancel { background: #ef444433; color: #ef4444; }
.btn-action.view { background: var(--bg-elevated); color: var(--text-primary); }
</style>
