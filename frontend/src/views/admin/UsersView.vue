<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api'

const users = ref<any[]>([])
const loading = ref(false)
const filterRole = ref('all')
const filterStatus = ref('all')
const currentPage = ref(1)
const total = ref(0)
const limit = 20

const filteredUsers = computed(() => users.value)

const fetchUsers = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, limit }
    if (filterRole.value !== 'all') params.role = filterRole.value
    if (filterStatus.value !== 'all') params.status = filterStatus.value
    const res = await api.get('/admin/users', { params })
    users.value = res.data.data
    total.value = res.data.total
  } catch (e) {
    console.error('Failed to fetch users', e)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchUsers()
}

const handleSuspend = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
  if (!confirm(newStatus === 'suspended' ? '确定要封禁此用户吗？' : '确定要解封此用户吗？')) return
  try {
    await api.patch(`/admin/users/${id}`, { status: newStatus })
    await fetchUsers()
  } catch (e) {
    alert('操作失败')
  }
}

const handleChangeRole = async (id: string, currentRole: string) => {
  const roles = ['user', 'seller', 'admin']
  const currentIdx = roles.indexOf(currentRole)
  const nextRole = roles[(currentIdx + 1) % roles.length]
  if (!confirm(`确定要将角色改为 ${nextRole} 吗？`)) return
  try {
    await api.patch(`/admin/users/${id}`, { role: nextRole })
    await fetchUsers()
  } catch (e) {
    alert('操作失败')
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price || 0)
}

const formatDate = (date: string) => {
  return date ? new Date(date).toLocaleDateString('zh-HK') : '-'
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="users-page">
    <div class="filters">
      <select v-model="filterRole" @change="handlePageChange(1)">
        <option value="all">全部角色</option>
        <option value="user">用户</option>
        <option value="seller">商家</option>
        <option value="admin">管理员</option>
      </select>
      <select v-model="filterStatus" @change="handlePageChange(1)">
        <option value="all">全部状态</option>
        <option value="active">正常</option>
        <option value="suspended">已封禁</option>
      </select>
      <span class="total-count">共 {{ total }} 位用户</span>
    </div>

    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>用户</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>累计消费</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="loading">加载中...</td></tr>
          <tr v-else-if="!filteredUsers.length"><td colspan="7" class="empty">暂无数据</td></tr>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td class="nickname">{{ user.nickname || '-' }}</td>
            <td>{{ user.email }}</td>
            <td><span class="role-badge" :class="user.role">{{ user.role }}</span></td>
            <td><span class="status-badge" :class="user.status">{{ user.status === 'active' ? '正常' : '已封禁' }}</span></td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>{{ formatPrice(user.totalSpend) }}</td>
            <td>
              <button @click="handleSuspend(user.id, user.status)" class="btn-action" :class="user.status === 'active' ? 'suspend' : 'activate'">
                {{ user.status === 'active' ? '封禁' : '解封' }}
              </button>
              <button @click="handleChangeRole(user.id, user.role)" class="btn-action role">改角色</button>
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
.users-page { display: flex; flex-direction: column; gap: var(--space-6); }
.filters { display: flex; gap: var(--space-4); align-items: center; }
.filters select { padding: var(--space-2) var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); }
.total-count { font-size: var(--text-sm); color: var(--text-muted); margin-left: auto; }
.data-table { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.nickname { font-weight: 600; }
.role-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.role-badge.user { background: #3b82f633; color: #3b82f6; }
.role-badge.seller { background: #10b98133; color: #10b981; }
.role-badge.admin { background: #ef444433; color: #ef4444; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); }
.status-badge.active { background: #10b98133; color: #10b981; }
.status-badge.suspended { background: #ef444433; color: #ef4444; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; margin-right: var(--space-2); }
.btn-action.suspend { background: #ef444433; color: #ef4444; }
.btn-action.activate { background: #10b98133; color: #10b981; }
.btn-action.role { background: var(--bg-elevated); color: var(--text-primary); }
.loading, .empty { text-align: center; color: var(--text-muted); padding: var(--space-8) !important; }
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-4); }
.pagination button { padding: var(--space-2) var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: var(--text-sm); color: var(--text-muted); }
</style>
