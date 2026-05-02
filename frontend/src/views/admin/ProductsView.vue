<script setup lang="ts">
import { ref } from 'vue'

const products = ref([
  { id: '1', title: 'Pokemon 1st Edition Base Set', seller: 'CardMaster', category: 'pokemon', price: 12800, status: 'pending', createdAt: '2026-04-21' },
  { id: '2', title: 'Yu-Gi-Oh Blue-Eyes White Dragon', seller: 'DragonSeller', category: 'yugioh', price: 6800, status: 'approved', createdAt: '2026-04-20' },
  { id: '3', title: 'MTG Black Lotus', seller: 'MagicCards', category: 'mtg', price: 25000, status: 'pending', createdAt: '2026-04-19' },
  { id: '4', title: 'Fake Card', seller: 'Scammer', category: 'other', price: 100, status: 'rejected', createdAt: '2026-04-18' },
])

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}

const handleApprove = (id: string) => {
  const product = products.value.find(p => p.id === id)
  if (product) product.status = 'approved'
}

const handleReject = (id: string) => {
  const product = products.value.find(p => p.id === id)
  if (product) product.status = 'rejected'
}
</script>

<template>
  <div class="products-page">
    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>卖家</th>
            <th>类别</th>
            <th>价格</th>
            <th>状态</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td class="title">{{ product.title }}</td>
            <td>{{ product.seller }}</td>
            <td>{{ product.category }}</td>
            <td>{{ formatPrice(product.price) }}</td>
            <td><span class="status-badge" :class="product.status">{{ product.status === 'approved' ? '已通過' : product.status === 'pending' ? '待審核' : '已拒絕' }}</span></td>
            <td>{{ product.createdAt }}</td>
            <td>
              <button v-if="product.status === 'pending'" @click="handleApprove(product.id)" class="btn-action approve">通過</button>
              <button v-if="product.status === 'pending'" @click="handleReject(product.id)" class="btn-action reject">拒絕</button>
              <button v-if="product.status !== 'pending'" class="btn-action view">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.products-page { display: flex; flex-direction: column; gap: var(--space-6); }
.data-table { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.title { font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.approved { background: #10b98133; color: #10b981; }
.status-badge.pending { background: #f59e0b33; color: #f59e0b; }
.status-badge.rejected { background: #ef444433; color: #ef4444; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; margin-right: var(--space-2); }
.btn-action.approve { background: #10b981; color: white; }
.btn-action.reject { background: #ef4444; color: white; }
.btn-action.view { background: var(--bg-elevated); color: var(--text-primary); }
</style>
