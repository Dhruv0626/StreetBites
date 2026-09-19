import { apiRequest } from "./api";

export interface CartServerItem {
  id: string;
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stallId?: string;
  stallName?: string;
  vendorId: string;
  vendorName: string;
  vendorCategory?: string;
  khauGalliId: string;
  khauGalliName: string;
}

export interface CartServerResponse {
  items: CartServerItem[];
  khauGalli: {
    id: string;
    name: string;
    city?: string;
  } | null;
  stallsCount: number;
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
}

export interface CartConflictResponse {
  success: false;
  code: "KHAU_GALLI_CONFLICT";
  message: string;
  currentKhauGalli: { id: string; name: string };
  newKhauGalli: { id: string; name: string };
}

export const cartService = {
  // GET: Retrieve user's current multi-stall cart
  getCart: async (userId?: string) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiRequest<CartServerResponse>(`/cart${query}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  // POST: Add item to cart with single Khau Galli validation
  addToCart: async (payload: {
    stallId: string;
    itemId: string;
    name: string;
    price: number;
    image?: string;
    stallName?: string;
    vendorName?: string;
    khauGalliId?: string;
    khauGalliName?: string;
    quantity?: number;
    replaceCart?: boolean;
    userId?: string;
  }) => {
    return apiRequest<CartServerResponse>("/cart/add", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // PUT: Update item quantity
  updateItem: async (payload: {
    stallId: string;
    itemId: string;
    quantity: number;
    userId?: string;
  }) => {
    return apiRequest<CartServerResponse>("/cart/item", {
      method: "PUT",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // DELETE: Remove item
  removeItem: async (stallId: string, itemId: string, removeAll = false, userId?: string) => {
    const query = [
      removeAll ? "removeAll=true" : "",
      userId ? `userId=${encodeURIComponent(userId)}` : "",
    ]
      .filter(Boolean)
      .join("&");

    const endpoint = `/cart/item/${encodeURIComponent(stallId)}/${encodeURIComponent(itemId)}${
      query ? `?${query}` : ""
    }`;

    return apiRequest<CartServerResponse>(endpoint, {
      method: "DELETE",
      requiresAuth: false,
    });
  },

  // DELETE: Clear entire cart
  clearCart: async (userId?: string) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiRequest<CartServerResponse>(`/cart/clear${query}`, {
      method: "DELETE",
      requiresAuth: false,
    });
  },
};

export default cartService;
