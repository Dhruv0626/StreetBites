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

export const clusterService = {
  // Fetch all clusters with populated stalls from MongoDB
  getClusters: async () => {
    return apiRequest<ClusterData[]>("/clusters", {
      method: "GET",
      requiresAuth: false,
    });
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
    return apiRequest<ClusterData>(`/clusters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete cluster from MongoDB
  deleteCluster: async (id: string) => {
    return apiRequest<{ message: string }>(`/clusters/${id}`, {
      method: "DELETE",
    });
  },
};

export default clusterService;
