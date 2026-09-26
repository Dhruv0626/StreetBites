import { apiRequest } from './api';

export interface VendorOrderItem {
  subOrderId?: string;
  itemId?: string;
  name: string;
  price: number;
  quantity?: number;
  status?: string;
}

export interface VendorOrder {
  id: string;
  orderId: string;
  status: 'New' | 'Preparing' | 'Completed' | 'Cancelled';
  customer: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  time: string;
  items: VendorOrderItem[];
  total: number;
  net: number;
  commission: number;
  createdAt: string;
}

export interface VendorOrderMetrics {
  liveCount: number;
  avgPrep: string;
  rating: string;
  todayPayout: number;
}

export const vendorOrderService = {
  // 1. Fetch live incoming and past orders (Sorted live orders first)
  getOrders: async () => {
    return apiRequest<{
      orders: VendorOrder[];
      metrics: VendorOrderMetrics;
      stall?: { id: string; name: string; is_accepting_orders: boolean };
    }>('/vendor/orders', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // 2. Update order preparation/ready status
  updateOrderStatus: async (orderId: string, status: 'Preparing' | 'Completed' | 'Cancelled') => {
    return apiRequest<{ message: string }>(`/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },

  // 3. Fast metrics for navbar badge
  getMetrics: async () => {
    return apiRequest<{ liveCount: number }>('/vendor/orders/metrics', {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
