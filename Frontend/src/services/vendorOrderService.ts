import { apiRequest } from './api';

export interface VendorOrderItem {
  subOrderId?: string;
  itemId?: string;
  name: string;
  price: number;
  quantity?: number;
  status?: string;
  prepTimeMinutes?: number;
}

export interface VendorOrder {
  id: string;
  orderId: string;
  orderNumber?: string;
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
  prepTimeMinutes?: number;
}

export interface VendorOrderMetrics {
  liveCount: number;
  avgPrep: string;
  rating: string;
  todayPayout: number;
}

export interface VendorKPIItem {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}

export interface VendorChartDataItem {
  name: string;
  revenue: number;
}

export interface VendorPopularItem {
  name: string;
  sales: number;
  revenue: string;
  image?: string;
}

export interface VendorAnalyticsData {
  kpis: VendorKPIItem[];
  chartData: VendorChartDataItem[];
  popularItems: VendorPopularItem[];
  totalPeriodRevenue: number;
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

  // 2. Update order preparation/ready status with optional manual ETA
  updateOrderStatus: async (
    orderId: string,
    status: 'Preparing' | 'Completed' | 'Cancelled',
    prepTimeMinutes?: number
  ) => {
    return apiRequest<{ message: string; estimated_prep_time_minutes?: number }>(
      `/vendor/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, prepTimeMinutes }),
        requiresAuth: true,
      }
    );
  },

  // 3. Reject order with reason (triggers auto item stockout and customer refund)
  rejectOrder: async (orderId: string, reason: string, itemOutStock?: boolean) => {
    return apiRequest<{
      message: string;
      orderStatus?: string;
      refundedAmount?: number;
      consecutiveMissedOrders?: number;
      isStallOffline?: boolean;
    }>(`/vendor/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, itemOutStock }),
      requiresAuth: true,
    });
  },

  // 4. Fast metrics for navbar badge
  getMetrics: async () => {
    return apiRequest<{ liveCount: number }>('/vendor/orders/metrics', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // 5. Real analytics data with time filter
  getAnalytics: async (timeFilter: string = 'This Week') => {
    return apiRequest<VendorAnalyticsData>(
      `/vendor/orders/analytics?timeFilter=${encodeURIComponent(timeFilter)}`,
      {
        method: 'GET',
        requiresAuth: true,
      }
    );
  },

  // 6. Request vendor payout withdrawal
  withdrawPayout: async (amount?: number) => {
    return apiRequest<{
      withdrawnAmount: number;
      remainingBalance: number;
      transactionId: string;
    }>('/vendor/orders/payouts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
      requiresAuth: true,
    });
  },

  // 7. Get vendor settlement and payout transaction history
  getPayoutHistory: async () => {
    return apiRequest<{
      walletBalance: number;
      transactions: Array<{
        id: string;
        date: string;
        amount: string;
        status: 'pending' | 'completed' | 'failed';
        type: string;
      }>;
    }>('/vendor/orders/payouts', {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

export default vendorOrderService;
