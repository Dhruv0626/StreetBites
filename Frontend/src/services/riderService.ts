import { apiRequest } from "./api";

export interface RiderStats {
  riderId: string;
  name: string;
  isOnline: boolean;
  todayEarnings: number;
  completedTripsCount: number;
  timeOnline: string;
  currentCodDebt: number;
  cashLimit?: number;
  totalWeekEarnings: number;
  chartData: { name: string; earnings: number }[];
  breakdown: {
    baseFare: number;
    distancePay: number;
    bonusPay: number;
    total: number;
  };
  codTransactions: {
    id: string;
    type: "collection" | "settlement";
    amount: string;
    order?: string;
    time: string;
    status: "pending" | "completed";
  }[];
  recentTrips: {
    id: string;
    time: string;
    stalls: number;
    distance: string;
    payout: string;
    rawPayout?: number;
  }[];
}

export interface QueueOrder {
  id: string;
  rawId: string;
  timeLeft: number;
  stalls: number;
  items: number;
  distance: string;
  cluster: string;
  drop: string;
  payout: string;
  totalAmount: number;
  paymentMethod: string;
}

export interface ActiveRouteData {
  orderId: string;
  rawId: string;
  status: string;
  deliveryOtp: string;
  paymentMethod: string;
  totalAmount: number;
  riderEarnedFee: number;
  codAmountHeld: number;
  checkpoints: {
    type: "pickup" | "drop";
    id: string;
    title: string;
    desc: string;
    dist: string;
    amount: string;
    position: [number, number];
  }[];
}

export interface RiderHistoryItem {
  id: string;
  rawId: string;
  time: string;
  stalls: number;
  distance: string;
  payout: string;
  status: string;
}

export const riderService = {
  // Get live stats, earnings, debt & recent trips
  getStats: async (params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<RiderStats>(`/rider/stats${qs}`);
  },

  // Get live orders available in queue
  getQueue: async () => {
    return apiRequest<QueueOrder[]>("/rider/queue");
  },

  // Accept an order from queue
  acceptOrder: async (orderId: string, params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<any>(`/rider/orders/${orderId}/accept${qs}`, {
      method: "PUT",
    });
  },

  // Get currently active delivery route
  getActiveRoute: async (params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ActiveRouteData | null>(`/rider/active-route${qs}`);
  },

  // Get delivery history
  getHistory: async (params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<RiderHistoryItem[]>(`/rider/history${qs}`);
  },

  // Settle COD Debt
  settleDebt: async (params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ settledAmount: number; remainingDebt: number }>(
      `/rider/settle-debt${qs}`,
      { method: "POST" }
    );
  },
};

export default riderService;
