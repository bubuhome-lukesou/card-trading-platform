<script setup lang="ts">
/**
 * ProductFormModal — 商品創建/編輯表單彈出層（共用組件）
 * 從 ProductsView.vue 原封搬入（2026-09-19 合併方案）
 * Props: product（null=創建），open（v-model 控制）
 * Emits: close, saved(productId)
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { uploadApi } from '@/api/upload'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { tagApi } from '@/api/tags'
import { CATEGORY_OPTIONS } from '@/components/brand/CategoryLogos'

const { t } = useI18n()

const props = defineProps<{
  product: any | null   // null = 創建模式
  open: boolean         // v-model:open
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'saved', productId: string): void
}>()

const apiBaseUrl = import.meta.env.VITE_API_URL || ''

// Resolve image URL - prepend API base if it's a server-side path
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url
  return apiBaseUrl + url
}

// State
const loading = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)
const imagePreviews = ref<string[]>([])
const pendingImageFiles = ref<File[]>([])
const pendingImagePreviews = ref<string[]>([])
const existingImageUrls = ref<string[]>([])
const availableTags = ref<any[]>([])
const selectedTags = ref<number[]>([])
const tagSearch = ref('')
const showTagDropdown = ref(false)

const closeTagDropdown = () => {
  setTimeout(() => { showTagDropdown.value = false }, 200)
}

const filteredTags = computed(() => {
  if (!tagSearch.value.trim()) return availableTags.value
  const q = tagSearch.value.toLowerCase()
  return availableTags.value.filter(tag =>
    tag.name.toLowerCase().includes(q)
  )
})

// Task 4: Reload tags when category changes — clear selections that don't belong
let _skipTagWatch = false
watch(() => formData.value.category, (newCategory, oldCategory) => {
  if (_skipTagWatch) {
    _skipTagWatch = false
    return
  }
  if (newCategory && newCategory !== oldCategory) {
    // Clear selected tags and search when switching category
    _tagSelectedSnapshot = []
    selectedTags.value = []
    tagSearch.value = ''
    showTagDropdown.value = false
    loadTags(newCategory)
  }
})

// Direct handler for category <select> change event (belt-and-suspenders with watch)
const onCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newCategory = target.value
  if (_skipTagWatch) {
    _skipTagWatch = false
    return
  }
  _tagSelectedSnapshot = []
  selectedTags.value = []
  tagSearch.value = ''
  showTagDropdown.value = false
  loadTags(newCategory)
}

const categories = CATEGORY_OPTIONS

const conditions = [
  { value: 'S', label: 'S級 - 完美品相' },
  { value: 'A', label: 'A級 - 輕微瑕疵' },
  { value: 'B', label: 'B級 - 少量瑕疵' },
  { value: 'C', label: 'C級 - 磨損可見' },
  { value: 'D', label: 'D級 - 嚴重磨損' },
]

// 預設僅銷售模式，隐藏拍賣相關字段
const formData = ref({
  titleZh: '',
  titleEn: '',
  descriptionZh: '',
  descriptionEn: '',
  category: 'pokemon',
  condition: null as string | null,
  price: 0,
  quantity: 1,
  images: [] as string[],
  tags: [] as number[],
  productType: null as string | null,
  language: null as string | null,
  isActive: true,
  // Listing type
  listingType: 'sale' as 'sale' | 'auction' | 'reservation',
  // Auction fields
  startingPrice: 0,
  bidIncrement: 10,
  auctionEndTime: '',
  // Reservation fields
  reservationMax: 10,
  reservationDeposit: 0,
  reservationDeadline: '',
  reservationLimitPerUser: null,
})

const resetForm = () => {
  formData.value = {
    titleZh: '',
    titleEn: '',
    descriptionZh: '',
    descriptionEn: '',
    category: 'pokemon',
    condition: null,
    price: 0,
    quantity: 1,
    images: [],
    tags: [],
    productType: null,
    language: null,
    isActive: true,
    listingType: 'sale',
    startingPrice: 0,
    bidIncrement: 10,
    auctionEndTime: '',
    reservationMax: 10,
    reservationDeposit: 0,
    reservationDeadline: '',
    reservationLimitPerUser: null,
  }
  imagePreviews.value = []
  pendingImageFiles.value = []
  pendingImagePreviews.value = []
  existingImageUrls.value = []
  selectedTags.value = []
  fieldErrors.value = {}
}

// ===== 表單驗證 =====
const fieldErrors = ref<Record<string, string>>({})

// 數值/時間欄位即時驗證（輸入時觸發）——必填檢查留給 submit
const validateField = (key: string) => {
  const v = (formData.value as any)[key]
  const lt = formData.value.listingType
  delete fieldErrors.value[key]

  switch (key) {
    case 'price':
      if (v === null || v === undefined || isNaN(Number(v))) fieldErrors.value[key] = '請輸入有效數字'
      else if (Number(v) < 0) fieldErrors.value[key] = '售價不可為負數'
      else if (Number(v) > 99999999.99) fieldErrors.value[key] = '售價超出上限'
      else if (lt === 'auction' && Number(v) > 0 && Number(v) <= Number(formData.value.startingPrice || 0)) fieldErrors.value[key] = '直購價必須高於起拍價'
      break
    case 'quantity':
      if (v !== null && v !== undefined && v !== '') {
        if (!Number.isInteger(Number(v)) || Number(v) < 1) fieldErrors.value[key] = '數量必須為 ≥1 的整數'
      }
      break
    case 'startingPrice':
      if (lt === 'auction') {
        if (v === null || v === undefined || isNaN(Number(v))) fieldErrors.value[key] = '請輸入有效數字'
        else if (Number(v) <= 0) fieldErrors.value[key] = '起拍價必須大於 0'
        else if (Number(v) > 99999999.99) fieldErrors.value[key] = '超出上限'
      }
      break
    case 'bidIncrement':
      if (lt === 'auction' && v !== null && v !== undefined && v !== '') {
        if (!Number.isInteger(Number(v)) || Number(v) < 1) fieldErrors.value[key] = '加價幅度必須為 ≥1 的整數'
      }
      break
    case 'auctionEndTime':
      if (lt === 'auction' && v) {
        const t = new Date(v).getTime()
        if (isNaN(t)) fieldErrors.value[key] = '時間格式無效'
        else if (t <= Date.now() + 60 * 1000) fieldErrors.value[key] = '結束時間必須至少在 1 分鐘之後'
      }
      break
    case 'reservationDeposit':
      if (lt === 'reservation') {
        if (v === null || v === undefined || isNaN(Number(v))) fieldErrors.value[key] = '請輸入有效數字'
        else if (Number(v) < 0) fieldErrors.value[key] = '訂金不可為負數'
        else if (Number(v) > 99999999.99) fieldErrors.value[key] = '超出上限'
      }
      break
    case 'reservationMax':
      if (lt === 'reservation' && v !== null && v !== undefined && v !== '') {
        if (!Number.isInteger(Number(v)) || Number(v) < 1) fieldErrors.value[key] = '名額上限必須為 ≥1 的整數'
      }
      break
    case 'reservationDeadline':
      if (lt === 'reservation' && v) {
        const t = new Date(v).getTime()
        if (isNaN(t)) fieldErrors.value[key] = '時間格式無效'
        else if (t <= Date.now()) fieldErrors.value[key] = '截止時間必須在當前時間之後'
      }
      break
    case 'reservationLimitPerUser':
      if (lt === 'reservation' && v !== null && v !== undefined && v !== '') {
        if (!Number.isInteger(Number(v)) || Number(v) < 1) fieldErrors.value[key] = '每人上限必須為 ≥1 的整數'
      }
      break
  }
  return !fieldErrors.value[key]
}

// Submit：只驗必填，列出所有未填項
const missingRequired = () => {
  const missing: string[] = []
  const lt = formData.value.listingType
  if (!formData.value.titleZh?.trim()) missing.push('商品名稱（中文）')
  if (!formData.value.titleEn?.trim()) missing.push('商品名稱（英文）')
  if (lt === 'sale' && (formData.value.price === null || formData.value.price === undefined || formData.value.price <= 0)) missing.push('售價（必須大於 0）')
  if (lt === 'auction') {
    if (formData.value.startingPrice === null || formData.value.startingPrice === undefined || formData.value.startingPrice <= 0) missing.push('起拍價（必須大於 0）')
    if (!formData.value.auctionEndTime) missing.push('拍賣結束時間')
    const p = Number(formData.value.price ?? 0)
    if (p > 0 && p <= Number(formData.value.startingPrice || 0)) missing.push('直購價（必須為 0 或高於起拍價）')
  }
  if (lt === 'reservation') {
    if (!formData.value.reservationDeadline) missing.push('預約截止時間')
  }
  return missing
}

// 切換銷售模式時：清掉唔屬於新模式嘅欄位錯誤
watch(() => formData.value.listingType, (lt, oldLt) => {
  const validKeys: Record<string, string[]> = {
    sale: ['price', 'quantity', 'condition'],
    auction: ['price', 'quantity', 'condition', 'startingPrice', 'bidIncrement', 'auctionEndTime'],
    reservation: ['price', 'quantity', 'condition', 'reservationDeposit', 'reservationMax', 'reservationDeadline', 'reservationLimitPerUser'],
  }
  for (const key of Object.keys(fieldErrors.value)) {
    if (!(validKeys[lt] || []).includes(key)) delete fieldErrors.value[key]
  }
  // 切入拍賣模式：自動填預設值（結束時間=60分鐘後、起拍價=1、直購價=0 不限、數量鎖定=1）
  if (lt === 'auction' && oldLt !== 'auction') {
    if (!formData.value.auctionEndTime) {
      const d = new Date(Date.now() + 60 * 60 * 1000)
      // datetime-local 本地時間格式 YYYY-MM-DDTHH:mm
      d.setSeconds(0, 0)
      formData.value.auctionEndTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    if (!formData.value.startingPrice || formData.value.startingPrice <= 0) formData.value.startingPrice = 1
    if (formData.value.price === null || formData.value.price === undefined || formData.value.price <= 0) formData.value.price = 0
    formData.value.quantity = 1 // 拍賣商品數量固定為 1
  }
})

const openForCreate = () => {
  // Load tags for default category (null = all)
  _tagSelectedSnapshot = []
  selectedTags.value = []
  tagSearch.value = ''
  loadTags(undefined)
}

const openForEdit = async (product: any) => {
  // Parse images (handle both array and JSON string)
  let existingImages: string[] = []
  if (product.images) {
    if (Array.isArray(product.images)) {
      existingImages = product.images
    } else {
      try {
        existingImages = JSON.parse(product.images)
      } catch {
        existingImages = [product.images]
      }
    }
  }
  // Sync preview images with existing URLs (for display)
  existingImageUrls.value = [...existingImages]
  imagePreviews.value = [...existingImages]
  pendingImageFiles.value = [] // No new files yet
  pendingImagePreviews.value = [] // No new file previews
  // Load existing tags - use nextTick to ensure DOM is ready after modal opens
  const ids = (product.tags || []).map((tg: any) => typeof tg === 'number' ? tg : tg.id)
  // Load tags for this product's category first
  await loadTags(product.category)
  _tagSelectedSnapshot = [...ids]
  selectedTags.value = [...ids]
  tagSearch.value = ''
  // productType is now a direct string value

  // Skip the category watch so it doesn't clear our restored tags
  _skipTagWatch = true
  formData.value = {
    titleZh: product.titleZh,
    titleEn: product.titleEn,
    descriptionZh: product.descriptionZh,
    descriptionEn: product.descriptionEn,
    category: product.category,
    condition: product.condition || null,
    price: product.price,
    quantity: product.quantity || 1,
    images: [...existingImages],
    tags: [...selectedTags.value],
    productType: product.productType || null,
    language: product.language || null,
    isActive: product.isActive !== false,
    listingType: product.listingType || 'sale',
    startingPrice: product.startingPrice || 0,
    bidIncrement: product.bidIncrement || 10,
    auctionEndTime: product.auctionEndTime || '',
    reservationMax: product.reservationMax || 10,
    reservationDeposit: product.reservationDeposit || 0,
    reservationDeadline: product.reservationDeadline || '',
    reservationLimitPerUser: product.reservationLimitPerUser || null,
  }
}

const handleSubmit = async () => {
  // 即時欄位錯誤（格式類）也要清先可以提交
  const errorKeys = Object.keys(fieldErrors.value)
  if (errorKeys.length > 0) {
    alert('請先修正欄位錯誤：\\n' + errorKeys.map(k => `• ${fieldErrors.value[k]}`).join('\\n'))
    return
  }

  // 必填檢查——彈出提示列出所有未填項
  const missing = missingRequired()
  if (missing.length > 0) {
    alert('以下必填項未填寫：\\n' + missing.map(m => `• ${m}`).join('\\n'))
    return
  }

  loading.value = true
  try {
    // Upload images first if any
    const uploadedUrls: string[] = []
    for (const file of pendingImageFiles.value) {
      try {
        const response = await uploadApi.uploadImage(file)
        if (response.data.success) {
          uploadedUrls.push(response.data.url)
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError)
        alert('圖片上傳失敗，請重試')
        loading.value = false
        return
      }
    }

    // Prepare product data - merge existing URLs with newly uploaded URLs
    // 預設僅銷售模式
    const raw = {
      ...formData.value,
      images: [...existingImageUrls.value, ...uploadedUrls],
      tags: selectedTags.value,
    }
    // Convert empty strings to null for optional fields (DB supports NULL)
    const productData: Record<string, any> = {}
    for (const [key, value] of Object.entries(raw)) {
      productData[key] = (value === '' || (Array.isArray(value) && value.length === 0 && key !== 'images' && key !== 'tags'))
        ? null
        : value
    }

    // Create or update product
    let productId: string
    if (props.product) {
      await productApi.updateProduct(props.product.id, productData)
      productId = props.product.id
    } else {
      const res = await productApi.createProduct(productData)
      productId = res.data.id
    }

    // If listingType is auction, create auction record
    if (formData.value.listingType === 'auction' && formData.value.auctionEndTime) {
      const endTime = new Date(formData.value.auctionEndTime)
      const startTime = new Date() // start immediately
      const buyNow = Number(formData.value.price ?? 0)
      await auctionApi.createAuction({
        productId,
        startingPrice: formData.value.startingPrice || productData.price,
        buyNowPrice: buyNow > 0 ? buyNow : undefined, // 0 = 不設直購
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        extensionMinutes: 5,
      })
    }

    emit('update:open', false)
    resetForm()
    emit('saved', productId)
  } catch (error: any) {
    console.error('Failed to save product:', error)
    const message = error?.response?.data?.message || error?.message || '儲存失敗，請重試'
    alert(message)
  } finally {
    loading.value = false
  }
}

const triggerImageUpload = () => {
  imageInput.value?.click()
}

const handleImageChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files) return

  const files = Array.from(target.files)
  const currentCount = existingImageUrls.value.length + pendingImagePreviews.value.length
  if (currentCount + files.length > 9) {
    alert('最多只能上傳9张图片')
    return
  }

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超過10MB')
      continue
    }
    pendingImageFiles.value.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      pendingImagePreviews.value.push(base64)
      // Force reactivity update
      imagePreviews.value = [...existingImageUrls.value, ...pendingImagePreviews.value]
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

const removeImage = (index: number) => {
  if (index < existingImageUrls.value.length) {
    existingImageUrls.value.splice(index, 1)
  } else {
    const pendingIndex = index - existingImageUrls.value.length
    pendingImageFiles.value.splice(pendingIndex, 1)
    pendingImagePreviews.value.splice(pendingIndex, 1)
  }
  imagePreviews.value = [...existingImageUrls.value, ...pendingImagePreviews.value]
}

// Tag functions
let _tagSelectedSnapshot: number[] = []

const isTagSelected = (tagId: number) => _tagSelectedSnapshot.includes(tagId)

const toggleTag = (tagId: number) => {
  const index = _tagSelectedSnapshot.indexOf(tagId)
  if (index === -1) {
    _tagSelectedSnapshot.push(tagId)
  } else {
    _tagSelectedSnapshot.splice(index, 1)
  }
  // Sync back to reactive ref for computed usage
  selectedTags.value = [..._tagSelectedSnapshot]
}

const loadTags = async (category?: string) => {
  try {
    const params = category ? { category } : undefined
    const response = await tagApi.getTags(params)
    availableTags.value = response.data || []
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

// 開啟時初始化（創建 vs 編輯）— watch product 先於 open：確保 product 賦值後 formData 正確載入
watch(
  () => props.product,
  (product) => {
    if (props.open && product) {
      openForEdit(product)
    }
  }
)

watch(
  () => props.open,
  (open) => {
    if (open && !props.product) {
      openForCreate()
    }
  }
)
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('update:open', false)">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ product ? '编辑商品' : '發布新商品' }}</h2>
        <button @click="emit('update:open', false)" class="modal-close">✕</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-grid">
          <!-- Title -->
          <div class="form-group">
            <label>商品名稱（中文）<span class="required-mark">*</span></label>
            <input
              v-model="formData.titleZh"
              type="text"
              placeholder="例如：寶可夢 1st Edition Base Set"
              required
            />
          </div>

          <div class="form-group">
            <label>商品名稱（英文）<span class="required-mark">*</span></label>
            <input
              v-model="formData.titleEn"
              type="text"
              placeholder="Product name in English"
              required
            />
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <label>商品描述（中文）</label>
            <textarea
              v-model="formData.descriptionZh"
              rows="3"
              placeholder="詳細描述商品資訊、品相..."
            ></textarea>
          </div>

          <div class="form-group full-width">
            <label>商品描述（英文）</label>
            <textarea
              v-model="formData.descriptionEn"
              rows="3"
              placeholder="Product description in English..."
            ></textarea>
          </div>

          <!-- Category & Condition -->
          <div class="form-group">
            <label>商品類別 <span class="required-mark">*</span></label>
            <select v-model="formData.category" @change="onCategoryChange" required>
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>商品品相</label>
            <select v-model="formData.condition" class="form-select">
              <option :value="null">(請選擇)</option>
              <option v-for="cond in conditions" :key="cond.value" :value="cond.value">
                {{ cond.label }}
              </option>
            </select>
            <p class="field-hint">選填 — 不選將顯示為「不指定」</p>
          </div>

          <!-- Listing Type -->
          <div class="form-group">
            <label>銷售模式</label>
            <select v-model="formData.listingType">
              <option value="sale">直銷</option>
              <option value="auction">拍賣</option>
              <option value="reservation">預約</option>
            </select>
          </div>

          <!-- Auction Fields (when auction is selected) -->
          <template v-if="formData.listingType === 'auction'">
            <div class="form-group">
              <label>起拍價 (MOP) <span class="required-mark">*</span></label>
              <input
                v-model.number="formData.startingPrice"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                placeholder="100"
                :class="{ 'input-error': fieldErrors.startingPrice }"
                @blur="validateField('startingPrice')"
                @input="validateField('startingPrice')"
              />
              <span v-if="fieldErrors.startingPrice" class="field-error-msg">{{ fieldErrors.startingPrice }}</span>
            </div>
            <div class="form-group">
              <label>每次加價幅度 (MOP) <span class="required-mark">*</span></label>
              <input
                v-model.number="formData.bidIncrement"
                type="number"
                min="1"
                max="99999"
                step="1"
                placeholder="10"
                :class="{ 'input-error': fieldErrors.bidIncrement }"
                @blur="validateField('bidIncrement')"
                @input="validateField('bidIncrement')"
              />
              <span v-if="fieldErrors.bidIncrement" class="field-error-msg">{{ fieldErrors.bidIncrement }}</span>
            </div>
            <div class="form-group">
              <label>拍賣結束時間 <span class="required-mark">*</span></label>
              <input
                v-model="formData.auctionEndTime"
                type="datetime-local"
                :class="{ 'input-error': fieldErrors.auctionEndTime }"
                @blur="validateField('auctionEndTime')"
                @input="validateField('auctionEndTime')"
              />
              <span v-if="fieldErrors.auctionEndTime" class="field-error-msg">{{ fieldErrors.auctionEndTime }}</span>
            </div>
          </template>

          <!-- Reservation Fields (when reservation is selected) -->
          <template v-if="formData.listingType === 'reservation'">
            <div class="form-group">
              <label>預付名額上限 <span class="required-mark">*</span></label>
              <input
                v-model.number="formData.reservationMax"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                placeholder="10"
                :class="{ 'input-error': fieldErrors.reservationMax }"
                @blur="validateField('reservationMax')"
                @input="validateField('reservationMax')"
              />
              <span v-if="fieldErrors.reservationMax" class="field-error-msg">{{ fieldErrors.reservationMax }}</span>
            </div>
            <div class="form-group">
              <label>訂金金額 (MOP) <span class="required-mark">*</span></label>
              <input
                v-model.number="formData.reservationDeposit"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                placeholder="100"
                :class="{ 'input-error': fieldErrors.reservationDeposit }"
                @blur="validateField('reservationDeposit')"
                @input="validateField('reservationDeposit')"
              />
              <span v-if="fieldErrors.reservationDeposit" class="field-error-msg">{{ fieldErrors.reservationDeposit }}</span>
            </div>
            <div class="form-group">
              <label>截止預付日期 <span class="required-mark">*</span></label>
              <input
                v-model="formData.reservationDeadline"
                type="datetime-local"
                :class="{ 'input-error': fieldErrors.reservationDeadline }"
                @blur="validateField('reservationDeadline')"
                @input="validateField('reservationDeadline')"
              />
              <span v-if="fieldErrors.reservationDeadline" class="field-error-msg">{{ fieldErrors.reservationDeadline }}</span>
            </div>
            <div class="form-group">
              <label>每人預約上限</label>
              <input
                v-model.number="formData.reservationLimitPerUser"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                placeholder="不限"
                :class="{ 'input-error': fieldErrors.reservationLimitPerUser }"
                @blur="validateField('reservationLimitPerUser')"
              />
              <span v-if="fieldErrors.reservationLimitPerUser" class="field-error-msg">{{ fieldErrors.reservationLimitPerUser }}</span>
            </div>
          </template>

          <!-- 商品種類（enum） -->
          <div class="form-group">
            <label>商品種類</label>
            <select v-model="formData.productType" class="form-select">
              <option :value="null" disabled>(請選擇)</option>
              <option value="graded_card">評分卡</option>
              <option value="original_box">原箱</option>
              <option value="original_case">原盒</option>
              <option value="original_bag">原袋</option>
              <option value="raw_card">裸卡</option>
              <option value="other">其它</option>
            </select>
          </div>

          <!-- 語言（獨立下拉選單，使用 enum 值發送） -->
          <div class="form-group">
            <label>語言</label>
            <select v-model="formData.language" class="form-select">
              <option :value="null" disabled>(請選擇)</option>
              <option value="japanese">日文</option>
              <option value="english">英文</option>
              <option value="traditional_chinese">繁體中文</option>
              <option value="simplified_chinese">簡體中文</option>
              <option value="korean">韓文</option>
              <option value="other">其他</option>
            </select>
          </div>

          <!-- 售價 / 直購價 -->
          <div class="form-group">
            <label v-if="formData.listingType === 'auction'">直購價 (MOP) — 0 即不限</label>
            <label v-else>售價 (MOP) <span class="required-mark">*</span></label>
            <input
              v-model.number="formData.price"
              type="number"
              :min="formData.listingType === 'auction' ? 0 : 0.01"
              max="99999999.99"
              step="0.01"
              :placeholder="formData.listingType === 'auction' ? '0（不限直購）' : '0.00'"
              :class="{ 'input-error': fieldErrors.price }"
              @blur="validateField('price')"
              @input="validateField('price')"
              :required="formData.listingType !== 'auction'"
            />
            <span v-if="fieldErrors.price" class="field-error-msg">{{ fieldErrors.price }}</span>
            <span v-if="formData.listingType === 'auction'" class="field-hint">填 0 = 唔設直購價；有數值時必須高於起拍價</span>
          </div>

          <!-- 商品狀態 -->
          <div class="form-group">
            <label>商品狀態</label>
            <select v-model="formData.isActive" class="form-select">
              <option :value="true">上架</option>
              <option :value="false">下架</option>
            </select>
          </div>

          <!-- 數量 -->
          <div class="form-group">
            <label>數量 <span class="required-mark" v-if="formData.listingType === 'sale'">*</span></label>
            <input
              v-model.number="formData.quantity"
              type="number"
              min="1"
              max="2147483647"
              step="1"
              placeholder="1"
              :disabled="formData.listingType === 'auction'"
              :class="{ 'input-error': fieldErrors.quantity }"
              @blur="validateField('quantity')"
              @input="validateField('quantity')"
            />
            <span v-if="fieldErrors.quantity" class="field-error-msg">{{ fieldErrors.quantity }}</span>
            <p v-if="formData.listingType === 'auction'" class="field-hint">拍賣商品數量固定為 1</p>
          </div>

          <!-- Images -->
          <div class="form-group full-width">
            <label>商品图片 <span class="label-hint">({{ imagePreviews.length }}/9)</span></label>
            <input
              id="productImageInput"
              ref="imageInput"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="handleImageChange"
            />
            <div class="image-upload-area" :class="{ disabled: imagePreviews.length >= 9 }">
              <label
                class="upload-box"
                :class="{ 'at-limit': imagePreviews.length >= 9 }"
                :for="imagePreviews.length >= 9 ? undefined : 'productImageInput'"
              >
                <span class="upload-icon">📷</span>
                <span class="upload-text">{{ imagePreviews.length >= 9 ? '已達上傳上限' : '點擊上傳圖片' }}</span>
                <span class="upload-hint">JPG/PNG，最大 10MB，最多 9 張</span>
              </label>
              <div v-if="imagePreviews.length > 0" class="image-previews">
                <div v-for="(img, index) in imagePreviews" :key="index" class="preview-item">
                  <img :src="resolveImageUrl(img)" alt="Preview" />
                  <button type="button" class="remove-btn" @click="removeImage(index)">×</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-group full-width">
            <label>商品標籤</label>
            <!-- Selected tags display -->
            <div v-if="selectedTags.length" class="tags-selected">
              <span
                v-for="tagId in selectedTags"
                :key="tagId"
                class="tag-badge-selected"
              >
                {{ availableTags.find(tg => tg.id === tagId)?.name }}
                <button type="button" @click="toggleTag(tagId)" class="tag-remove">×</button>
              </span>
            </div>
            <!-- Searchable checkbox dropdown -->
            <div class="tag-search-wrapper">
              <input
                v-model="tagSearch"
                type="text"
                class="tag-search-input"
                placeholder="🔍 搜尋標籤..."
                @focus="showTagDropdown = true"
                @blur="closeTagDropdown"
              />
              <div v-if="showTagDropdown" class="tag-list-dropdown">
                <div v-if="filteredTags.length === 0" class="tag-empty">無符合的標籤</div>
                <label
                  v-for="tag in filteredTags"
                  :key="tag.id"
                  class="tag-option"
                  :class="{ selected: isTagSelected(tag.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="isTagSelected(tag.id)"
                    @change="toggleTag(tag.id)"
                  />
                  <span class="tag-color-dot" :style="{ backgroundColor: tag.color || '#6366f1' }"></span>
                  <span class="tag-option-name">{{ tag.name }}</span>
                  <span v-if="tag.category && tag.category !== 'all'" class="tag-option-cat">{{ tag.category }}</span>
                </label>
              </div>
            </div>
            <p class="form-hint">選擇適合商品的標籤，可多選</p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="emit('update:open', false)" class="btn-cancel">
            取消
          </button>
          <button type="button" class="btn-submit" :disabled="loading" @click.prevent="handleSubmit">
            {{ loading ? '保存中...' : (product ? '保存修改' : '發布商品') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: #000000b3;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-6);
}

.modal {
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--danger);
  color: white;
}

.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group.full-width {
  grid-column: span 2;
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

/* 驗證錯誤樣式 */
.form-group .input-error {
  border-color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.06);
}

.form-group .input-error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.field-error-msg {
  font-size: 11px;
  color: #ef4444;
  line-height: 1.3;
}

.field-hint {
  font-size: 11px;
  color: var(--text-secondary, #9ca3af);
  line-height: 1.3;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* ===== 圖片上傳 ===== */
.image-upload-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.image-upload-area.disabled {
  opacity: 0.7;
  pointer-events: none;
}

.upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--bg-elevated);
}

.upload-box:hover:not(.at-limit) {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.05);
}

.upload-box.at-limit {
  cursor: not-allowed;
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

.upload-text {
  font-weight: 600;
  color: var(--text-primary);
}

.upload-box.at-limit .upload-text {
  color: var(--danger);
}

.label-hint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: normal;
  margin-left: var(--space-2);
}

.upload-icon {
  font-size: 32px;
  display: block;
  text-align: center;
}

.upload-box .upload-icon + .upload-text {
  display: block;
  margin-top: var(--space-1);
}

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.preview-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  display: block;
}

/* ===== Footer ===== */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-6);
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.btn-cancel {
  padding: var(--space-3) var(--space-6);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-cancel:hover {
  border-color: var(--text-secondary);
}

.btn-submit {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 標籤 ===== */
.required-mark {
  color: #ef4444;
  margin-left: 2px;
  font-weight: 700;
}

.form-hint {
  font-size: 11px;
  color: var(--text-secondary, #9ca3af);
  line-height: 1.3;
  margin: 0;
}

.tags-selected {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.tag-badge-selected {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  background: var(--primary-gradient);
  color: white;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0.7;
}

.tag-remove:hover {
  opacity: 1;
}

.tag-search-wrapper {
  position: relative;
  margin-top: var(--space-2);
  margin-bottom: var(--space-6);
}

.tag-search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.tag-list-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  margin-top: 4px;
}

.tag-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.tag-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.tag-option:hover {
  background: rgba(99, 102, 241, 0.08);
}

.tag-option.selected {
  background: rgba(99, 102, 241, 0.12);
}

.tag-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
  flex-shrink: 0;
}

.tag-option-name {
  flex: 1;
}

.tag-option-cat {
  font-size: var(--text-xs);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.tag-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== 手機適配 ===== */
@media (max-width: 767px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal {
    width: 100%;
    max-height: 92vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-bottom: none;
  }
  .modal-header { padding: var(--space-4); }
  .modal-body { padding: var(--space-4); }
  .form-grid { grid-template-columns: 1fr; }
  .form-group.full-width { grid-column: span 1; }
  .modal-footer { padding: var(--space-4); }
  .btn-cancel, .btn-submit { padding: var(--space-3) var(--space-4); }
}
</style>