import api from '@/api'
import type { Auction, Bid, ProductFilters } from '@/types'

export const auctionApi = {
  // Get auctions with filters
  getAuctions(params: ProductFilters) {
    return api.get<{ data: Auction[]; meta: any }>('/auctions', { params })
  },

  // Get single auction
  getAuction(id: string) {
    return api.get<Auction>(`/auctions/${id}`)
  },

  // Create auction (seller only)
  createAuction(data: any) {
    return api.post<Auction>('/auctions', data)
  },

  // Cancel auction (seller only)
  cancelAuction(id: string) {
    return api.post(`/auctions/${id}/cancel`)
  },

  // End auction manually (seller only)
  endAuction(id: string) {
    return api.post(`/auctions/${id}/end`)
  },

  // Buy now (instant win at buyNowPrice)
  buyNow(id: string) {
    return api.post(`/auctions/${id}/buy-now`)
  },

  // Place bid
  placeBid(auctionId: string, amount: number) {
    return api.post<Bid>(`/auctions/${auctionId}/bids`, { amount })
  },

  // Get auction bids (via bids controller)
  getBids(auctionId: string) {
    return api.get<Bid[]>(`/bids/auction/${auctionId}`)
  },

  // Get my bids (via bids controller)
  getMyBids() {
    return api.get<Bid[]>('/bids/my')
  },

  // Get seller's auctions (with auth)
  getMyAuctions(params?: { page?: number; limit?: number }) {
    return api.get<{ data: Auction[]; meta: any }>('/auctions/seller/my', { params })
  }
}