import { apiRequest } from "./api";

export interface ClusterMenuItem {
  _id?: string;
  name: string;
  description?: string;
  base_price: number;
  price: number;
  food_item_id?: string | null;
  is_available: boolean;
  image_url: string;
  status: string;
}

export interface ClusterStall {
  _id?: string;
  id: string;
  vendor_id?: any;
  cluster_id?: any;
  name: string;
  stall_category: string;
  description?: string;
  since?: string;
  rating: number;
  image_url: string;
  open_till?: string;
  is_accepting_orders: boolean;
  last_opened_at?: string | Date | null;
  status: string;
  menu_items: ClusterMenuItem[];
}

export interface ClusterData {
  _id?: string;
  id: string;
  name: string;
  city: string;
  coordinates?: {
    type?: string;
    coordinates?: [number, number];
  };
  image_url: string;
  is_active?: boolean;
  stalls: ClusterStall[];
  revenue?: string;
}

// Client-Side In-Memory Cache for fast, instant navigation (0ms)
let cachedClustersData: { success: boolean; data?: ClusterData[]; message?: string } | null = null;
let lastClustersFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export const clusterService = {
  // Clear the client-side cache
  clearCache: () => {
    cachedClustersData = null;
    lastClustersFetchTime = 0;
  },

  // Fetch all clusters with populated stalls from MongoDB (with 60s memory caching)
  getClusters: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedClustersData && now - lastClustersFetchTime < CACHE_TTL_MS) {
      return cachedClustersData;
    }

    const res = await apiRequest<ClusterData[]>("/clusters", {
      method: "GET",
      requiresAuth: false,
    });

    if (res.success && res.data) {
      cachedClustersData = res;
      lastClustersFetchTime = now;
    }

    return res;
  },

  // Fetch single cluster by ID
  getClusterById: async (id: string) => {
    return apiRequest<ClusterData>(`/clusters/${id}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  // Create new cluster in MongoDB
  createCluster: async (data: {
    name: string;
    city: string;
    imageUrl?: string;
    coordinates?: { lat: number; lng: number };
  }) => {
    clusterService.clearCache();
    return apiRequest<ClusterData>("/clusters", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update existing cluster in MongoDB
  updateCluster: async (
    id: string,
    data: {
      name?: string;
      city?: string;
      imageUrl?: string;
      is_active?: boolean;
      coordinates?: { lat: number; lng: number };
    }
  ) => {
    clusterService.clearCache();
    return apiRequest<ClusterData>(`/clusters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete cluster from MongoDB
  deleteCluster: async (id: string) => {
    clusterService.clearCache();
    return apiRequest<{ message: string }>(`/clusters/${id}`, {
      method: "DELETE",
    });
  },
};

export default clusterService;
