import { apiRequest } from "./api";

export interface VendorMenuItem {
  id: string;
  _id?: string;
  name: string;
  description: string;
  base_price: number;
  price: number;
  category: string;
  image_url: string;
  imageUrl?: string;
  is_available: boolean;
  available: boolean;
  status: "Review_pending" | "Approved" | "Rejected";
  orders?: number;
}

export interface VendorMenuResponse {
  stall: {
    id: string;
    name: string;
    category: string;
    rating: number;
    image_url: string;
    is_accepting_orders: boolean;
    cluster?: any;
  } | null;
  categories: string[];
  menuItems: VendorMenuItem[];
  stats: {
    totalItems: number;
    availableItems: number;
    pendingReviews: number;
  };
}

export const vendorMenuService = {
  // 1. Fetch live vendor menu from database
  getVendorMenu: async () => {
    return apiRequest<VendorMenuResponse>("/vendor/menu", {
      method: "GET",
      requiresAuth: true,
    });
  },

  // 2. Add a new variety of food with image to stall's menu_items array
  addMenuItem: async (data: {
    name: string;
    description?: string;
    base_price: number;
    price?: number;
    image_url?: string;
    imageUrl?: string;
    category?: string;
    is_available?: boolean;
  }) => {
    return apiRequest<VendorMenuItem>("/vendor/menu/item", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // 2b. Update an existing food item variety
  updateMenuItem: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      base_price?: number;
      price?: number;
      image_url?: string;
      imageUrl?: string;
      category?: string;
      is_available?: boolean;
    }
  ) => {
    return apiRequest<VendorMenuItem>(`/vendor/menu/item/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // 3. Add a new food item category in master FoodItem list
  addCategory: async (data: { name: string; image_url?: string; imageUrl?: string }) => {
    return apiRequest<{ id: string; name: string; image_url: string }>("/vendor/menu/category", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // 4. Toggle item in-stock / unavailable status
  toggleAvailability: async (id: string) => {
    return apiRequest<{ id: string; is_available: boolean; available: boolean }>(
      `/vendor/menu/item/${id}/availability`,
      {
        method: "PATCH",
        requiresAuth: true,
      }
    );
  },

  // 5. Delete menu item
  deleteMenuItem: async (id: string) => {
    return apiRequest<{ message: string }>(`/vendor/menu/item/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
  },
};

export default vendorMenuService;
