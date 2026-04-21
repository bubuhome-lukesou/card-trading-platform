<script setup lang="ts">
import { ref, onMounted } from 'vue'

const users = ref([
  { id: '1', nickname: 'CardCollector', email: 'collector@email.com', role: 'user', status: 'active', createdAt: '2026-04-21', totalSpend: 45600 },
  { id: '2', nickname: 'DragonMaster', email: 'dragon@email.com', role: 'seller', status: 'active', createdAt: '2026-04-20', totalSpend: 0 },
  { id: '3', nickname: 'MagicPlayer', email: 'magic@email.com', role: 'user', status: 'active', createdAt: '2026-04-19', totalSpend: 25000 },
  { id: '4', nickname: 'AnimeFan', email: 'anime@email.com', role: 'user', status: 'suspended', createdAt: '2026-04-18', totalSpend: 500 },
])

const filterRole = ref('all')
const filterStatus = ref('all')

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}

const handleSuspend = (id: string) => {
  if (confirm('确定要封禁此用户吗？')) {
    const user = users.value.find(u => u.id === id)
    if (user) user.status = user.status === 'active' ? 'suspended' : 'active'
  }
}

const handleChangeRole = (id: string) => {
  alert('修改角色功能开发中')
}
</script>

<template>
  <div class="users-page">
    <div class="filters">
      <select v-model="filterRole">
        <option value="all">全部角色</option>
        <option value="user">用户</option>
        <option value="seller">商家</option>
        <option value="admin">管理员</option>
      </select>
      <select v-model="filterStatus">
        <option value="all">全部状态</option>
        <option value="active">正常</option>
        <option value="suspended">已封禁</option>
      </select>
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
          <tr v-for="user in users" :key="user.id">
            <td class="nickname">{{ user.nickname }}</td>
            <td>{{ user.email }}</td>
            <td><span class="role-badge" :class="user.role">{{ user.role }}</span></td>
            <td><span class="status-badge" :class="user.status">{{ user.status === 'active' ? '正常' : '已封禁' }}</span></td>
            <td>{{ user.createdAt }}</td>
            <td>{{ formatPrice(user.totalSpend) }}</td>
            <td>
              <button @click="handleSuspend(user.id)" class="btn-action" :class="user.status === 'active' ? 'suspend' : 'activate'">
                {{ user.status === 'active' ? '封禁' : '解封' }}
              </button>
              <button @click="handleChangeRole(user.id)" class="btn-action role">改角色</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.users-page { display: flex; flex-direction: column; gap: var(--space-6); }
.filters { display: flex; gap: var(--space-4); }
.filters select { padding: var(--space-2) var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); }
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
</style>
