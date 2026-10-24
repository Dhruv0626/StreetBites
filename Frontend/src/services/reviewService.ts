import { apiRequest } from './api';

export interface StallReviewItem {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  createdAt: string;
}

export interface StallReviewsResponse {
  stallId: string;
  stallName: string;
  averageRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  reviews: StallReviewItem[];
}

export interface SubmitReviewPayload {
  order_id: string;
  stall_id?: string;
  rating?: number;
  comment?: string;
  reviews?: Array<{
    stall_id: string;
    rating: number;
    comment?: string;
  }>;
}

export const reviewService = {
  // Submit rating and review for order
  submitReview: async (payload: SubmitReviewPayload) => {
    return apiRequest<{
      success: boolean;
      message: string;
      reviews?: any[];
      updatedStalls?: any[];
    }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Get submitted reviews for a specific order
  getOrderReviews: async (orderId: string) => {
    return apiRequest<any[]>(`/reviews/order/${orderId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Get public reviews and ratings for a stall
  getStallReviews: async (stallId: string) => {
    return apiRequest<StallReviewsResponse>(`/reviews/stall/${stallId}`, {
      method: 'GET',
      requiresAuth: false,
    });
  },

  // Submit a customer complaint / issue for an order
  submitComplaint: async (payload: {
    order_id?: string;
    stall_id?: string;
    issue_type: string;
    comment: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>('/reviews/complaint', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};

export default reviewService;
