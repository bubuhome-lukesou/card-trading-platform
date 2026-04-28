<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { aiApi } from '@/api/ai'
import { uploadApi } from '@/api/upload'
import { productApi } from '@/api/products'
import { tagApi } from '@/api/tags'
import { Loader2, ScanLine } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// State
const showModal = ref(false)
const editingProduct = ref<any>(null)
const loading = ref(false)
const products = ref<any[]>([])
const filterStatus = ref('all')
const scanning = ref(false)
const scanError = ref('')
const scanImageUrl = ref('')
const imageInput = ref<HTMLInputElement | null>(null)
const imagePreviews = ref<string[]>([])
const pendingImageFiles = ref<File[]>([])
const existingImageUrls = ref<string[]>([])
const availableTags = ref<any[]>([])
const selectedTags = ref<number[]>([])

const categories = [
  { value: 'pokemon', label: '宝可梦', emoji: '🎮' },
  { value: 'yugioh', label: '游戏王', emoji: '🐉' },
  { value: 'mtg', label: '万智牌', emoji: '🧙' },
  { value: 'ultraman', label: '奥特曼', emoji: '👾' },
  { value: 'onepiece', label: '海贼王', emoji: '⚔️' },
  { value: 'doraemon', label: '哆啦A梦', emoji: '🤖' },
  { value: 'sports', label: '体育卡', emoji: '⚽' },
  { value: 'other', label: '其他', emoji: '🎴' },
]

const conditions = [
  { value: 'mint', label: '全新/Mint' },
  { value: 'near_mint', label: '近全新/Near Mint' },
  { value: 'excellent', label: '优秀/Excellent' },
  { value: 'good', label: '良好/Good' },
  { value: 'fair', label: '一般/Fair' },
]

const rarities = [
  { value: 'common', label: '普通' },
  { value: 'rare', label: '稀有' },
  { value: 'super_rare', label: '超级稀有' },
  { value: 'ultra_rare', label: '爆闪稀有' },
  { value: 'secret_rare', label: '秘密稀有' },
]

// 预设仅销售模式，隐藏拍卖相关字段
const formData = ref({
  titleZh: '',
  titleEn: '',
  descriptionZh: '',
  descriptionEn: '',
  category: 'pokemon',
  condition: 'near_mint',
  rarity: 'rare',
  price: 0,
  quantity: 1,
  images: [] as string[],
  tags: [] as number[],
})

const resetForm = () => {
  formData.value = {
    titleZh: '',
    titleEn: '',
    descriptionZh: '',
    descriptionEn: '',
    category: 'pokemon',
    condition: 'near_mint',
    rarity: 'rare',
    price: 0,
    quantity: 1,
    images: [],
    tags: [],
  }
  imagePreviews.value = []
  pendingImageFiles.value = []
  existingImageUrls.value = []
  selectedTags.value = []
}

// AI Scan Card Function
const scanCardImage = async () => {
  if (!scanImageUrl.value.trim()) {
    scanError.value = '请输入图片 URL'
    return
  }

  scanning.value = true
  scanError.value = ''

  try {
    const response = await aiApi.recognizeCard(scanImageUrl.value)
    
    if (response.data.success && response.data.data) {
      const data = response.data.data
      
      // Auto-fill form with recognized data
      if (data.titleZh) formData.value.titleZh = data.titleZh
      if (data.titleEn) formData.value.titleEn = data.titleEn
      if (data.descriptionZh) formData.value.descriptionZh = data.descriptionZh
      if (data.descriptionEn) formData.value.descriptionEn = data.descriptionEn
      if (data.category) formData.value.category = data.category
      if (data.rarity) formData.value.rarity = data.rarity.toLowerCase()
      if (data.condition) formData.value.condition = data.condition
      if (data.brand) (formData.value as any).brand = data.brand
      if (data.series) (formData.value as any).series = data.series
      
      // Add image URL if recognized
      if (scanImageUrl.value) {
        formData.value.images = [scanImageUrl.value]
      }
      
      alert('✅ 扫描成功！请检查并修改自动填充的内容')
    } else {
      scanError.value = response.data.error || '无法识别图片中的卡牌'
    }
  } catch (error: any) {
    scanError.value = error?.response?.data?.message || '扫描失败，请重试'
  } finally {
    scanning.value = false
  }
}

const openCreateModal = () => {
  editingProduct.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (product: any) => {
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
  // Load existing tags
  selectedTags.value = (product.tags || []).map((t: any) => typeof t === 'number' ? t : t.id)
  formData.value = {
    titleZh: product.titleZh,
    titleEn: product.titleEn,
    descriptionZh: product.descriptionZh,
    descriptionEn: product.descriptionEn,
    category: product.category,
    condition: product.condition,
    rarity: product.rarity,
    price: product.price,
    quantity: product.quantity || 1,
    images: [...existingImages],
    tags: [...selectedTags.value],
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
        alert('图片上传失败，请重试')
        loading.value = false
        return
      }
    }

    // Prepare product data - merge existing URLs with newly uploaded URLs
    // 预设仅销售模式
    const productData = {
      ...formData.value,
      listingType: 'sale_only',
      images: [...existingImageUrls.value, ...uploadedUrls],
      tags: selectedTags.value,
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
    const message = error?.response?.data?.message || error?.message || '保存失败，请重试'
    alert(message)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (productId: string) => {
  if (!confirm('确定要删除此商品吗？')) return
  
  loading.value = true
  try {
    // TODO: Call API to delete product
    await new Promise(resolve => setTimeout(resolve, 500))
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
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
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
  if (imagePreviews.value.length + files.length > 9) {
    alert('最多只能上传9张图片')
    return
  }
  
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB')
      continue
    }
    pendingImageFiles.value.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviews.value.push(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

const removeImage = (index: number) => {
  // If index is within existingImageUrls range, it's an existing image URL
  if (index < existingImageUrls.value.length) {
    existingImageUrls.value.splice(index, 1)
  } else {
    // It's a new pending file
    const pendingIndex = index - existingImageUrls.value.length
    pendingImageFiles.value.splice(pendingIndex, 1)
  }
  // Rebuild preview: existing URLs + new file base64 previews
  const newFilePreviews = pendingImageFiles.value.map(file => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })
  })
  Promise.all(newFilePreviews).then(previews => {
    imagePreviews.value = [...existingImageUrls.value, ...previews]
  })
}

// Tag functions
const toggleTag = (tagId: number) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index === -1) {
    selectedTags.value.push(tagId)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

const loadTags = async () => {
  try {
    const response = await tagApi.getTags()
    availableTags.value = response.data
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
  loadTags()
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
        + 发布新商品
      </button>
    </div>

    <!-- Products Grid -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredProducts.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>暂无商品</h3>
      <p>点击上方「+ 发布商品」按钮发布您的第一件商品吧！</p>
    </div>

    <div v-else class="products-grid">
      <div v-for="product in filteredProducts" :key="product.id" class="product-card">
        <div class="product-image">
          <img v-if="getProductImage(product)" :src="getProductImage(product)" :alt="product.titleEn" class="product-img" />
          <span v-else class="category-emoji">{{ getCategoryEmoji(product.category) }}</span>
          <span class="status-badge" :class="getStatusBadge(product.status).class">
            {{ getStatusBadge(product.status).text }}
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
            <span class="price-label">售价</span>
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
          <h2>{{ editingProduct ? '编辑商品' : '发布新商品' }}</h2>
          <button @click="showModal = false" class="modal-close">✕</button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <!-- AI Scan Section -->
          <div class="scan-section">
            <div class="scan-header">
              <ScanLine class="scan-icon" />
              <span>🔮 AI 智能识别卡牌</span>
            </div>
            <div class="scan-input-row">
              <input
                v-model="scanImageUrl"
                type="url"
                placeholder="粘贴卡牌图片 URL..."
                class="scan-input"
              />
              <button
                type="button"
                @click="scanCardImage"
                :disabled="scanning"
                class="btn-scan"
              >
                <Loader2 v-if="scanning" class="animate-spin" />
                <ScanLine v-else />
                {{ scanning ? '识别中...' : '扫描' }}
              </button>
            </div>
            <p v-if="scanError" class="scan-error">{{ scanError }}</p>
            <p class="scan-hint">粘贴卡牌图片 URL，AI 将自动识别并填充商品信息</p>
          </div>

          <div class="form-divider"></div>

          <div class="form-grid">
            <!-- Title -->
            <div class="form-group">
              <label>商品名称（中文）</label>
              <input 
                v-model="formData.titleZh" 
                type="text" 
                placeholder="例如：Pokemon 1st Edition Base Set"
                required
              />
            </div>

            <div class="form-group">
              <label>商品名称（英文）</label>
              <input 
                v-model="formData.titleEn" 
                type="text" 
                placeholder="Product name in English"
              />
            </div>

            <!-- Description -->
            <div class="form-group full-width">
              <label>商品描述（中文）</label>
              <textarea 
                v-model="formData.descriptionZh" 
                rows="3"
                placeholder="详细描述商品信息、稀有度、品相..."
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
              <label>商品类别</label>
              <select v-model="formData.category">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.emoji }} {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>商品品相</label>
              <select v-model="formData.condition">
                <option v-for="cond in conditions" :key="cond.value" :value="cond.value">
                  {{ cond.label }}
                </option>
              </select>
            </div>

            <!-- Rarity -->
            <div class="form-group">
              <label>稀有度</label>
              <select v-model="formData.rarity">
                <option v-for="rarity in rarities" :key="rarity.value" :value="rarity.value">
                  {{ rarity.label }}
                </option>
              </select>
            </div>

            <!-- 售价 -->
            <div class="form-group">
              <label>售价 (HK$)</label>
              <input 
                v-model.number="formData.price" 
                type="number" 
                min="1"
                placeholder="0"
              />
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
              <label>商品图片</label>
              <input
                id="imageInput"
                ref="imageInput"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="handleImageChange"
              />
              <label class="upload-button" for="imageInput">
                <span class="upload-icon">📷</span>
                <span>点击上传图片</span>
                <span class="upload-hint">支持 JPG、PNG，最大 10MB，最多 9 张</span>
              </label>
              <div v-if="imagePreviews.length > 0" class="image-previews">
                <div v-for="(img, index) in imagePreviews" :key="index" class="preview-item">
                  <img :src="img" alt="Preview" />
                  <button type="button" class="remove-btn" @click="removeImage(index)">×</button>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div class="form-group full-width">
              <label>商品标签</label>
              <div class="tags-container">
                <button
                  v-for="tag in availableTags"
                  :key="tag.id"
                  type="button"
                  class="tag-button"
                  :class="{ selected: selectedTags.includes(tag.id) }"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
              </div>
              <p class="form-hint">选择适合商品的标签，可多选</p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showModal = false" class="btn-cancel">
              取消
            </button>
            <button type="submit" class="btn-submit" :disabled="loading">
              {{ loading ? '保存中...' : (editingProduct ? '保存修改' : '发布商品') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* AI Scan Styles */
.scan-section {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.scan-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-weight: 600;
  color: var(--primary);
}

.scan-icon {
  width: 20px;
  height: 20px;
}

.scan-input-row {
  display: flex;
  gap: var(--space-2);
}

.scan-input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.scan-input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-scan {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-scan:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scan-error {
  color: var(--danger);
  font-size: var(--text-xs);
  margin-top: var(--space-2);
}

.scan-hint {
  color: var(--text-muted);
  font-size: var(--text-xs);
  margin-top: var(--space-2);
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

/* Tag styles */
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
