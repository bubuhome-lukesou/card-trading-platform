<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'

const API = 'https://card.aishoper.co/api'
const LIMIT = 999

function getToken() { return localStorage.getItem('token') || '' }

async function apiGet(path: string, params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(API + path + qs, {
    headers: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
  })
  return res.json()
}

async function apiPatch(path: string, body: any) {
  const res = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: JSON.stringify(body)
  })
  return res.json()
}

const allData = ref<any[]>([])
const currentStatus = ref('')
const currentSearch = ref('')

function fmt(d: string) { return d ? new Date(d).toLocaleString('zh-HK') : '-' }

function badge(s: string) {
  const m: Record<string, [string,string,string]> = {
    pending: ['#f59e0b33','#f59e0b','待審批'],
    approved: ['#10b98133','#10b981','已通過'],
    rejected: ['#ef444433','#ef4444','已拒絕']
  }
  const [bg,color,label] = m[s] || ['','',s]
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${bg};color:${color}">${label}</span>`
}

function esc(s?: string) { if (!s) return ''; return String(s).replace(/&/,'&amp;').replace(/</,'&lt;').replace(/>/,'&gt;').replace(/"/,'&quot;') }
function trunc(s?: string) { return s ? (s.length > 20 ? s.substring(0,20)+'…' : s) : '' }
function pickupLabel(a: any) {
  if (!a.pickupInfo) return '-'
  return a.pickupInfo.length > 40 ? a.pickupInfo.substring(0,40)+'…' : a.pickupInfo
}

function filtered() {
  let data = allData.value
  if (currentStatus.value) data = data.filter((a: any) => a.status === currentStatus.value)
  if (currentSearch.value.trim()) {
    const q = currentSearch.value.toLowerCase()
    data = data.filter((a: any) =>
      (a.nickname||'').toLowerCase().includes(q) ||
      (a.email||'').toLowerCase().includes(q) ||
      (a.storeName||'').toLowerCase().includes(q)
    )
  }
  return data
}

function render() {
  const target = document.getElementById('sa-content')
  if (!target) return
  const data = filtered()
  document.getElementById('sa-count')!.textContent = `共 ${allData.value.length} 條申請（顯示 ${data.length} 條）`
  const tbody = document.getElementById('sa-tbody')!
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:60px;">暫無商家申請</td></tr>`
    return
  }
  tbody.innerHTML = data.map((a: any) => `
    <tr style="border-bottom:1px solid #1e293b;">
      <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#f1f5f9;">${esc(a.storeName)||'-'}</td>
      <td style="padding:14px 16px;font-size:14px;color:#cbd5e1;">${esc(a.nickname)||'-'}</td>
      <td style="padding:14px 16px;font-size:14px;color:#cbd5e1;">${esc(a.email)||'-'}</td>
      <td style="padding:14px 16px;font-size:14px;color:#cbd5e1;">${esc(a.phone)||'-'}</td>
      <td style="padding:14px 16px;font-size:12px;color:#94a3b8;max-width:200px;white-space:pre-wrap;">${pickupLabel(a)}</td>
      <td style="padding:14px 16px;">${badge(a.status)}</td>
      <td style="padding:14px 16px;font-size:14px;color:#94a3b8;">${fmt(a.createdAt)}</td>
      <td style="padding:14px 16px;">
        ${a.status === 'pending' ? `
          <button onclick="window._saApprove('${a.id}')" class="sa-btn-approve">通過</button>
          <button onclick="window._saReject('${a.id}')" class="sa-btn-reject">拒絕</button>` :
          a.status === 'rejected' ?
          `<span style="font-size:12px;color:#ef4444;" title="${esc(a.rejectionReason)}">${trunc(a.rejectionReason)||'無原因'}</span>` :
          `<span style="font-size:12px;color:#64748b;">已創建賣家賬號</span>`}
      </td>
    </tr>`).join('')
}

function onStatusChange(e: Event) {
  currentStatus.value = (e.target as HTMLSelectElement).value
  render()
}

function onSearchInput(e: Event) {
  currentSearch.value = (e.target as HTMLInputElement).value
  render()
}

async function load() {
  try {
    const res = await apiGet('/seller-applications', { limit: LIMIT })
    allData.value = res.data || []
    render()
  } catch(e: any) {
    const target = document.getElementById('sa-content')
    if (target) target.innerHTML = `<div style="padding:40px;color:#ef4444;text-align:center;">載入失敗: ${esc(e.message)}</div>`
  }
}

async function approve(id: string) {
  if (!confirm('確認通過此商家申請？')) return
  try {
    await apiPatch(`/seller-applications/${id}/approve`, {})
    await load()
  } catch(e: any) { alert('操作失敗: ' + e.message) }
}

async function reject(id: string) {
  const reason = prompt('請輸入拒絕原因：')
  if (reason === null) return
  try {
    await apiPatch(`/seller-applications/${id}/reject`, { reason })
    await load()
  } catch(e: any) { alert('操作失敗: ' + e.message) }
}

// Expose to window for inline onclick handlers
;(window as any)._saApprove = approve
;(window as any)._saReject = reject

onMounted(() => {
  ;(window as any)._saStatus = ''
  ;(window as any)._saSearch = ''
  ;(window as any)._saRender = () => {
    currentStatus.value = (window as any)._saStatus
    currentSearch.value = (window as any)._saSearch
    render()
  }
  load()
})
</script>

<template>
  <div class="seller-applications-page">
    <div class="page-header">
      <h1 class="page-title">商家入駐審批</h1>
      <p class="page-desc">審批用戶的商家入駐申請</p>
    </div>

    <div id="sa-content" class="sa-content">
      <div class="sa-toolbar">
        <select id="sa-status" @change="onStatusChange" class="sa-select">
          <option value="">全部狀態</option>
          <option value="pending">待審批</option>
          <option value="approved">已通過</option>
          <option value="rejected">已拒絕</option>
        </select>
        <input type="text" id="sa-search" @input="onSearchInput" placeholder="搜尋昵稱、郵箱或商店名稱..." class="sa-input" />
        <span id="sa-count" class="sa-count">載入中...</span>
      </div>

      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>店鋪名稱</th>
              <th>申請人</th>
              <th>郵箱</th>
              <th>聯絡方式</th>
              <th>取貨信息</th>
              <th>狀態</th>
              <th>申請時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="sa-tbody">
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-applications-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page-header { margin-bottom: 8px; }
.page-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
.page-desc { color: #64748b; font-size: 14px; margin: 0; }
.sa-content { display: flex; flex-direction: column; gap: 24px; }
.sa-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.sa-select {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 14px;
  min-width: 130px;
}
.sa-input {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 14px;
  min-width: 260px;
}
.sa-count { font-size: 14px; color: #94a3b8; }
.sa-table-wrap {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}
.sa-table { width: 100%; border-collapse: collapse; }
.sa-table th {
  background: #0f172a;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #334155;
}
.sa-table td {
  padding: 14px 16px;
  font-size: 14px;
  border-bottom: 1px solid #1e293b;
  color: #cbd5e1;
}
.sa-table tr:last-child td { border-bottom: none; }
:deep(.sa-btn-approve) {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: #10b981;
  color: white;
}
:deep(.sa-btn-reject) {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: #ef4444;
  color: white;
  margin-left: 8px;
}
</style>
