<script setup lang="ts">
import { ref } from 'vue'

const sellers = ref([
  { id: '1', nickname: 'CardMaster', email: 'cardmaster@email.com', status: 'approved', products: 45, sales: 123000, rating: 4.8, joinedAt: '2026-01-15' },
  { id: '2', nickname: 'DragonSeller', email: 'dragon@email.com', status: 'approved', products: 23, sales: 67800, rating: 4.6, joinedAt: '2026-02-20' },
  { id: '3', nickname: 'MagicCards', email: 'magic@email.com', status: 'pending', products: 12, sales: 0, rating: 0, joinedAt: '2026-04-20' },
  { id: '4', nickname: 'AnimeSeller', email: 'anime@email.com', status: 'rejected', products: 0, sales: 0, rating: 0, joinedAt: '2026-04-10' },
])

const handleApprove = (id: string) => {
  const seller = sellers.value.find(s => s.id === id)
  if (seller) seller.status = 'approved'
}

const handleReject = (id: string) => {
  const seller = sellers.value.find(s => s.id === id)
  if (seller) seller.status = 'rejected'
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}
</script>

<template>
  <div class="sellers-page">
    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>商家</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>商品数</th>
            <th>总销售额</th>
            <th>评分</th>
            <th>入驻时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="seller in sellers" :key="seller.id">
            <td class="nickname">{{ seller.nickname }}</td>
            <td>{{ seller.email }}</td>
            <td><span class="status-badge" :class="seller.status">{{ seller.status === 'approved' ? '已认证' : seller.status === 'pending' ? '待审核' : '已拒绝' }}</span></td>
            <td>{{ seller.products }}</td>
            <td>{{ formatPrice(seller.sales) }}</td>
            <td>{{ seller.rating > 0 ? seller.rating + ' ⭐' : '-' }}</td>
            <td>{{ seller.joinedAt }}</td>
            <td>
              <button v-if="seller.status === 'pending'" @click="handleApprove(seller.id)" class="btn-action approve">通过</button>
              <button v-if="seller.status === 'pending'" @click="handleReject(seller.id)" class="btn-action reject">拒绝</button>
              <button v-if="seller.status === 'approved'" class="btn-action view">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sellers-page { display: flex; flex-direction: column; gap: var(--space-6); }
.data-table { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.nickname { font-weight: 600; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.approved { background: #10b98133; color: #10b981; }
.status-badge.pending { background: #f59e0b33; color: #f59e0b; }
.status-badge.rejected { background: #ef444433; color: #ef4444; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; margin-right: var(--space-2); }
.btn-action.approve { background: #10b981; color: white; }
.btn-action.reject { background: #ef4444; color: white; }
.btn-action.view { background: var(--bg-elevated); color: var(--text-primary); }
</style>
