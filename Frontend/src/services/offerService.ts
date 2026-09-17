import { apiRequest } from "./api";

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

export const offerService = {
  // Get all offers (with optional query filters)
  getOffers: async (params?: { audience?: string; active?: boolean | string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.audience && params.audience !== "All") query.append("audience", params.audience);
    if (params?.active !== undefined) query.append("active", String(params.active));
    if (params?.search) query.append("search", params.search);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<OfferData[]>(`/offers${queryString}`, {
      method: "GET",
    });
  },

  // Get offer by ID
  getOfferById: async (id: string) => {
    return apiRequest<OfferData>(`/offers/${id}`, {
      method: "GET",
    });
  },

  // Create new offer
  createOffer: async (data: Partial<OfferData>) => {
    return apiRequest<OfferData>("/offers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update offer
  updateOffer: async (id: string, data: Partial<OfferData>) => {
    return apiRequest<OfferData>(`/offers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Toggle active status
  toggleOfferStatus: async (id: string) => {
    return apiRequest<OfferData>(`/offers/${id}/toggle`, {
      method: "PUT",
    });
  },

  // Delete offer
  deleteOffer: async (id: string) => {
    return apiRequest<{ id: string }>(`/offers/${id}`, {
      method: "DELETE",
    });
  },
};

export default offerService;
