import { api } from './api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const adminService = {
  // Transactions & Financials
  getTransactions: async (): Promise<ApiResponse<{ all: any[]; payouts: any[]; refunds: any[]; floatingCodCash?: number }>> => {
    return api.get('/admin/transactions');
  },

  processPayouts: async (transactionId?: string): Promise<ApiResponse> => {
    return api.post('/admin/transactions/process-payouts', { transactionId });
  },

  // Complaints & Disputes
  getComplaints: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/admin/complaints');
  },

  updateComplaintStatus: async (id: string, status: string): Promise<ApiResponse> => {
    return api.patch(`/admin/complaints/${id}/status`, { status });
  },

  // Live Orders
  getLiveOrders: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/admin/orders');
  },

  // Food Items / Menu Items Approval
  getFoodItems: async (params?: { status?: string }): Promise<ApiResponse<any[]>> => {
    const q = params?.status && params.status !== 'all' ? `?status=${params.status}` : '';
    return api.get(`/admin/food-items${q}`);
  },

  updateFoodItemStatus: async (
    id: string,
    status: 'Approved' | 'Rejected' | 'Review_pending',
    stallId?: string
  ): Promise<ApiResponse<{ id: string; status: string }>> => {
    return api.patch(`/admin/food-items/${id}/status`, { status, stallId });
  },

  // Admin Dashboard Counts (Approvals, Live Orders, Complaints)
  getAdminCounts: async (): Promise<ApiResponse<{
    approvals: number;
    pendingKyc: number;
    pendingFoodItems: number;
    orders: number;
    complaints: number;
  }>> => {
    return api.get('/admin/counts');
  },

  // Admin Platform Overview Stats (Users, Revenue, 7-Day Chart, Recent Orders)
  getOverviewStats: async (): Promise<ApiResponse<{
    customers: number;
    vendors: number;
    riders: number;
    admins: number;
    totalUsers: number;
    totalOrders: number;
    liveOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    pendingApprovals: number;
    revenueChart: { name: string; revenue: number }[];
    recentOrders: any[];
  }>> => {
    return api.get('/admin/overview');
  },
};

export default adminService;
