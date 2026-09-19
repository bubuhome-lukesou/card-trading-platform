<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { uploadApi } from '@/api/upload'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { tagApi } from '@/api/tags'
import { CategoryLogo, CATEGORY_OPTIONS } from '@/components/brand/CategoryLogos'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// API base URL for absolute image URLs
const apiBaseUrl = import.meta.env.VITE_API_URL || ''

// Resolve image URL - prepend API base if it's a server-side path
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url
  return apiBaseUrl + url
}

// State
const showModal = ref(false)
const editingProduct = ref<any>(null)
const loading = ref(false)
const products = ref<any[]>([])
const filterStatus = ref('all')
const filterListingType = ref('all')
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

const openCreateModal = () => {
  editingProduct.value = null
  resetForm()
  // Load tags for default category (null = all)
  _tagSelectedSnapshot = []
  selectedTags.value = []
  tagSearch.value = ''
  showModal.value = true
}

const openEditModal = async (product: any) => {
  editingProduct.value = product
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
  const ids = (product.tags || []).map((t: any) => typeof t === 'number' ? t : t.id)
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
  showModal.value = true
}

const handleSubmit = async () => {
  // 即時欄位錯誤（格式類）也要清先可以提交
  const errorKeys = Object.keys(fieldErrors.value)
  if (errorKeys.length > 0) {
    alert('請先修正欄位錯誤：\n' + errorKeys.map(k => `• ${fieldErrors.value[k]}`).join('\n'))
    return
  }

  // 必填檢查——彈出提示列出所有未填項
  const missing = missingRequired()
  if (missing.length > 0) {
    alert('以下必填項未填寫：\n' + missing.map(m => `• ${m}`).join('\n'))
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
    if (editingProduct.value) {
      const res = await productApi.updateProduct(editingProduct.value.id, productData)
      productId = editingProduct.value.id
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

    showModal.value = false
    resetForm()
    loadProducts()
  } catch (error: any) {
    console.error('Failed to save product:', error)
    const message = error?.response?.data?.message || error?.message || '儲存失敗，請重試'
    alert(message)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (productId: string) => {
  if (!confirm('確定要删除此商品吗？')) return
  
  loading.value = true
  try {
    await productApi.deleteProduct(productId)
    products.value = products.value.filter(p => p.id !== productId)
  } catch (error) {
    console.error('Failed to delete product:', error)
  } finally {
    loading.value = false
  }
}

const filteredProducts = computed(() => {
  let result = products.value
  if (filterStatus.value !== 'all') {
    result = result.filter(p => p.status === filterStatus.value)
  }
  if (filterListingType.value !== 'all') {
    result = result.filter(p => p.listingType === filterListingType.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(p =>
      (p.titleZh || '').toLowerCase().includes(q) ||
      (p.titleEn || '').toLowerCase().includes(q) ||
      (p.productNumber ? String(p.productNumber) : '').includes(q)
    )
  }
  return result
})

// ===== 排序 / 分頁（同商品列表/訂單管理一致）=====
const PAGE_SIZE = 12
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortableColumns = [
  { key: 'titleZh', label: '商品', type: 'text' },
  { key: 'price', label: '價格', type: 'number' },
  { key: 'viewCount', label: '瀏覽', type: 'number' },
  { key: 'favoriteCount', label: '收藏', type: 'number' },
  { key: 'quantity', label: '庫存', type: 'number' },
  { key: 'createdAt', label: '上架', type: 'time' },
] as const

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

const compareProducts = (a: any, b: any, col: { key: string; type: string }): number => {
  let cmp = 0
  if (col.type === 'number') {
    cmp = (Number((a as any)[col.key]) || 0) - (Number((b as any)[col.key]) || 0)
  } else if (col.type === 'time') {
    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  } else {
    const as = String((a as any)[col.key] ?? '')
    const bs = String((b as any)[col.key] ?? '')
    cmp = as < bs ? -1 : as > bs ? 1 : 0
  }
  return sortDir.value === 'asc' ? cmp : -cmp
}

const sortedProducts = computed(() => {
  const base = filteredProducts.value
  if (!sortKey.value) {
    // 預設：最新上架在前
    return [...base].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return base
  return [...base].sort((a, b) => compareProducts(a, b, col))
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedProducts.value.length / PAGE_SIZE)))
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedProducts.value.slice(start, start + PAGE_SIZE)
})
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
}
watch([searchQuery, filterStatus, filterListingType], () => { currentPage.value = 1 })

// ===== 統計條（同商品列表 summary-bar）=====
const summary = computed(() => ({
  total: products.value.length,
  active: products.value.filter(p => p.status === 'active').length,
  sold: products.value.filter(p => p.status === 'sold').length,
  views: products.value.reduce((s, p) => s + (Number(p.viewCount) || 0), 0),
}))

// ===== 詳情彈出層 =====
const detailProduct = ref<any>(null)
const openDetail = (p: any) => { detailProduct.value = p }
const closeDetail = () => { detailProduct.value = null }

const LISTING_TYPE_TEXT: Record<string, { text: string; cls: string }> = {
  sale: { text: '直銷', cls: 't-sale' },
  auction: { text: '拍賣', cls: 't-auction' },
  reservation: { text: '預約', cls: 't-reserve' },
}
const listingTag = (lt: string) => LISTING_TYPE_TEXT[lt] || LISTING_TYPE_TEXT.sale

const PRODUCT_TYPE_TEXT: Record<string, string> = {
  graded_card: '評分卡',
  original_box: '原箱',
  original_case: '原盒',
  original_bag: '原袋',
  raw_card: '裸卡',
  other: '其它',
}

const LANGUAGE_TEXT: Record<string, string> = {
  japanese: '日文',
  english: '英文',
  traditional_chinese: '繁體中文',
  simplified_chinese: '簡體中文',
  korean: '韓文',
  other: '其他',
}

// Get image from product
const getProductImage = (product: any) => {
  if (product?.images) {
    if (Array.isArray(product.images)) {
      return product.images[0] || ''
    }
    try {
      const images = JSON.parse(product.images)
      return images[0] || ''
    } catch {
      return product.images || ''
    }
  }
  return ''
}

const getCategoryLabel = (category: string) => {
  return categories.find(c => c.value === category)?.label || category
}

const getConditionLabel = (condition: string) => {
  return conditions.find(c => c.value === condition)?.label || condition
}


const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    draft: { class: 'draft', text: '草稿' },
    active: { class: 'active', text: '在售' },
    sold: { class: 'sold', text: '已售' },
    removed: { class: 'removed', text: '已下架' },
  }
  return map[status] || { class: 'default', text: status }
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
      console.log('[DEBUG] Image added, previews:', imagePreviews.value.length)
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

const showImageLimitAlert = () => {
  alert('已達圖片上傳上限（9張）')
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

const loadProducts = async () => {
  loading.value = true
  try {
    const response = await productApi.getMyProducts()
    products.value = response.data
  } catch (error) {
    console.error('Failed to load products:', error)
  } finally {
    loading.value = false
  }
}

const routeWatcher = watch(
  () => route.query.action,
  (action) => {
    if (action === 'create') {
      openCreateModal()
      router.replace({ query: {} })
    }
  }
)

onMounted(() => {
  loadProducts()
})

onUnmounted(() => {
  routeWatcher()
})
</script>

<template>
  <div class="products-management">
    <!-- 頂部統計條（同商品列表/訂單管理） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item">
        <span class="stat-label">商品</span>
        <span class="stat-value">{{ summary.total }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">在售</span>
        <span class="stat-value money">{{ summary.active }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已售</span>
        <span class="stat-value">{{ summary.sold }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">總瀏覽</span>
        <span class="stat-value">{{ summary.views }} <small>次</small></span>
      </div>
    </div>

    <!-- Header -->
    <div class="section-header">
      <div class="list-tabs">
        <button
          class="list-tab"
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          全部
          <span class="tab-count">{{ products.length }}</span>
        </button>
        <button
          class="list-tab"
          :class="{ active: filterStatus === 'active' }"
          @click="filterStatus = 'active'"
        >
          在售
          <span class="tab-count">{{ products.filter(p => p.status === 'active').length }}</span>
        </button>
        <button
          class="list-tab"
          :class="{ active: filterStatus === 'draft' }"
          @click="filterStatus = 'draft'"
        >
          草稿
          <span class="tab-count">{{ products.filter(p => p.status === 'draft').length }}</span>
        </button>
        <button
          class="list-tab"
          :class="{ active: filterStatus === 'sold' }"
          @click="filterStatus = 'sold'"
        >
          已售
          <span class="tab-count">{{ products.filter(p => p.status === 'sold').length }}</span>
        </button>
      </div>
      <button @click="openCreateModal" class="btn-new">
        + 發布新商品
      </button>
    </div>

    <!-- 搜尋（同商品列表 search-row） -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜尋商品名稱或編號..."
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
    </div>

    <!-- Products Grid -->
    <StateView v-if="loading" state="loading" />

    <StateView v-else-if="filteredProducts.length === 0" state="empty" icon="📦" title="暫無商品" message="點击上方「+ 發布商品」按钮發布您的第一件商品吧！" />

    <div v-else class="products-grid">
      <div v-for="product in pagedProducts" :key="product.id" class="product-card">
        <div class="product-image">
          <img v-if="getProductImage(product)" :src="resolveImageUrl(getProductImage(product))" :alt="product.titleEn" class="product-img" />
          <span v-else class="category-emoji"><CategoryLogo :category="product.category" :size="34" /></span>
          <span class="status-badge" :class="getStatusBadge(product.status).class">
            {{ getStatusBadge(product.status).text }}
          </span>
          <span v-if="product.listingType === 'reservation'" class="listing-type-badge reservation">
            📅 預約
          </span>
        </div>

        <div class="product-info">
          <h3 class="product-title">{{ product.titleZh || product.titleEn }}</h3>
          <div class="product-meta">
            <span class="meta-item">
              {{ getCategoryLabel(product.category) }}
            </span>
            <span v-if="product.condition" class="meta-item">
              {{ getConditionLabel(product.condition) }}
            </span>
          </div>
          <div class="product-price">
            <span class="price-label">售價</span>
            <span class="price-value">{{ formatPrice(product.price) }}</span>
          </div>
        </div>

        <div class="product-actions">
          <button @click="openDetail(product)" class="btn-detail">詳情</button>
          <button v-if="product.status !== 'sold'" @click="openEditModal(product)" class="btn-edit">
            ✏️ 编辑
          </button>
          <span v-else class="sold-locked">🔒 已售</span>
          <button @click="handleDelete(product.id)" class="btn-delete">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- 分頁（同訂單管理 pagination） -->
    <div v-if="!loading && sortedProducts.length > 0" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ sortedProducts.length }} 件</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 商品詳情彈出層（規格表格，同商品詳情頁 spec table 風格） -->
    <div v-if="detailProduct" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>商品詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="type-tag" :class="listingTag(detailProduct.listingType).cls">{{ listingTag(detailProduct.listingType).text }}</span>
            <span class="status-badge" :class="getStatusBadge(detailProduct.status).class">{{ getStatusBadge(detailProduct.status).text }}</span>
            <span v-if="detailProduct.productNumber" class="detail-number">#{{ detailProduct.productNumber }}</span>
          </div>

          <div class="detail-product">
            <img v-if="getProductImage(detailProduct)" :src="resolveImageUrl(getProductImage(detailProduct))" class="detail-thumb" :alt="detailProduct.titleZh" />
            <span v-else class="category-emoji"><CategoryLogo :category="detailProduct.category" :size="26" /></span>
            <div class="dp-info">
              <span class="dp-title">{{ detailProduct.titleZh || detailProduct.titleEn }}</span>
              <span class="dp-sub">{{ detailProduct.titleEn }}</span>
            </div>
            <div class="dp-amount">
              <div class="amount">{{ formatPrice(detailProduct.price) }}</div>
            </div>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">類別</span>
              <span class="dg-value">{{ getCategoryLabel(detailProduct.category) }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">品相</span>
              <span class="dg-value">{{ detailProduct.condition ? getConditionLabel(detailProduct.condition) : '不指定' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">商品種類</span>
              <span class="dg-value">{{ PRODUCT_TYPE_TEXT[detailProduct.productType] || '不指定' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">語言</span>
              <span class="dg-value">{{ LANGUAGE_TEXT[detailProduct.language] || '不指定' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">庫存</span>
              <span class="dg-value">{{ detailProduct.quantity ?? 0 }} 件</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">上架時間</span>
              <span class="dg-value">{{ formatDate(detailProduct.createdAt) }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">瀏覽</span>
              <span class="dg-value">{{ detailProduct.viewCount || 0 }} 次</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">收藏</span>
              <span class="dg-value">{{ detailProduct.favoriteCount || 0 }} 人</span>
            </div>
            <div v-if="detailProduct.listingType === 'auction'" class="dg-item">
              <span class="dg-label">起拍價</span>
              <span class="dg-value">{{ formatPrice(detailProduct.startingPrice || 0) }}</span>
            </div>
            <div v-if="detailProduct.listingType === 'auction' && detailProduct.auctionEndTime" class="dg-item">
              <span class="dg-label">拍賣截止</span>
              <span class="dg-value">{{ formatDateTime(detailProduct.auctionEndTime) }}</span>
            </div>
            <div v-if="detailProduct.listingType === 'reservation'" class="dg-item">
              <span class="dg-label">預約名額</span>
              <span class="dg-value">{{ detailProduct.reservationMax || 0 }}</span>
            </div>
            <div v-if="detailProduct.listingType === 'reservation'" class="dg-item">
              <span class="dg-label">訂金</span>
              <span class="dg-value">{{ formatPrice(detailProduct.reservationDeposit || 0) }}</span>
            </div>
            <div v-if="detailProduct.listingType === 'reservation' && detailProduct.reservationDeadline" class="dg-item">
              <span class="dg-label">預約截止</span>
              <span class="dg-value">{{ formatDateTime(detailProduct.reservationDeadline) }}</span>
            </div>
            <div class="dg-item" v-if="detailProduct.tags && detailProduct.tags.length">
              <span class="dg-label">標籤</span>
              <span class="dg-value">{{ detailProduct.tags.map((t: any) => t.name || t).join('、') }}</span>
            </div>
          </div>

          <div v-if="detailProduct.descriptionZh || detailProduct.descriptionEn" class="detail-desc">
            <span class="dg-label">商品描述</span>
            <p>{{ detailProduct.descriptionZh || detailProduct.descriptionEn }}</p>
          </div>

          <div class="detail-actions">
            <button
              v-if="detailProduct.status !== 'sold'"
              class="btn-action detail"
              @click="closeDetail(); openEditModal(detailProduct)"
            >✏️ 編輯此商品</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingProduct ? '编辑商品' : '發布新商品' }}</h2>
          <button @click="showModal = false" class="modal-close">✕</button>
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
                  {{ availableTags.find(t => t.id === tagId)?.name }}
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
            <button type="button" @click="showModal = false" class="btn-cancel">
              取消
            </button>
            <button type="button" class="btn-submit" :disabled="loading" @click.prevent="handleSubmit">
              {{ loading ? '保存中...' : (editingProduct ? '保存修改' : '發布商品') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.required-mark {
  color: #ef4444;
  margin-left: 2px;
  font-weight: 700;
}

.products-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ===== 統計條（同商品列表/訂單管理）===== */
.summary-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.stat-label { font-size: var(--text-xs); color: var(--text-secondary); }

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}

.stat-value small { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }
.stat-value.money { color: #10b981; }

/* ===== tabs（同商品列表 list-tab）===== */
.list-tabs { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

.list-tab {
  display: inline-flex;
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

.list-tab:hover { border-color: var(--primary); }

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

/* ===== 搜尋（同商品列表）===== */
.search-row { display: flex; gap: var(--space-2); align-items: center; }

.search-input {
  flex: 1;
  max-width: 420px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus { border-color: var(--primary); }

.btn-clear-search {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
}

.btn-clear-search:hover { color: var(--text-primary); border-color: var(--primary); }

/* ===== 分頁（同訂單管理）===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.page-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--text-primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: var(--text-sm); color: var(--text-secondary); }

/* ===== 詳情彈出層（同訂單管理）===== */
.detail-modal {
  width: min(640px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}

.detail-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.detail-top { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

.detail-number {
  margin-left: auto;
  font-family: var(--font-num);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.type-tag {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.type-tag.t-sale { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.type-tag.t-auction { background: rgba(236, 72, 153, 0.18); color: #ec4899; }
.type-tag.t-reserve { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }

.detail-product {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.detail-thumb {
  width: 48px; height: 48px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.dp-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.dp-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-sub { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-amount { text-align: right; }
.amount { font-family: var(--font-num); font-weight: 700; color: var(--primary); white-space: nowrap; font-size: var(--text-base); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); word-break: break-all; }

.detail-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-desc p {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.detail-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }

.btn-action {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }

.btn-detail {
  padding: var(--space-3);
  font-size: var(--text-sm);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.btn-detail:hover {
  background: var(--primary-gradient);
  color: white;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-right: var(--space-1);
}

.chip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chip:hover {
  border-color: var(--primary);
  color: var(--text-primary);
}

.chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.tab {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover {
  border-color: var(--primary);
  color: var(--text-primary);
}

.tab.active {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px #667eea66;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.product-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px #0006;
}

.product-image {
  height: 140px;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-emoji {
  font-size: 48px;
}

.status-badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
}

.status-badge.active {
  background: #10b981;
  color: white;
}

.status-badge.draft {
  background: #6b7280;
  color: white;
}

.status-badge.sold {
  background: #3b82f6;
  color: white;
}

.status-badge.removed {
  background: #ef4444;
  color: white;
}

.listing-type-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: 2px 8px;
  border-radius: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: white;
}

.listing-type-badge.reservation {
  background: #f59e0b;
}

.product-info {
  padding: var(--space-4);
}

.product-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.meta-item {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  padding: 2px 6px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.price-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.price-value {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.product-auction {
  margin-top: var(--space-2);
}

.auction-label {
  font-size: var(--text-xs);
  color: var(--accent);
}

.product-actions {
  display: flex;
  border-top: 1px solid var(--border);
}

.product-actions button {
  flex: 1;
  padding: var(--space-3);
  font-size: var(--text-sm);
  border: none;
  background: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.product-actions .btn-edit {
  border-right: 1px solid var(--border);
  color: var(--primary);
}

.sold-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-3, 12px) 0;
  font-size: 12px;
  color: var(--text-secondary, #9ca3af);
  border-right: 1px solid var(--border);
}

.product-actions .btn-edit:hover {
  background: var(--primary-gradient);
  color: white;
}

.product-actions .btn-delete {
  color: var(--text-secondary);
}

.product-actions .btn-delete:hover {
  background: var(--danger);
  color: white;
}

/* Modal Styles */
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

.form-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-4) 0;
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

.image-upload {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.image-upload:hover {
  border-color: var(--primary);
}

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

.upload-box-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
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

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.upload-icon {
  font-size: 32px;
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
}

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

/* Tag styles - new searchable dropdown */
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

/* Old tag styles - kept for compatibility */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.tag-button {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-button:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tag-button.selected {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

@media (max-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ===== 手機版適配（<768px：同訂單管理）===== */
@media (max-width: 767px) {
  /* min-width 傳遞鏈修復 — flex 內容不再撐爆容器 */
  .products-management,
  .summary-bar,
  .stat-item,
  .list-tabs,
  .search-row,
  .search-input,
  .pagination {
    min-width: 0;
  }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }

  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .btn-new { margin-left: 0; width: 100%; }

  .search-input { max-width: none; width: 100%; }

  .products-grid { grid-template-columns: 1fr; gap: var(--space-3); }
  .product-card { max-width: 100%; }

  .product-actions .btn-edit { flex: 1.2; }
  .product-actions .btn-detail { flex: 1; }
  .product-actions .btn-delete { flex: 0 0 52px; }

  .detail-grid { grid-template-columns: 1fr; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .detail-modal {
    width: 100%;
    max-height: 88vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-bottom: none;
  }
  .modal { max-height: 92vh; }
  .pagination { flex-wrap: wrap; gap: var(--space-2); }
  .page-info { font-size: var(--text-xs); }
}

@media (max-width: 640px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full-width {
    grid-column: span 1;
  }
}
</style>
