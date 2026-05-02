<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { cartApi } from '@/api/cart'
import { ordersApi } from '@/api/orders'
import { Loader2, Plus, Minus, Trash2, ShoppingCart, Receipt, ImageIcon } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

interface CartItem {
  id: string
  product: any
  quantity: number
  createdAt: string
}

const cartItems = ref<CartItem[]>([])
const loading = ref(true)
const processing = ref(false)
const receiptUploadLoading = ref<string | null>(null)
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')

const totalAmount = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity
  }, 0)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const getProductImage = (item: CartItem) => {
  if (item.product?.images) {
    if (Array.isArray(item.product.images)) {
      return item.product.images[0] || ''
    }
    try {
      const images = JSON.parse(item.product.images)
      return images[0] || ''
    } catch {
      return item.product.images || ''
    }
  }
  return ''
}

const isOutOfStock = (item: CartItem) => {
  return item.product?.quantity === 0
}

const loadCart = async () => {
  loading.value = true
  try {
    const response = await cartApi.getCart()
    cartItems.value = response.data || []
  } catch (error) {
    console.error('Failed to load cart:', error)
  } finally {
    loading.value = false
  }
}

const updateQuantity = async (item: CartItem, newQuantity: number) => {
  if (newQuantity < 1) return
  if (isOutOfStock(item)) return

  // Check stock limit
  const maxStock = item.product?.quantity ?? 0
  if (newQuantity > maxStock) {
    alert(`庫存不足！當前最多只能購買 ${maxStock} 件`)
    return
  }

  processing.value = true
  try {
    await cartApi.updateItem(item.id, newQuantity)
    await loadCart()
  } catch (error: any) {
    console.error('Failed to update quantity:', error)
    const msg = error?.response?.data?.message || error?.message || ''
    alert(msg || '修改數量失敗')
  } finally {
    processing.value = false
  }
}

const removeItem = async (itemId: string) => {
  if (!confirm('确定要从购物车移除这件商品吗？')) return
  
  processing.value = true
  try {
    await cartApi.removeItem(itemId)
    cartItems.value = cartItems.value.filter(i => i.id !== itemId)
  } catch (error) {
    console.error('Failed to remove item:', error)
    alert('移除失敗，請重試')
  } finally {
    processing.value = false
  }
}

const handleCheckout = async () => {
  if (cartItems.value.length === 0) return
  
  processing.value = true
  try {
    // Create orders for each cart item
    for (const item of cartItems.value) {
      if (item.product?.quantity === 0) {
        alert(`商品「${item.product.titleZh || item.product.titleEn}」已售罄，請先移除`)
        processing.value = false
        return
      }
      
      const orderData = {
        productId: item.product.id,
        type: 'direct_purchase' as const,
        quantity: item.quantity,
        totalPrice: item.product.price * item.quantity,
      }
      await ordersApi.createOrder(orderData)
    }
    
    // Clear cart after successful checkout
    await cartApi.clearCart()
    cartItems.value = []
    
    alert('下單成功！即將跳轉到訂單頁面...')
    router.push('/user/orders')
  } catch (error: any) {
    console.error('Checkout failed:', error)
    alert(error?.response?.data?.message || '結算失敗，請重試')
  } finally {
    processing.value = false
  }
}

const handleUploadReceipt = async (orderId: string, file: File) => {
  receiptUploadLoading.value = orderId
  try {
    await cartApi.uploadTransferReceipt(orderId, file)
    alert('上傳成功！')
    await loadCart()
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上傳失敗，請重試')
  } finally {
    receiptUploadLoading.value = null
  }
}

const triggerReceiptUpload = (orderId: string) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files?.[0]) {
      handleUploadReceipt(orderId, target.files[0])
    }
  }
  input.click()
}

const viewReceipt = (url: string) => {
  receiptImageUrl.value = url
  showReceiptModal.value = true
}

onMounted(() => {
  loadCart()
})
</script>

<template>
  <div class="cart-page">
    <div class="page-header">
      <h1 class="page-title">我的购物车</h1>
      <span class="item-count" v-if="cartItems.length > 0">
        ({{ cartItems.length }} 件商品)
      </span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- Empty Cart -->
    <div v-else-if="cartItems.length === 0" class="empty-cart">
      <div class="empty-icon">🛒</div>
      <h3>购物车是空的</h3>
      <p>快去挑选心仪的卡牌吧！</p>
      <router-link to="/marketplace" class="btn-primary">
        去逛逛
      </router-link>
    </div>

    <!-- Cart Items -->
    <div v-else class="cart-content">
      <div class="cart-items">
        <div v-for="item in cartItems" :key="item.id" class="cart-item">
          <div class="item-image">
            <img 
              :src="getProductImage(item) || '/placeholder-card.png'" 
              :alt="item.product?.titleEn" 
            />
            <div v-if="isOutOfStock(item)" class="out-of-stock-badge">
              Out of Stock
            </div>
          </div>

          <div class="item-info">
            <h3 class="item-title">
              {{ item.product?.titleZh || item.product?.titleEn }}
            </h3>
            <p class="item-price">{{ formatPrice(item.product?.price || 0) }}</p>
          </div>

          <div class="item-quantity">
            <button 
              class="qty-btn" 
              @click="updateQuantity(item, item.quantity - 1)"
              :disabled="item.quantity <= 1 || processing"
            >
              <Minus :size="14" />
            </button>
            <span class="qty-value">{{ item.quantity }}</span>
            <button 
              class="qty-btn" 
              @click="updateQuantity(item, item.quantity + 1)"
              :disabled="processing || isOutOfStock(item) || item.quantity >= (item.product?.quantity ?? 0)"
            >
              <Plus :size="14" />
            </button>
          </div>

          <div class="item-subtotal">
            <span class="subtotal-label">小计</span>
            <span class="subtotal-value">
              {{ formatPrice((item.product?.price || 0) * item.quantity) }}
            </span>
          </div>

          <button 
            class="btn-remove" 
            @click="removeItem(item.id)"
            :disabled="processing"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="order-summary">
        <div class="summary-row total">
          <span>商品总价</span>
          <span class="total-amount">{{ formatPrice(totalAmount) }}</span>
        </div>
        
        <button 
          class="btn-checkout" 
          @click="handleCheckout"
          :disabled="processing || cartItems.some(isOutOfStock)"
        >
          <Loader2 v-if="processing" class="animate-spin" />
          {{ processing ? '处理中...' : '结算' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.item-count {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.loading-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-muted);
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

.empty-cart {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
}

.empty-cart h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-cart p {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

.cart-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.cart-items {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.cart-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-elevated);
  position: relative;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.out-of-stock-badge {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--text-xs);
  font-weight: 700;
}

.item-info {
  flex: 1;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.item-price {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.qty-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qty-value {
  min-width: 32px;
  text-align: center;
  font-weight: 600;
}

.item-subtotal {
  text-align: right;
  min-width: 100px;
}

.subtotal-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.subtotal-value {
  font-family: var(--font-num);
  font-weight: 700;
  color: var(--primary);
}

.btn-remove {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-remove:hover {
  background: var(--danger);
  color: white;
}

.order-summary {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.summary-row.total {
  margin-bottom: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.total-amount {
  font-family: var(--font-num);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--primary);
}

.btn-checkout {
  width: 100%;
  padding: var(--space-4);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}

.btn-checkout:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-checkout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
