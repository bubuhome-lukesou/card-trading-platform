<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { uploadApi } from '@/api/upload'
import { productApi } from '@/api/products'
import { tagApi } from '@/api/tags'

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
const imageInput = ref<HTMLInputElement | null>(null)
const imagePreviews = ref<string[]>([])
const pendingImageFiles = ref<File[]>([])
const pendingImagePreviews = ref<string[]>([])
const existingImageUrls = ref<string[]>([])
const availableTags = ref<any[]>([])
const selectedTags = ref<number[]>([])
const tagSearch = ref('')
const showTagCreate = ref(false)
const showTagDropdown = ref(false)
const newTagName = ref('')
const newTagColor = ref('#6366f1')
const creatingTag = ref(false)

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

watch(showTagCreate, (val) => {
  if (val && tagSearch.value.trim()) {
    newTagName.value = tagSearch.value.trim()
  }
})

// Task 4: Reload tags when category changes (two-level tag selection)
watch(() => formData.value.category, (newCategory) => {
  if (newCategory) {
    loadTags(newCategory)
  }
})

const categories = [
  { value: 'pokemon', label: '寶可夢', emoji: '🎮' },
  { value: 'yugioh', label: '遊戲王', emoji: '🐉' },
  { value: 'mtg', label: '萬智牌', emoji: '🧙' },
  { value: 'ultraman', label: '奧特曼', emoji: '👾' },
  { value: 'onepiece', label: '海賊王', emoji: '⚔️' },
  { value: 'doraemon', label: '哆啦A梦', emoji: '🤖' },
  { value: 'sports', label: '體育卡', emoji: '⚽' },
  { value: 'other', label: '其他', emoji: '🎴' },
]

const conditions = [
  { value: 'S', label: 'S級 - 完美品相' },
  { value: 'A', label: 'A級 - 輕微瑕疵' },
  { value: 'B', label: 'B級 - 少量瑕疵' },
  { value: 'C', label: 'C級 - 磨損可見' },
  { value: 'D', label: 'D級 - 嚴重磨損' },
]

// 商品種類（從 Tag type=product_type 加載，選擇後直接存名稱字串）
const productTypes = ref<any[]>([])

// 預設僅銷售模式，隐藏拍賣相關字段
const formData = ref({
  titleZh: '',
  titleEn: '',
  descriptionZh: '',
  descriptionEn: '',
  category: 'pokemon',
  condition: 'S',
  price: 0,
  quantity: 1,
  images: [] as string[],
  tags: [] as number[],
  productType: null as string | null,
  language: null as string | null,
  isActive: true,
  // Listing type
  listingType: 'sale' as 'sale' | 'auction' | 'reservation',
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
    condition: 'S',
    price: 0,
    quantity: 1,
    images: [],
    tags: [],
    productType: null,
    language: null,
    isActive: true,
    listingType: 'sale',
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
}

const openCreateModal = () => {
  editingProduct.value = null
  resetForm()
  // 預設商品种類為裸卡
  formData.value.productType = 'raw_card'
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
  _tagSelectedSnapshot = [...ids]
  selectedTags.value = [...ids]
  // productType is now a direct string value
  await loadTags()
  await loadProductTypes()

  formData.value = {
    titleZh: product.titleZh,
    titleEn: product.titleEn,
    descriptionZh: product.descriptionZh,
    descriptionEn: product.descriptionEn,
    category: product.category,
    condition: product.condition || 'S',
    price: product.price,
    quantity: product.quantity || 1,
    images: [...existingImages],
    tags: [...selectedTags.value],
    productType: product.productType || null,
    language: product.language || null,
    isActive: product.isActive !== false,
    listingType: product.listingType || 'sale',
    reservationMax: product.reservationMax || 10,
    reservationDeposit: product.reservationDeposit || 0,
    reservationDeadline: product.reservationDeadline || '',
    reservationLimitPerUser: product.reservationLimitPerUser || null,
  }
  showModal.value = true
}

const handleSubmit = async () => {
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
    if (editingProduct.value) {
      await productApi.updateProduct(editingProduct.value.id, productData)
    } else {
      await productApi.createProduct(productData)
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
  if (filterStatus.value === 'all') return products.value
  return products.value.filter(p => p.status === filterStatus.value)
})

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

const getCategoryEmoji = (category: string) => {
  return categories.find(c => c.value === category)?.emoji || '🎴'
}

const getCategoryLabel = (category: string) => {
  return categories.find(c => c.value === category)?.label || category
}

const getConditionLabel = (condition: string) => {
  return conditions.find(c => c.value === condition)?.label || condition
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
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

const createNewTag = async () => {
  if (!newTagName.value.trim()) return
  creatingTag.value = true
  try {
    const response = await tagApi.createTag({
      name: newTagName.value.trim(),
      color: newTagColor.value,
    })
    availableTags.value.push(response.data)
    _tagSelectedSnapshot.push(response.data.id)
    selectedTags.value = [..._tagSelectedSnapshot]
    newTagName.value = ''
    showTagCreate.value = false
  } catch (error) {
    console.error('Failed to create tag:', error)
  } finally {
    creatingTag.value = false
  }
}

const loadTags = async (category?: string) => {
  try {
    const params = category ? { category } : undefined
    const response = await tagApi.getTags(params)
    const allTags = response.data || []
    // Filter out product_type and language tags - those have dedicated dropdowns
    availableTags.value = allTags.filter((t: any) => t.type !== 'product_type' && t.type !== 'language')
    // Product types filtered by category
    productTypes.value = allTags.filter((t: any) => t.type === 'product_type')
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

const loadProductTypes = async (category?: string) => {
  try {
    const params = category ? { category } : undefined
    const response = await tagApi.getTags(params)
    const allTags = response.data || []
    productTypes.value = allTags.filter((t: any) => t.type === 'product_type')
  } catch (error) {
    console.error('Failed to load product types:', error)
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
  loadTags()
  loadProductTypes()
})

onUnmounted(() => {
  routeWatcher()
})
</script>

<template>
  <div class="products-management">
    <!-- Header -->
    <div class="section-header">
      <div class="filter-tabs">
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          全部 ({{ products.length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'active' }"
          @click="filterStatus = 'active'"
        >
          在售 ({{ products.filter(p => p.status === 'active').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'draft' }"
          @click="filterStatus = 'draft'"
        >
          草稿 ({{ products.filter(p => p.status === 'draft').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'sold' }"
          @click="filterStatus = 'sold'"
        >
          已售 ({{ products.filter(p => p.status === 'sold').length }})
        </button>
      </div>
      <button @click="openCreateModal" class="btn-primary">
        + 發布新商品
      </button>
    </div>

    <!-- Products Grid -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>

    <div v-else-if="filteredProducts.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>暫無商品</h3>
      <p>點击上方「+ 發布商品」按钮發布您的第一件商品吧！</p>
    </div>

    <div v-else class="products-grid">
      <div v-for="product in filteredProducts" :key="product.id" class="product-card">
        <div class="product-image">
          <img v-if="getProductImage(product)" :src="resolveImageUrl(getProductImage(product))" :alt="product.titleEn" class="product-img" />
          <span v-else class="category-emoji">{{ getCategoryEmoji(product.category) }}</span>
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
            <span class="meta-item">
              {{ getConditionLabel(product.condition) }}
            </span>
          </div>
          <div class="product-price">
            <span class="price-label">售價</span>
            <span class="price-value">{{ formatPrice(product.price) }}</span>
          </div>
        </div>

        <div class="product-actions">
          <button @click="openEditModal(product)" class="btn-edit">
            ✏️ 编辑
          </button>
          <button @click="handleDelete(product.id)" class="btn-delete">
            🗑️ 删除
          </button>
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
              <select v-model="formData.category" required>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.emoji }} {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>商品品相</label>
              <select v-model="formData.condition">
                <option :value="null">(請選擇)</option>
                <option v-for="cond in conditions" :key="cond.value" :value="cond.value">
                  {{ cond.label }}
                </option>
              </select>
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

            <!-- Reservation Fields (when reservation is selected) -->
            <template v-if="formData.listingType === 'reservation'">
              <div class="form-group">
                <label>預付名額上限</label>
                <input
                  v-model.number="formData.reservationMax"
                  type="number"
                  min="1"
                  placeholder="10"
                />
              </div>
              <div class="form-group">
                <label>訂金金額 (MOP)</label>
                <input
                  v-model.number="formData.reservationDeposit"
                  type="number"
                  min="0"
                  placeholder="100"
                />
              </div>
              <div class="form-group">
                <label>截止預付日期</label>
                <input
                  v-model="formData.reservationDeadline"
                  type="datetime-local"
                />
              </div>
              <div class="form-group">
                <label>每人預约上限</label>
                <input
                  v-model.number="formData.reservationLimitPerUser"
                  type="number"
                  min="1"
                  placeholder="不限"
                />
              </div>
            </template>

            <!-- 商品種類（enum） -->
            <div class="form-group">
              <label>商品種類</label>
              <select v-model="formData.productType" class="form-select">
                <option :value="null">(請選擇)</option>
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
                <option :value="null">(請選擇)</option>
                <option value="japanese">日文</option>
                <option value="english">英文</option>
                <option value="traditional_chinese">繁體中文</option>
                <option value="simplified_chinese">簡體中文</option>
                <option value="korean">韓文</option>
                <option value="other">其他</option>
              </select>
            </div>

            <!-- 售價 -->
            <div class="form-group">
              <label>售價 (MOP) <span class="required-mark">*</span></label>
              <input 
                v-model.number="formData.price" 
                type="number" 
                min="1"
                placeholder="0"
                required
              />
            </div>

            <!-- 商品狀態 -->
            <div class="form-group">
              <label>商品狀態</label>
              <select v-model="formData.isActive" class="form-select">
                <option :value="true">上架</option>
                <option :value="false">下架</option>
              </select>
            </div>

            <!-- 数量 -->
            <div class="form-group">
              <label>数量</label>
              <input 
                v-model.number="formData.quantity" 
                type="number" 
                min="1"
                placeholder="1"
              />
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
              <label>商品標簽</label>
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
              <!-- Tag search dropdown -->
              <!-- Tag search dropdown - positioned below the input -->
              <div class="tag-search-wrapper">
                <input
                  v-model="tagSearch"
                  type="text"
                  class="tag-search-input"
                  placeholder="搜索標簽..."
                  @focus="showTagDropdown = true"
                  @blur="closeTagDropdown"
                />
                <!-- Show create form when creating new tag -->
                <div v-if="showTagCreate" class="tag-create-form">
                  <input
                    v-model="newTagName"
                    type="text"
                    placeholder="新標簽名称"
                    class="tag-create-input"
                  />
                  <input
                    v-model="newTagColor"
                    type="color"
                    class="tag-create-color"
                  />
                  <button
                    type="button"
                    @click="createNewTag"
                    :disabled="creatingTag || !newTagName.trim()"
                    class="tag-create-btn"
                  >
                    {{ creatingTag ? '...' : '創建' }}
                  </button>
                  <button type="button" @click="showTagCreate = false; newTagName = ''" class="tag-create-cancel">×</button>
                </div>
                <!-- Show hint to create new tag when no match -->
                <div v-else-if="tagSearch && !filteredTags.find(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))" class="tag-create-hint">
                  <button type="button" @click="newTagName = tagSearch; showTagCreate = true" class="tag-create-link">
                    + 創建新標簽「{{ tagSearch }}」
                  </button>
                </div>
                <!-- Show dropdown only when user types in search box -->
                <div v-if="tagSearch.trim() && filteredTags.length > 0" class="tag-list-dropdown">
                  <button
                    v-for="tag in filteredTags"
                    :key="tag.id"
                    type="button"
                    class="tag-option"
                    :class="{ selected: isTagSelected(tag.id) }"
                    @click="toggleTag(tag.id)"
                  >
                    <span
                      class="tag-color-dot"
                      :style="{ backgroundColor: tag.color || '#6366f1' }"
                    ></span>
                    {{ tag.name }}
                    <span v-if="isTagSelected(tag.id)" class="tag-check">✓</span>
                  </button>
                </div>
              </div>
              <p class="form-hint">選择适合商品的標簽，可多選</p>
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
  gap: var(--space-6);
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

.loading-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.empty-state h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
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

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.tag-create-form {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-elevated);
  border: 1px dashed var(--primary);
  border-radius: var(--radius);
}

.tag-create-input {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tag-create-color {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.tag-create-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  background: var(--primary-gradient);
  color: white;
  border: none;
  cursor: pointer;
}

.tag-create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-create-cancel {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 18px;
}

.tag-create-hint {
  margin-top: var(--space-2);
}

.tag-create-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.tag-create-link:hover {
  text-decoration: underline;
}

.tag-list-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  margin-top: 4px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  text-align: left;
  font-size: var(--text-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.tag-option:hover {
  background: var(--bg-primary);
}

.tag-option.selected {
  background: var(--primary) + '15';
  color: var(--primary);
}

.tag-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-check {
  margin-left: auto;
  font-weight: bold;
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
