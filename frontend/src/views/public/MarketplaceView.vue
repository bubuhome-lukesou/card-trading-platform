<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Search, SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import { tagApi } from '@/api/tags'
import type { Product, Tag } from '@/types'
import ProductCard from '@/components/product/ProductCard.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// State
const products = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const showFilters = ref(true)
const hasMore = computed(() => products.value.length < meta.value.total)
const sentinelRef = ref<HTMLElement | null>(null)
const filtersExpanded = ref({
  category: true,
  listingType: true,
  rarity: true,
  condition: true,
  price: true,
  tags: true
})

// Filters - using any to avoid complex type issues
const filters = ref<any>({
  search: '',
  category: [] as string[],
  brand: [] as string[],
  series: [] as string[],
  rarity: [] as string[],
  condition: [] as string[],
  priceMin: undefined as number | undefined,
  priceMax: undefined as number | undefined,
  listingType: 'all',
  sortBy: 'newest',
  tags: [] as string[],
  page: 1,
  limit: 20
})

const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 0 })

const filterOptions = ref({
  categories: [
    { value: 'pokemon', label: '宝可梦', labelEn: 'Pokemon' },
    { value: 'yugioh', label: '游戏王', labelEn: 'Yu-Gi-Oh!' },
    { value: 'mtg', label: '万智牌', labelEn: 'Magic: The Gathering' },
    { value: 'ultraman', label: '奥特曼', labelEn: 'Ultraman' },
    { value: 'onepiece', label: '海贼王', labelEn: 'One Piece' },
    { value: 'other', label: '其他', labelEn: 'Other' }
  ],
  rarities: [
    { value: 'SSR', label: 'SSR' },
    { value: 'SR', label: 'SR' },
    { value: 'R', label: 'R' },
    { value: 'N', label: 'N' }
  ],
  conditions: [
    { value: 'mint', label: 'Mint', labelZh: '全新' },
    { value: 'near_mint', label: 'Near Mint', labelZh: '近全新' },
    { value: 'excellent', label: 'Excellent', labelZh: '优秀' },
    { value: 'good', label: 'Good', labelZh: '良好' },
    { value: 'fair', label: 'Fair', labelZh: '一般' }
  ],
  tags: [] as Tag[]
})

const sortOptions = [
  { value: 'newest', labelKey: 'product.sort.newest' },
  { value: 'popular', labelKey: 'product.sort.popular' },
  { value: 'price_asc', labelKey: 'product.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'product.sort.priceDesc' },
  { value: 'ending_soon', labelKey: 'product.sort.endingSoon' }
]

// Computed
const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.category?.length) count += filters.value.category.length
  if (filters.value.rarity?.length) count += filters.value.rarity.length
  if (filters.value.condition?.length) count += filters.value.condition.length
  if (filters.value.priceMin || filters.value.priceMax) count++
  if (filters.value.listingType !== 'all') count++
  if (filters.value.tags?.length) count += filters.value.tags.length
  return count
})

const activeFiltersList = computed(() => {
  const list: { key: string; value: string; rawValue?: string }[] = []

  filters.value.category?.forEach((c: string) => {
    const cat = filterOptions.value.categories.find(x => x.value === c)
    list.push({ key: 'category', value: locale.value === 'zh' ? cat?.label || c : cat?.labelEn || c, rawValue: c })
  })

  filters.value.rarity?.forEach((r: string) => {
    const rarity = filterOptions.value.rarities.find(x => x.value === r)
    list.push({ key: 'rarity', value: rarity?.label || r, rawValue: r })
  })

  filters.value.condition?.forEach((c: string) => {
    const cond = filterOptions.value.conditions.find(x => x.value === c)
    list.push({ key: 'condition', value: locale.value === 'zh' ? `${cond?.labelZh} (${cond?.label})` : cond?.label || c, rawValue: c })
  })

  if (filters.value.priceMin || filters.value.priceMax) {
    list.push({
      key: 'price',
      value: `HK$ ${filters.value.priceMin || 0} - ${filters.value.priceMax || '∞'}`
    })
  }

  if (filters.value.listingType !== 'all') {
    list.push({
      key: 'listingType',
      value: filters.value.listingType === 'sale' ? '仅销售' : '仅拍卖'
    })
  }

  filters.value.tags?.forEach((tagId: string) => {
    const tag = filterOptions.value.tags.find(x => String(x.id) === tagId)
    list.push({ key: 'tags', value: tag?.name || tagId, rawValue: tagId })
  })

  return list
})

// Methods
const fetchProducts = async (append = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  try {
    // Strip listingType if 'all' since backend only accepts 'sale'|'auction'|'both'
    const { listingType, ...params } = filters.value
    const cleanParams = listingType === 'all' ? params : { ...filters.value, listingType }
    const response = await productApi.getProducts(cleanParams)
    if (append) {
      products.value = [...products.value, ...response.data.data]
    } else {
      products.value = response.data.data
    }
    meta.value = response.data.meta
  } catch (error) {
    console.error('Failed to fetch products:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const updateFilter = (key: string, value: any) => {
  (filters.value as any)[key] = value
  filters.value.page = 1
  updateUrl()
  fetchProducts()
}

const toggleArrayFilter = (key: 'category' | 'rarity' | 'condition' | 'tags', value: string) => {
  const arr = filters.value[key] || []
  const index = arr.indexOf(value)
  if (index === -1) {
    arr.push(value)
  } else {
    arr.splice(index, 1)
  }
  updateFilter(key, arr)
}

const removeFilter = (key: string, value?: string) => {
  if (key === 'price') {
    filters.value.priceMin = undefined
    filters.value.priceMax = undefined
  } else if (key === 'listingType') {
    filters.value.listingType = 'all'
  } else if (value) {
    const arr = filters.value[key] || []
    // Find the actual value to remove (might be stored as rawValue in activeFiltersList)
    const index = arr.indexOf(value)
    if (index === -1) {
      // value might be the display label, find by iterating
      for (let i = 0; i < arr.length; i++) {
        const displayValue = key === 'category'
          ? (locale.value === 'zh'
              ? filterOptions.value.categories.find(x => x.value === arr[i])?.label
              : filterOptions.value.categories.find(x => x.value === arr[i])?.labelEn) || arr[i]
          : key === 'rarity'
          ? filterOptions.value.rarities.find(x => x.value === arr[i])?.label || arr[i]
          : key === 'condition'
          ? (locale.value === 'zh'
              ? `${filterOptions.value.conditions.find(x => x.value === arr[i])?.labelZh} (${filterOptions.value.conditions.find(x => x.value === arr[i])?.label})`
              : filterOptions.value.conditions.find(x => x.value === arr[i])?.label) || arr[i]
          : arr[i]
        if (displayValue === value) {
          arr.splice(i, 1)
          break
        }
      }
    } else {
      arr.splice(index, 1)
    }
  }
  filters.value.page = 1
  updateUrl()
  fetchProducts()
}

const clearAllFilters = () => {
  filters.value = {
    search: '',
    category: [],
    brand: [],
    series: [],
    rarity: [],
    condition: [],
    priceMin: undefined,
    priceMax: undefined,
    listingType: 'all',
    sortBy: 'newest',
    page: 1,
    limit: 20
  }
  updateUrl()
  fetchProducts()
}

const updateUrl = () => {
  const query: Record<string, string> = {}
  if (filters.value.search) query.search = filters.value.search
  if (filters.value.category?.length) query.category = filters.value.category.join(',')
  if (filters.value.rarity?.length) query.rarity = filters.value.rarity.join(',')
  if (filters.value.condition?.length) query.condition = filters.value.condition.join(',')
  if (filters.value.priceMin) query.priceMin = String(filters.value.priceMin)
  if (filters.value.priceMax) query.priceMax = String(filters.value.priceMax)
  if (filters.value.listingType !== 'all') query.listing = filters.value.listingType
  if (filters.value.sortBy !== 'newest') query.sort = filters.value.sortBy
  if (filters.value.tags?.length) query.tags = filters.value.tags.join(',')
  if (filters.value.page !== 1) query.page = String(filters.value.page)

  router.replace({ query })
}

const parseUrlFilters = () => {
  const query = route.query
  if (query.search) filters.value.search = query.search as string
  if (query.category) filters.value.category = (query.category as string).split(',')
  if (query.rarity) filters.value.rarity = (query.rarity as string).split(',')
  if (query.condition) filters.value.condition = (query.condition as string).split(',')
  if (query.priceMin) filters.value.priceMin = Number(query.priceMin)
  if (query.priceMax) filters.value.priceMax = Number(query.priceMax)
  if (query.listing) filters.value.listingType = query.listing as 'all' | 'sale' | 'auction'
  if (query.sort) filters.value.sortBy = query.sort as string
  if (query.tags) filters.value.tags = (query.tags as string).split(',')
  if (query.page) filters.value.page = Number(query.page)
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  filters.value.page++
  fetchProducts(true)
}

const handleSearch = () => {
  filters.value.page = 1
  updateUrl()
  fetchProducts()
}

const loadTags = async () => {
  try {
    const response = await tagApi.getTags()
    filterOptions.value.tags = response.data
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

// Lifecycle
onMounted(() => {
  parseUrlFilters()
  fetchProducts()
  loadTags()

  // Infinite scroll via scroll event
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const handleScroll = () => {
  if (loadingMore.value || !hasMore.value) return
  const scrollBottom = document.documentElement.scrollTop + window.innerHeight
  const threshold = document.documentElement.scrollHeight - 200
  if (scrollBottom >= threshold) {
    loadMore()
  }
}

watch(() => route.query, () => {
  parseUrlFilters()
  if (!loading.value) fetchProducts()
})
</script>

<template>
  <div class="marketplace">
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">{{ t('product.marketplace') }}</h1>

        <!-- Search Bar -->
        <div class="search-bar">
          <Search class="search-icon" />
          <input
            v-model="filters.search"
            type="text"
            class="search-input"
            :placeholder="t('common.searchPlaceholder')"
            @keyup.enter="handleSearch"
          />
          <button class="btn btn-primary" @click="handleSearch">
            {{ t('common.search') }}
          </button>
        </div>
      </div>

      <div class="marketplace-layout">
        <!-- Filters Sidebar -->
        <aside class="filter-sidebar" :class="{ 'is-open': showFilters }">
          <div class="filter-header">
            <h3>
              <SlidersHorizontal class="icon" />
              {{ t('product.filters.title') }}
            </h3>
            <button
              class="filter-close"
              @click="showFilters = false"
            >
              ✕
            </button>
          </div>

          <!-- Category -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.category = !filtersExpanded.category">
              {{ t('product.filters.category') }}
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.category }" />
            </h4>
            <div v-show="filtersExpanded.category" class="filter-options">
              <label
                v-for="cat in filterOptions.categories"
                :key="cat.value"
                class="filter-option"
                :class="{ active: filters.category.includes(cat.value) }"
              >
                <input
                  type="checkbox"
                  :checked="filters.category.includes(cat.value)"
                  @change="toggleArrayFilter('category', cat.value)"
                />
                <span class="checkmark" />
                <span class="filter-label">
                  {{ locale === 'zh' ? cat.label : cat.labelEn }}
                </span>
              </label>
            </div>
          </div>

          <!-- Listing Type -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.listingType = !filtersExpanded.listingType">
              {{ t('product.filters.listingType') }}
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.listingType }" />
            </h4>
            <div v-show="filtersExpanded.listingType" class="filter-options">
              <label
                v-for="opt in [
                  { value: 'all', label: t('product.filters.all') },
                  { value: 'sale', label: t('product.filters.saleOnly') },
                  { value: 'auction', label: t('product.filters.auctionOnly') }
                ]"
                :key="opt.value"
                class="filter-option"
                :class="{ active: filters.listingType === opt.value }"
              >
                <input
                  type="radio"
                  :checked="filters.listingType === opt.value"
                  @change="updateFilter('listingType', opt.value)"
                />
                <span class="radiomark" />
                <span class="filter-label">{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <!-- Rarity -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.rarity = !filtersExpanded.rarity">
              {{ t('product.filters.rarity') }}
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.rarity }" />
            </h4>
            <div v-show="filtersExpanded.rarity" class="filter-options">
              <label
                v-for="rarity in filterOptions.rarities"
                :key="rarity.value"
                class="filter-option"
                :class="{ active: filters.rarity.includes(rarity.value) }"
              >
                <input
                  type="checkbox"
                  :checked="filters.rarity.includes(rarity.value)"
                  @change="toggleArrayFilter('rarity', rarity.value)"
                />
                <span class="checkmark" />
                <span class="filter-label filter-rarity" :class="`rarity-${rarity.value.toLowerCase()}`">
                  ⭐ {{ rarity.label }}
                </span>
              </label>
            </div>
          </div>

          <!-- Condition -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.condition = !filtersExpanded.condition">
              {{ t('product.filters.condition') }}
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.condition }" />
            </h4>
            <div v-show="filtersExpanded.condition" class="filter-options">
              <label
                v-for="cond in filterOptions.conditions"
                :key="cond.value"
                class="filter-option"
                :class="{ active: filters.condition.includes(cond.value) }"
              >
                <input
                  type="checkbox"
                  :checked="filters.condition.includes(cond.value)"
                  @change="toggleArrayFilter('condition', cond.value)"
                />
                <span class="checkmark" />
                <span class="filter-label">
                  {{ locale === 'zh' ? `${cond.labelZh} (${cond.label})` : cond.label }}
                </span>
              </label>
            </div>
          </div>

          <!-- Price Range -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.price = !filtersExpanded.price">
              {{ t('product.filters.priceRange') }}
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.price }" />
            </h4>
            <div v-show="filtersExpanded.price" class="price-range">
              <input
                v-model.number="filters.priceMin"
                type="number"
                class="price-input"
                placeholder="Min"
                @change="updateFilter('priceMin', filters.priceMin)"
              />
              <span class="price-separator">-</span>
              <input
                v-model.number="filters.priceMax"
                type="number"
                class="price-input"
                placeholder="Max"
                @change="updateFilter('priceMax', filters.priceMax)"
              />
            </div>
          </div>

          <!-- Tags -->
          <div class="filter-section">
            <h4 class="filter-title" @click="filtersExpanded.tags = !filtersExpanded.tags">
              标签
              <ChevronDown class="filter-chevron" :class="{ collapsed: !filtersExpanded.tags }" />
            </h4>
            <div v-show="filtersExpanded.tags" class="filter-options">
              <label
                v-for="tag in filterOptions.tags"
                :key="tag.id"
                class="filter-option"
                :class="{ active: filters.tags.includes(String(tag.id)) }"
              >
                <input
                  type="checkbox"
                  :checked="filters.tags.includes(String(tag.id))"
                  @change="toggleArrayFilter('tags', String(tag.id))"
                />
                <span class="checkmark" />
                <span class="filter-label">{{ tag.name }}</span>
              </label>
            </div>
          </div>
        </aside>

        <!-- Products Grid -->
        <div class="products-area">
          <!-- Toolbar -->
          <div class="products-toolbar">
            <div class="toolbar-left">
              <button
                class="btn btn-ghost filter-toggle"
                @click="showFilters = !showFilters"
              >
                <SlidersHorizontal class="icon" />
                {{ t('product.filters.title') }}
                <span v-if="activeFiltersCount > 0" class="filter-count">
                  {{ activeFiltersCount }}
                </span>
              </button>
            </div>

            <!-- Sort -->
            <div class="sort-dropdown">
              <select
                v-model="filters.sortBy"
                class="sort-select"
                @change="updateFilter('sortBy', filters.sortBy)"
              >
                <option
                  v-for="opt in sortOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.labelKey) }}
                </option>
              </select>
              <ChevronDown class="sort-icon" />
            </div>
          </div>

          <!-- Active Filters -->
          <div v-if="activeFiltersCount > 0" class="active-filters">
            <span
              v-for="f in activeFiltersList"
              :key="`${f.key}-${f.value}`"
              class="filter-tag"
            >
              {{ f.value }}
              <X
                class="filter-tag-remove"
                @click="removeFilter(f.key, f.rawValue || f.value)"
              />
            </span>
          </div>

          <!-- Results Info -->
          <div class="results-info">
            <span>
              {{ t('common.showing') }} {{ products.length }} {{ t('common.of') }} {{ meta.total }} {{ t('common.items') }}
            </span>
          </div>

          <!-- Products Grid -->
          <div v-if="loading && products.length === 0" class="loading-state">
            <Loader2 class="spinner" />
            <span>{{ t('common.loading') }}</span>
          </div>

          <div v-else-if="products.length === 0" class="empty-state">
            <p>{{ t('common.noResults') }}</p>
            <button class="btn btn-outline" @click="clearAllFilters">
              {{ t('product.filters.clearAll') }}
            </button>
          </div>

          <div v-else class="products-grid">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
            />
          </div>

          <!-- Infinite Scroll Sentinel -->
          <div v-if="hasMore" ref="sentinelRef" class="infinite-scroll-sentinel">
            <div v-if="loadingMore" class="loading-more">
              <Loader2 class="spinner" />
              <span>{{ t('common.loading') }}</span>
            </div>
          </div>

          <!-- All Loaded -->
          <div v-else-if="products.length > 0" class="all-loaded">
            <span>{{ t('common.allLoaded', { total: meta.total }) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.marketplace {
  padding: var(--space-8) 0 var(--space-16);
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-6);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);

  &:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
  }

  .search-icon {
    width: 20px;
    height: 20px;
    color: var(--text-muted);
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-base);

    &:focus { outline: none; }
    &::placeholder { color: var(--text-muted); }
  }
}

.marketplace-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-8);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.filter-sidebar {
  @media (max-width: 1024px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 300px;
    z-index: var(--z-modal);
    background: var(--bg-dark);
    padding: var(--space-6);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;

    &.is-open {
      transform: translateX(0);
    }
  }
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);

  h3 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 600;

    .icon {
      width: 20px;
      height: 20px;
    }
  }
}

.filter-close {
  display: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-dark);
    color: var(--text-primary);
  }

  @media (max-width: 1024px) {
    display: flex;
  }
}

.filter-section {
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border);

  &:last-child { border-bottom: none; }
}

.filter-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;

  &:hover {
    opacity: 0.8;
  }
}

.filter-chevron {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
  opacity: 0.6;

  &.collapsed {
    transform: rotate(-90deg);
  }
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  input { display: none; }

  &:hover { background: rgba(102, 126, 234, 0.05); }
  &.active { background: rgba(102, 126, 234, 0.1); }

  .checkmark,
  .radiomark {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    position: relative;
  }

  .radiomark {
    border-radius: var(--radius-full);
  }

  input:checked + .checkmark,
  input:checked + .radiomark {
    background: var(--primary);
    border-color: var(--primary);
  }

  input:checked + .checkmark::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }

  input:checked + .radiomark::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: white;
    border-radius: var(--radius-full);
  }
}

.filter-rarity {
  &.rarity-ssr { color: var(--rarity-ssr); }
  &.rarity-sr { color: var(--rarity-sr); }
  &.rarity-r { color: var(--rarity-r); }
  &.rarity-n { color: var(--rarity-n); }
}

.price-range {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.price-input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.price-separator {
  color: var(--text-muted);
}

.products-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.filter-toggle {
  display: none;

  @media (max-width: 1024px) {
    display: flex;
  }

  .filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
  }
}

.sort-dropdown {
  position: relative;
}

.sort-select {
  appearance: none;
  padding: var(--space-2) var(--space-8) var(--space-2) var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover, &:focus {
    border-color: var(--primary);
    outline: none;
  }
}

.sort-icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--primary);
}

.filter-tag-remove {
  width: 14px;
  height: 14px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--transition-fast);

  &:hover { opacity: 1; }
}

.results-info {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-6);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  gap: var(--space-4);
  color: var(--text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6);

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}

.infinite-scroll-sentinel {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-8) 0;
  min-height: 80px;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.all-loaded {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
