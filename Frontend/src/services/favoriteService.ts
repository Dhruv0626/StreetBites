import { apiRequest } from "./api";
import type { ClusterStall } from "./clusterService";

export interface FavoriteResponse {
  favorite_stall_ids?: string[];
  data: ClusterStall[];
  count?: number;
}

export const favoriteService = {
  // GET: Fetch all favorite stalls for user
  getFavorites: async (userId?: string) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiRequest<ClusterStall[]>(`/favorites${query}`, {
      method: "GET",
      requiresAuth: true,
    });
  },

  // POST: Add stall to favorites
  addFavorite: async (stallId: string, userId?: string) => {
    return apiRequest<{ stallId: string; favorite_stalls: string[] }>(`/favorites/${stallId}`, {
      method: "POST",
      body: JSON.stringify({ stallId, userId }),
      requiresAuth: true,
    });
  },

  // DELETE: Remove stall from favorites
  removeFavorite: async (stallId: string, userId?: string) => {
    return apiRequest<{ stallId: string; favorite_stalls: string[] }>(`/favorites/${stallId}`, {
      method: "DELETE",
      body: JSON.stringify({ stallId, userId }),
      requiresAuth: true,
    });
  },
};

export default favoriteService;
