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

  // Update auction (seller only)
  updateAuction(id: string, data: any) {
    return api.patch<Auction>(`/auctions/${id}`, data)
  },

  // Cancel auction (seller only)
  cancelAuction(id: string) {
    return api.post(`/auctions/${id}/cancel`)
  },

  // Place bid
  placeBid(auctionId: string, amount: number) {
    return api.post<Bid>(`/auctions/${auctionId}/bids`, { amount })
  },

  // Get auction bids
  getBids(auctionId: string) {
    return api.get<Bid[]>(`/auctions/${auctionId}/bids`)
  },

  // Get my bids
  getMyBids() {
    return api.get<Bid[]>('/auctions/my-bids')
  }
}
