import { apiRequest, type ApiResponse } from "./api";

export interface OfferData {
  _id?: string;
  id?: string;
  stall_id?: string | null;
  title: string;
  description: string;
  discount_percentage: number;
  flat_discount_amount: number;
  min_order_amount: number;
  max_cap_amount: number;
  target_audience: "ALL" | "NEW_USERS" | "CLUSTER_SPECIFIC";
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const offersCache = new Map<string, { data: ApiResponse<OfferData[]>; timestamp: number }>();
const OFFERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const offerService = {
  clearCache: () => {
    offersCache.clear();
  },

  // Get all offers (with optional query filters and 5-minute RAM cache)
  getOffers: async (params?: { audience?: string; active?: boolean | string; search?: string; fresh?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.audience && params.audience !== "All") query.append("audience", params.audience);
    if (params?.active !== undefined) query.append("active", String(params.active));
    if (params?.search) query.append("search", params.search);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const cacheKey = queryString || "default";
    const now = Date.now();

    if (!params?.fresh) {
      const cached = offersCache.get(cacheKey);
      if (cached && now - cached.timestamp < OFFERS_CACHE_TTL) {
        return cached.data;
      }
    }

    const res = await apiRequest<OfferData[]>(`/offers${queryString}`, {
      method: "GET",
    });

    if (res.success) {
      offersCache.set(cacheKey, { data: res, timestamp: now });
    }

    return res;
  },

  // Get offer by ID
  getOfferById: async (id: string) => {
    return apiRequest<OfferData>(`/offers/${id}`, {
      method: "GET",
    });
  },

  // Create new offer
  createOffer: async (data: Partial<OfferData>) => {
    offersCache.clear();
    return apiRequest<OfferData>("/offers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update offer
  updateOffer: async (id: string, data: Partial<OfferData>) => {
    offersCache.clear();
    return apiRequest<OfferData>(`/offers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Toggle active status
  toggleOfferStatus: async (id: string) => {
    offersCache.clear();
    return apiRequest<OfferData>(`/offers/${id}/toggle`, {
      method: "PUT",
    });
  },

  // Delete offer
  deleteOffer: async (id: string) => {
    offersCache.clear();
    return apiRequest<{ id: string }>(`/offers/${id}`, {
      method: "DELETE",
    });
  },
};
