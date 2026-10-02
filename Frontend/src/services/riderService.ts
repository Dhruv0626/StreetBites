import { apiRequest } from "./api";

export interface RiderStats {
  riderId: string;
  name: string;
  isOnline: boolean;
  deliveryRangeKm?: number;
  autoAccept?: boolean;
  pushNotifications?: boolean;
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
  expiresAt?: string;
  stalls: number;
  items: number;
  distance: string;
  distanceKm?: number;
  cluster: string;
  drop: string;
  payout: string;
  totalAmount: number;
  paymentMethod: string;
  status?: string;
  prepTimeMinutes?: number;
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
  collectedCheckpoints?: number[];
  checkpoints: {
    type: "pickup" | "drop";
    id: string;
    title: string;
    desc: string;
    dist: string;
    amount: string;
    position: [number, number];
    isReady?: boolean;
    isCollected?: boolean;
    status?: string;
    items?: any[];
    stallName?: string;
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

  // Toggle online / offline duty status
  toggleOnlineStatus: async (
    isOnline?: boolean,
    params?: { riderId?: string; email?: string; lat?: number; lng?: number }
  ) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{
      riderId: string;
      isOnline: boolean;
      deliveryRangeKm: number;
      coordinates?: [number, number];
    }>(`/rider/toggle-online${qs}`, {
      method: "PUT",
      body: JSON.stringify({
        isOnline,
        lat: params?.lat,
        lng: params?.lng,
      }),
    });
  },

  // Update rider settings (delivery radius range, auto-accept, push notifications)
  updateSettings: async (
    settings: {
      deliveryRangeKm?: number;
      autoAccept?: boolean;
      pushNotifications?: boolean;
      lat?: number;
      lng?: number;
    },
    params?: { riderId?: string; email?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{
      riderId: string;
      isOnline: boolean;
      deliveryRangeKm: number;
      autoAccept: boolean;
      pushNotifications: boolean;
    }>(`/rider/settings${qs}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  // Get live orders available in queue (Online riders within configured radius only)
  getQueue: async (params?: {
    riderId?: string;
    email?: string;
    lat?: number;
    lng?: number;
    range?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    if (params?.lat !== undefined) query.append("lat", String(params.lat));
    if (params?.lng !== undefined) query.append("lng", String(params.lng));
    if (params?.range !== undefined) query.append("range", String(params.range));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<QueueOrder[]>(`/rider/queue${qs}`);
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

  // Decline / Skip an order from queue (Immediately forwards to next available rider)
  declineOrder: async (orderId: string, params?: { riderId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<any>(`/rider/orders/${orderId}/decline${qs}`, {
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

  // Mark checkpoint collected / advance route
  collectCheckpoint: async (
    orderId: string,
    checkpointIndex: number,
    totalCheckpoints: number,
    params?: { riderId?: string; email?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ message: string; orderStatus: string }>(
      `/rider/orders/${orderId}/collect-checkpoint${qs}`,
      {
        method: "POST",
        body: JSON.stringify({ checkpointIndex, totalCheckpoints }),
      }
    );
  },

  // Mark Rider Arrived at Doorstep
  markAtDoor: async (
    orderId: string,
    params?: { riderId?: string; email?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ message: string; orderStatus: string; riderAtDoor: boolean }>(
      `/rider/orders/${orderId}/at-door${qs}`,
      {
        method: "POST",
      }
    );
  },

  // Verify OTP and Mark Order Delivered
  verifyOtpAndComplete: async (
    orderId: string,
    otp: string,
    params?: { riderId?: string; email?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.riderId) query.append("riderId", params.riderId);
    if (params?.email) query.append("email", params.email);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ message: string; data: any }>(
      `/rider/orders/${orderId}/verify-otp${qs}`,
      {
        method: "POST",
        body: JSON.stringify({ otp }),
      }
    );
  },
};

export default riderService;
