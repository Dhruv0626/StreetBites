import { apiRequest } from "./api";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone_number?: string;
  role: "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";
  verification_status?: string;
  account_status?: string;
  wallet_balance?: number;
  avatar_url?: string;
  favorite_stalls?: any[];
}

export interface AuthResponseData {
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role?: string;
  secretKey?: string;
  driving_license_no?: string;
  vehicle_rc_no?: string;
  vehicle_model?: string;
  upi_id?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
}

export interface LoginPayload {
  email?: string;
  phone_number?: string;
  password: string;
  secretKey?: string;
}

export const authService = {
  // Register user account
  async register(data: RegisterPayload) {
    return apiRequest<AuthResponseData>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: false,
    });
  },

  // Log in with email/phone & password
  async login(credentials: LoginPayload) {
    return apiRequest<AuthResponseData>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      requiresAuth: false,
    });
  },

  // Google Sign-In / Sign-Up
  async googleAuth(payload: { token?: string; id_token?: string; credential?: string; code?: string; action?: 'signin' | 'signup' }) {
    return apiRequest<AuthResponseData>("/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // Get Google OAuth consent URL with action ('signin' | 'signup') and role ('customer' | 'vendor' | 'rider')
  async getGoogleAuthUrl(action: 'signin' | 'signup' = 'signin', role: string = 'customer') {
    return apiRequest<{ url: string }>(`/auth/google/url?action=${action}&role=${encodeURIComponent(role)}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  // Facebook Sign-In / Sign-Up
  async facebookAuth(payload: { token?: string; code?: string; action?: 'signin' | 'signup' }) {
    return apiRequest<AuthResponseData>("/auth/facebook", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // Get Facebook OAuth URL with action ('signin' | 'signup') and role ('customer' | 'vendor' | 'rider')
  async getFacebookAuthUrl(action: 'signin' | 'signup' = 'signin', role: string = 'customer') {
    return apiRequest<{ url: string }>(`/auth/facebook/url?action=${action}&role=${encodeURIComponent(role)}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  // Log out (clears server cookies)
  async logout() {
    return apiRequest("/auth/logout", {
      method: "POST",
      requiresAuth: true,
    });
  },

  // Get current logged-in user profile
  async getProfile() {
    return apiRequest<{ user: User }>("/auth/profile", {
      method: "GET",
      requiresAuth: true,
    });
  },

  // Update current user profile (e.g. phone number, name)
  async updateProfile(data: { name?: string; phone_number?: string }) {
    return apiRequest<{ user: User }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // Get all users by role with search (Admin)
  async getAllUsers(params?: { role?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'all') query.append('role', params.role);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<any[]>(`/auth/users${queryString}`, {
      method: "GET",
      requiresAuth: true,
    });
  },

  // Update user status (Active / Suspended) (Admin)
  async updateUserStatus(id: string, status: string) {
    return apiRequest<{ id: string; status: string }>(`/auth/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },

  // Delete user account (Admin)
  async deleteUser(id: string) {
    return apiRequest<{ id: string }>(`/auth/users/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    });
  },
};

export default authService;
