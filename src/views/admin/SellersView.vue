<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'

const sellers = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const limit = 20

const fetchSellers = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/users', { params: { page: currentPage.value, limit, role: 'seller' } })
    sellers.value = res.data.data
    total.value = res.data.total
  } catch (e) {
    console.error('Failed to fetch sellers', e)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchSellers()
}

const handleUpdateStatus = async (id: string, status: string) => {
  try {
    await api.patch(`/admin/users/${id}`, { status })
    await fetchSellers()
  } catch (e) {
    alert('操作失敗')
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', { style: 'currency', currency: 'MOP', minimumFractionDigits: 0 }).format(price || 0)
}

const formatDate = (date: string) => {
  return date ? new Date(date).toLocaleDateString('zh-MO') : '-'
}

onMounted(() => fetchSellers())
</script>

<template>
  <div class="sellers-page">
    <div class="page-header">
      <span class="total-count">共 {{ total }} 位商家</span>
    </div>

    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>商家</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="loading">加载中...</td></tr>
          <tr v-else-if="!sellers.length"><td colspan="5" class="empty">暫無商家數據</td></tr>
          <tr v-for="seller in sellers" :key="seller.id">
            <td class="nickname">{{ seller.nickname || '-' }}</td>
            <td>{{ seller.email }}</td>
            <td><span class="status-badge" :class="seller.status">{{ seller.status === 'active' ? '正常' : '已封禁' }}</span></td>
            <td>{{ formatDate(seller.createdAt) }}</td>
            <td>
              <button v-if="seller.status === 'active'" @click="handleUpdateStatus(seller.id, 'suspended')" class="btn-action suspend">封禁</button>
              <button v-else @click="handleUpdateStatus(seller.id, 'active')" class="btn-action activate">解封</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > limit" class="pagination">
      <button :disabled="currentPage === 1" @click="handlePageChange(currentPage - 1)">上一页</button>
      <span>第 {{ currentPage }} / {{ Math.ceil(total / limit) }} 页</span>
      <button :disabled="currentPage >= Math.ceil(total / limit)" @click="handlePageChange(currentPage + 1)">下一页</button>
    </div>
  </div>
</template>

<style scoped>
.sellers-page { display: flex; flex-direction: column; gap: var(--space-6); }
.page-header { display: flex; justify-content: flex-end; }
.total-count { font-size: var(--text-sm); color: var(--text-muted); }
.data-table { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.nickname { font-weight: 600; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.active, .status-badge.approved { background: #10b98133; color: #10b981; }
.status-badge.suspended, .status-badge.rejected { background: #ef444433; color: #ef4444; }
.status-badge.pending { background: #f59e0b33; color: #f59e0b; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; margin-right: var(--space-2); }
.btn-action.suspend { background: #ef444433; color: #ef4444; }
.btn-action.activate { background: #10b98133; color: #10b981; }
.loading, .empty { text-align: center; color: var(--text-muted); padding: var(--space-8) !important; }
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-4); }
.pagination button { padding: var(--space-2) var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: var(--text-sm); color: var(--text-muted); }
</style>
