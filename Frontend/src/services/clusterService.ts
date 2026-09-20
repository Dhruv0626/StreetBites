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
let ongoingRevalidation: Promise<{ success: boolean; data?: ClusterData[]; message?: string }> | null = null;

// SWR Event Subscribers (active components listen for live cache updates)
const listeners = new Set<(data: ClusterData[]) => void>();

function notifyListeners(data: ClusterData[]) {
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.warn("Error in clusterService subscriber listener:", err);
    }
  });
}

export const clusterService = {
  // Get currently cached cluster data synchronously (0ms)
  getCachedClusters: (): ClusterData[] | null => {
    return cachedClustersData?.data || null;
  },

  // Subscribe to SWR live cache updates
  subscribe: (listener: (data: ClusterData[]) => void): (() => void) => {
    listeners.add(listener);
    if (cachedClustersData?.data) {
      listener(cachedClustersData.data);
    }
    return () => {
      listeners.delete(listener);
    };
  },

  // Clear the client-side cache
  clearCache: () => {
    cachedClustersData = null;
    lastClustersFetchTime = 0;
  },

  // Silent background revalidation: fetches fresh data from MongoDB and broadcasts to subscribers
  revalidate: async (): Promise<{ success: boolean; data?: ClusterData[]; message?: string }> => {
    if (ongoingRevalidation) {
      return ongoingRevalidation;
    }

    ongoingRevalidation = (async () => {
      try {
        const res = await apiRequest<ClusterData[]>("/clusters?fresh=true", {
          method: "GET",
          requiresAuth: false,
          headers: {
            "x-fresh": "true",
          },
        });

        if (res.success && res.data) {
          cachedClustersData = res;
          lastClustersFetchTime = Date.now();
          notifyListeners(res.data);
        }
        return res;
      } catch (err) {
        console.warn("Silent background revalidation error:", err);
        return cachedClustersData || { success: false, message: "Revalidation failed" };
      } finally {
        ongoingRevalidation = null;
      }
    })();

    return ongoingRevalidation;
  },

  // SWR Fetch: Returns cached data immediately (0ms) and triggers silent background revalidation
  getClusters: async (forceRefresh = false) => {
    const now = Date.now();

    // If cache is available and forceRefresh is false
    if (!forceRefresh && cachedClustersData && cachedClustersData.data) {
      // If cache is older than 5 seconds, trigger silent background revalidation
      if (now - lastClustersFetchTime > 5000) {
        clusterService.revalidate();
      }
      return cachedClustersData;
    }

    // If no cache or forced refresh, fetch and await fresh data
    return clusterService.revalidate();
  },

  // Fetch single cluster by ID
  getClusterById: async (id: string, fresh = false) => {
    const url = fresh ? `/clusters/${id}?fresh=true` : `/clusters/${id}`;
    return apiRequest<ClusterData>(url, {
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
    const res = await apiRequest<ClusterData>("/clusters", {
      method: "POST",
      body: JSON.stringify(data),
    });
    clusterService.revalidate();
    return res;
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
    const res = await apiRequest<ClusterData>(`/clusters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    clusterService.revalidate();
    return res;
  },

  // Delete cluster from MongoDB
  deleteCluster: async (id: string) => {
    clusterService.clearCache();
    const res = await apiRequest<{ message: string }>(`/clusters/${id}`, {
      method: "DELETE",
    });
    clusterService.revalidate();
    return res;
  },
};

// Automatic Window Focus & Visibility Revalidation (Auto-syncs when user returns to tab)
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    clusterService.revalidate();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      clusterService.revalidate();
    }
  });
}

export default clusterService;
