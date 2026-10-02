import { apiRequest } from "./api";

export interface AppNotification {
  _id: string;
  id?: string;
  user_id: string;
  title: string;
  message: string;
  type: "ORDER" | "PAYOUT" | "DELIVERY" | "PROMO" | "SYSTEM";
  order_id?: string;
  amount?: number;
  is_read: boolean;
  createdAt: string;
}

export const notificationService = {
  // 1. Get user notifications
  getNotifications: async () => {
    return apiRequest<AppNotification[]>("/notifications", {
      method: "GET",
    });
  },

  // 2. Mark all as read
  markAllRead: async () => {
    return apiRequest<{ success: boolean; message: string }>("/notifications/mark-all-read", {
      method: "PUT",
    });
  },

  // 3. Mark single notification as read
  markSingleRead: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  // 4. Get unread count
  getUnreadCount: async () => {
    return apiRequest<{ count: number }>("/notifications/unread-count", {
      method: "GET",
    });
  },
};
