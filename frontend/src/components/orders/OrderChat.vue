<script setup lang="ts">
// 訂單聊天組件（2026-11-01）— 買賣兩端共用
// - 文字 + 圖片/影片附件（最多4個/條）
// - 攞貨時間協調流程以系統消息顯示；買家可揀時間發出、商家可確認
// - role 決定按鈕：buyer=揀時間＋發出＋確認取貨；seller=確認時間
import { ref, onMounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { orderMessagesApi, uploadChatMedia, type OrderMessageDto, type ChatAttachment } from '@/api/order-messages'
import { orderPickupApi } from '@/api/order-extended'

const props = defineProps<{
  orderId: string
  /** 'buyer' | 'seller' — 當前使用者角色（決定操作權限按鈕） */
  role: 'buyer' | 'seller'
  /** 訂單當前資訊（買家有權提時間的狀態/當前 pickup 狀態） */
  orderStatus: string
  pickupConfirmStatus: string
  pickupProposalTime: string | null
  pickupTime: string | null
  /** 商家結構化營業時間 spec（JSON 串）— 買家端揀時間用 */
  businessHoursSpec: string | null
  /** 營業時間自由文字 fallback 顯示 */
  businessHoursText: string | null
  /** 當前用戶 id（判斷消息左右） */
  myUserId: string
}>()

const emit = defineEmits<{
  /** 訂單狀態有變（提出時間/確認時間/完成取貨）— 外層 reload */
  (e: 'order-updated'): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const messages = ref<OrderMessageDto[]>([])
const loading = ref(true)
const sending = ref(false)
const uploadingCount = ref(0)
const inputText = ref('')
const pendingAttachments = ref<ChatAttachment[]>([])
const errorMsg = ref('')
const scrollBox = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

const isMine = (m: OrderMessageDto) => m.senderId && m.senderId === props.myUserId

const loadMessages = async () => {
  try {
    const res = await orderMessagesApi.list(props.orderId)
    messages.value = Array.isArray(res.data) ? res.data : []
    await nextTick()
    scrollToBottom()
  } catch (e) {
    errorMsg.value = t('ordersChat.loadFailed')
  } finally {
    loading.value = false
  }
}

const scrollToBottom = () => {
  if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
}

// ===== 營業時間 spec 解析（買家揀時間用）=====
interface DaySpec { day: number; ranges: [string, string][] }
const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const MIN_DATETIME = computed(() => {
  // datetime-local input min：下一個可用時間（而家 + 30 分鐘）
  const d = new Date(Date.now() + 30 * 60 * 1000)
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})
const BUSINESS_DAYS = computed<DaySpec[]>(() => {
  if (!props.businessHoursSpec) return []
  try {
    const spec = JSON.parse(props.businessHoursSpec)
    return Object.entries(spec)
      .map(([k, v]) => ({ day: Number(k), ranges: (Array.isArray(v) ? v : []) as [string, string][] }))
      .filter((d) => d.day >= 1 && d.day <= 7 && d.ranges.length > 0)
      .sort((a, b) => a.day - b.day)
  } catch {
    return []
  }
})

// datetime-local 揀定後拆出日期/時間（一個 input 搞掂日期+時段起點）
const selectedDate = ref('') // YYYY-MM-DDTHH:mm（datetime-local 原值）
// 商家有冇設定任何營業時段（全空=未設定結構化時段 → datetime 自由選擇、唔擋）
const BUSINESS_HAS_ANY = computed(() => BUSINESS_DAYS.value.length > 0)
const hasStructuredHours = computed(() => !!props.businessHoursSpec && BUSINESS_HAS_ANY.value)

const canPropose = computed(() => props.role === 'buyer' && ['pending', 'pending_paid'].includes(props.orderStatus) && props.pickupConfirmStatus !== 'confirmed')
const canConfirmTime = computed(() => props.role === 'seller' && props.pickupConfirmStatus === 'proposed')
const canConfirmPickup = computed(() => props.role === 'buyer' && props.pickupConfirmStatus === 'confirmed' && !['delivered', 'cancelled'].includes(props.orderStatus))

const proposeError = ref('')

const submitProposal = async () => {
  if (!selectedDate.value) return
  proposeError.value = ''
  try {
    await orderPickupApi.proposePickupTime(props.orderId, `${selectedDate.value}:00`)
    emit('order-updated')
    await loadMessages()
  } catch (e: any) {
    proposeError.value = e?.response?.data?.message || t('ordersChat.proposeFailed')
  }
}

const confirmProposal = async () => {
  try {
    await orderPickupApi.confirmPickupTime(props.orderId)
    emit('order-updated')
    await loadMessages()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || t('ordersChat.operationFailed')
  }
}

const confirmPickup = async () => {
  try {
    await orderPickupApi.confirmPickup(props.orderId)
    emit('order-updated')
    await loadMessages()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || t('ordersChat.operationFailed')
  }
}

// ===== 附件（圖片/影片）=====
const MAX_FILES = 4
const VIDEO_LIMIT = 60 * 1024 * 1024
const IMAGE_LIMIT = 20 * 1024 * 1024

const onFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  for (const f of files) {
    if (pendingAttachments.value.length >= MAX_FILES) {
      errorMsg.value = t('ordersChat.tooManyFiles', { max: MAX_FILES })
      break
    }
    const isVideo = (f.type || '').startsWith('video/')
    if (isVideo && f.size > VIDEO_LIMIT) {
      errorMsg.value = t('ordersChat.videoTooLarge')
      continue
    }
    if (!isVideo && f.size > IMAGE_LIMIT) {
      errorMsg.value = t('ordersChat.imageTooLarge')
      continue
    }
    try {
      uploadingCount.value++
      const res = await uploadChatMedia(f)
      if (res.data?.url) {
        pendingAttachments.value.push({ url: res.data.url, type: isVideo ? 'video' : 'image' })
      }
    } catch {
      errorMsg.value = t('ordersChat.uploadFailed')
    } finally {
      uploadingCount.value--
    }
  }
}

const removeAttachment = (idx: number) => {
  pendingAttachments.value.splice(idx, 1)
}

const send = async () => {
  const content = inputText.value.trim()
  if (!content && !pendingAttachments.value.length) return
  sending.value = true
  errorMsg.value = ''
  try {
    await orderMessagesApi.post(props.orderId, content, pendingAttachments.value)
    inputText.value = ''
    pendingAttachments.value = []
    await loadMessages()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || t('ordersChat.sendFailed')
  } finally {
    sending.value = false
  }
}

const parseAttachments = (m: OrderMessageDto): ChatAttachment[] => {
  try {
    return m.attachments ? JSON.parse(m.attachments) : []
  } catch {
    return []
  }
}

const fmtMsgTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fmtProposal = (iso: string | null) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-MO', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

defineExpose({ loadMessages })

onMounted(loadMessages)
</script>

<template>
  <div class="ochat">
    <!-- 攞貨時間流程操作區（有權限先顯示） -->
    <div v-if="canPropose" class="ochat-pickup">
      <!-- 商家有結構化營業時間 → 顯示時段列表；無 → 顯示提示（自由選擇） -->
      <div v-if="!hasStructuredHours" class="ochat-hours-warn">⚠️ {{ t('ordersChat.hoursNotSet') }}</div>
      <div v-else class="ochat-hours-list">
        <div v-for="d in BUSINESS_DAYS" :key="d.day" class="ochat-hours-row">
          <span class="ochat-hours-day">{{ DAY_LABELS[d.day - 1] }}</span>
          <span class="ochat-hours-range">{{ d.ranges.map((r: [string, string]) => `${r[0]}-${r[1]}`).join('、') }}</span>
        </div>
      </div>
      <div class="ochat-pickup-row">
        <input
          v-model="selectedDate"
          type="datetime-local"
          class="ochat-input-date"
          :min="MIN_DATETIME"
        />
        <button class="ochat-btn primary" :disabled="!selectedDate || !BUSINESS_HAS_ANY" @click="submitProposal">
          {{ pickupProposalTime ? t('ordersChat.repropose') : t('ordersChat.propose') }}
        </button>
      </div>
      <div v-if="proposeError" class="ochat-err">{{ proposeError }}</div>
      <div class="ochat-pickup-note">{{ t('ordersChat.proposeNote') }}</div>
    </div>

    <!-- 商家確認時間按鈕 -->
    <div v-if="canConfirmTime" class="ochat-confirm-bar">
      <span class="ochat-confirm-info">{{ t('ordersChat.awaitingConfirm', { time: fmtProposal(pickupProposalTime) }) }}</span>
      <button class="ochat-btn primary" @click="confirmProposal">{{ t('ordersChat.confirmTime') }}</button>
    </div>

    <!-- 買家確認取貨（時間已確認、單未完成） -->
    <div v-if="canConfirmPickup" class="ochat-confirm-bar">
      <span class="ochat-confirm-info">{{ t('ordersChat.confirmedGo', { time: fmtProposal(pickupTime) }) }}</span>
      <button class="ochat-btn primary" @click="confirmPickup">{{ t('ordersChat.confirmPickup') }}</button>
    </div>

    <!-- 聊天流 -->
    <div ref="scrollBox" class="ochat-stream">
      <div v-if="loading" class="ochat-loading">⏳</div>
      <template v-else>
        <div v-if="!messages.length" class="ochat-empty">{{ t('ordersChat.empty') }}</div>
        <div v-for="m in messages" :key="m.id" class="ochat-row" :class="{ mine: isMine(m), system: m.kind !== 'chat' }">
          <div v-if="m.kind !== 'chat'" class="ochat-sys">
            <span class="ochat-sys-text">{{ m.content }}</span>
            <span class="ochat-sys-time">{{ fmtMsgTime(m.createdAt) }}</span>
          </div>
          <template v-else>
            <div class="ochat-avatar">{{ (m.sender?.nickname || '?').slice(0, 1) }}</div>
            <div class="ochat-bubble-wrap">
              <div class="ochat-bubble-meta">{{ m.sender?.nickname || '' }} · {{ fmtMsgTime(m.createdAt) }}</div>
              <div class="ochat-bubble">
                <div v-if="m.content" class="ochat-text">{{ m.content }}</div>
                <div v-if="parseAttachments(m).length" class="ochat-atts">
                  <template v-for="(att, i) in parseAttachments(m)" :key="i">
                    <img v-if="att.type === 'image'" :src="resolveUrl(att.url)" class="ochat-att-img" alt="聊天圖片" />
                    <video v-else :src="resolveUrl(att.url)" class="ochat-att-video" controls preload="metadata" />
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- 輸入區 -->
    <div class="ochat-input-row">
      <div v-if="pendingAttachments.length" class="ochat-pending">
        <div v-for="(att, i) in pendingAttachments" :key="i" class="ochat-pending-item">
          <img v-if="att.type === 'image'" :src="resolveUrl(att.url)" alt="待發送圖片" />
          <video v-else :src="resolveUrl(att.url)" />
          <button class="ochat-pending-remove" @click="removeAttachment(i)">✕</button>
        </div>
        <span v-if="uploadingCount > 0" class="ochat-uploading-hint">⏳ {{ t('ordersChat.uploading') }}</span>
      </div>
      <div class="ochat-input-line">
        <button class="ochat-attach" :disabled="uploadingCount > 0" :title="t('ordersChat.attachHint')" @click="fileInput?.click()">📎</button>
        <input ref="fileInput" type="file" accept="image/*,video/*" multiple style="display: none" @change="onFileSelect" />
        <input
          v-model="inputText"
          type="text"
          class="ochat-input-text"
          :placeholder="t('ordersChat.inputPlaceholder')"
          @keyup.enter="send"
        />
        <button class="ochat-btn send" :disabled="sending || (!inputText.trim() && !pendingAttachments.length)" @click="send">
          {{ sending ? t('ordersChat.sending') : t('ordersChat.send') }}
        </button>
      </div>
      <div v-if="errorMsg" class="ochat-err">{{ errorMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.ochat { display: flex; flex-direction: column; gap: var(--space-3); min-height: 0; }
.ochat-loading { text-align: center; padding: var(--space-4); color: var(--text-secondary); }
.ochat-empty { text-align: center; padding: var(--space-5); color: var(--text-muted); font-size: var(--text-sm); }

/* 附件樣式 */
.ochat-atts { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-1); }
.ochat-att-img { max-width: 180px; max-height: 120px; border-radius: var(--radius-md); object-fit: cover; cursor: pointer; }
.ochat-att-video { max-width: 220px; max-height: 160px; border-radius: var(--radius-md); }

/* 待上傳附件縮圖 */
.ochat-pending { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-2); align-items: center; }
.ochat-pending-item { position: relative; width: 48px; height: 48px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border); }
.ochat-pending-item img, .ochat-pending-item video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ochat-pending-remove {
  position: absolute; top: 2px; right: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.6); color: #fff;
  border: none; cursor: pointer; font-size: 10px; line-height: 16px;
  padding: 0;
}
.ochat-uploading-hint { font-size: var(--text-xs); color: var(--text-secondary); }

/* 消息行 */
.ochat-row { display: flex; gap: var(--space-2); align-items: flex-start; }
.ochat-row.mine { flex-direction: row-reverse; }
.ochat-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-elevated); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); flex-shrink: 0; }
.ochat-bubble-wrap { max-width: min(70%, 420px); min-width: 0; }
.ochat-row.mine .ochat-bubble-wrap { text-align: right; }
.ochat-bubble-meta { font-size: var(--text-xs); color: var(--text-muted); margin-bottom: 2px; }
.ochat-bubble { background: var(--bg-elevated); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); text-align: left; display: inline-block; max-width: 100%; box-sizing: border-box; }
.ochat-row.mine .ochat-bubble { background: var(--primary-gradient); color: #fff; }
.ochat-text { font-size: var(--text-sm); white-space: pre-wrap; word-break: break-word; }

/* 系統提示 */
.ochat-row.system { justify-content: center; }
.ochat-sys { text-align: center; padding: var(--space-1) var(--space-3); background: rgba(245, 158, 11, 0.12); border-radius: var(--radius-lg); }
.ochat-sys-text { font-size: var(--text-xs); color: #d97706; display: block; }
.ochat-sys-time { font-size: 10px; color: var(--text-muted); font-family: var(--font-num); }

/* 輸入行 */
.ochat-input-row { display: flex; flex-direction: column; gap: var(--space-2); }
.ochat-input-line { display: flex; gap: var(--space-2); align-items: center; }
.ochat-attach { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-2); cursor: pointer; flex-shrink: 0; }
.ochat-attach:disabled { opacity: 0.5; cursor: not-allowed; }
.ochat-input-text { flex: 1; min-width: 0; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: var(--text-sm); outline: none; }
.ochat-input-text:focus { border-color: var(--primary); }
.ochat-btn { padding: var(--space-2) var(--space-4); border-radius: var(--radius-lg); border: none; cursor: pointer; font-size: var(--text-sm); font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.ochat-btn.primary { background: var(--primary-gradient); color: #fff; }
.ochat-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ochat-btn.send { background: var(--primary-gradient); color: #fff; }
.ochat-btn.send:disabled { opacity: 0.4; cursor: not-allowed; }

/* 攞貨協調區 */
.ochat-pickup { background: var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
.ochat-hours-warn { font-size: var(--text-xs); color: #d97706; }
.ochat-hours-text { font-size: var(--text-xs); color: var(--text-secondary); }
.ochat-hours-list { display: flex; flex-direction: column; gap: 4px; }
.ochat-hours-row { display: flex; gap: var(--space-3); font-size: var(--text-xs); }
.ochat-hours-day { color: var(--text-secondary); min-width: 60px; }
.ochat-hours-range { color: var(--text-primary); font-family: var(--font-num); }
.ochat-pickup-row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.ochat-input-date { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: var(--text-sm); outline: none; min-width: 0; flex: 1; }
.ochat-pickup-note { font-size: var(--text-xs); color: var(--text-muted); }

/* 確認橫條 */
.ochat-confirm-bar { display: flex; align-items: center; gap: var(--space-3); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3); flex-wrap: wrap; }
.ochat-confirm-info { flex: 1; font-size: var(--text-sm); color: #059669; min-width: 0; }
.ochat-err { font-size: var(--text-xs); color: #ef4444; }

@media (max-width: 767px) {
  .ochat-bubble-wrap { max-width: 85%; }
}
</style>