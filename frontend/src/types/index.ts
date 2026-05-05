// User types
export type UserRole = 'user' | 'seller' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface User {
  id: string
  email: string
  nickname: string
  avatar?: string
  role: UserRole
  wechatOpenid?: string
  emailVerified: boolean
  wechatNotifications: boolean
  emailNotifications: boolean
  status: UserStatus
  createdAt: string
  pickupInfo?: string
  pickupQrCode?: string
}

// Tag types
export interface Tag {
  id: number
  name: string
  slug?: string
  color?: string
  sortOrder: number
}

// Product types
export type ProductCategory = 'pokemon' | 'yugioh' | 'mtg' | 'ultraman' | 'onepiece' | 'other'
export type ProductRarity = 'SSR' | 'SR' | 'R' | 'N'
export type ProductCondition = 'mint' | 'near_mint' | 'excellent' | 'good' | 'fair'
export type ProductStatus = 'draft' | 'active' | 'sold' | 'removed'
export type ListingType = 'sale' | 'auction' | 'both'

export interface Product {
  id: string
  sellerId: string
  seller?: User
  titleEn: string
  titleZh: string
  descriptionEn?: string
  descriptionZh?: string
  category: ProductCategory
  brand: string
  series: string
  rarity: ProductRarity
  condition: ProductCondition
  price: number
  quantity?: number
  currency: string
  images: string[]
  tags?: Tag[]
  status: ProductStatus
  hasAuction: boolean
  createdAt: string
  updatedAt: string
}

// Auction types
export type AuctionStatus = 'pending' | 'active' | 'ended' | 'cancelled'

export interface Auction {
  id: string
  productId: string
  product?: Product
  sellerId: string
  seller?: User
  startingPrice: number
  currentPrice: number
  reservePrice?: number
  buyNowPrice?: number
  bidIncrement: number
  startTime: string
  endTime: string
  status: AuctionStatus
  winnerId?: string
  winner?: User
  bidCount: number
  bids?: Bid[]
  createdAt: string
  updatedAt: string
}

export interface Bid {
  id: string
  auctionId: string
  userId: string
  user?: User
  amount: number
  createdAt: string
}

// Order types
export type OrderType = 'purchase' | 'auction'
export type OrderStatus = 'pending_paid' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'confirmed'

export interface Order {
  id: string
  orderNumber: string
  buyerId: string
  buyer?: User
  sellerId: string
  seller?: User
  type: OrderType
  productId: string
  product?: Product
  auctionId?: string
  auction?: Auction
  amount: number
  status: OrderStatus
  shippingAddress: ShippingAddress
  transferReceipt?: string
  transferTime?: string
  paidAt?: string
  shippedAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
}

export interface ShippingAddress {
  name: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
}

// Filter types
export interface ProductFilters {
  search?: string
  category?: ProductCategory[]
  brand?: string[]
  series?: string[]
  rarity?: ProductRarity[]
  condition?: ProductCondition[]
  priceMin?: number
  priceMax?: number
  listingType?: 'all' | 'sale' | 'auction'
  sortBy?: 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'ending_soon'
  tags?: string[]
  page?: number
  limit?: number
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductSearchResponse {
  data: Product[]
  meta: PaginationMeta
  filters: {
    categories: FilterOption[]
    brands: FilterOption[]
    series: FilterOption[]
    rarities: FilterOption[]
    conditions: FilterOption[]
    priceRange: { min: number; max: number }
  }
}

export interface FilterOption {
  value: string
  label: string
  labelEn: string
  count?: number
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}
