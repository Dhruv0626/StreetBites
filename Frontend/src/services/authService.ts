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
  profile_image?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
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

  // Google OAuth Auth API
  async googleAuth(payload: { token?: string; id_token?: string; credential?: string; code?: string; action?: 'signin' | 'signup' }) {
    return apiRequest<AuthResponseData>("/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // Get Google OAuth Authorization URL
  async getGoogleAuthUrl(action: 'signin' | 'signup' = 'signin', role: string = 'customer') {
    return apiRequest<{ url: string }>(`/auth/google/url?action=${encodeURIComponent(action)}&role=${encodeURIComponent(role)}`, {
      method: "GET",
      requiresAuth: false,
    });
  },

  // Facebook OAuth Auth API
  async facebookAuth(payload: { token?: string; code?: string; action?: 'signin' | 'signup' }) {
    return apiRequest<AuthResponseData>("/auth/facebook", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // Get Facebook OAuth Authorization URL
  async getFacebookAuthUrl(action: 'signin' | 'signup' = 'signin', role: string = 'customer') {
    return apiRequest<{ url: string }>(`/auth/facebook/url?action=${encodeURIComponent(action)}&role=${encodeURIComponent(role)}`, {
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

  // Update current user profile (e.g. phone number, name, notifications)
  async updateProfile(data: { name?: string; phone_number?: string; push_notifications?: boolean; email_notifications?: boolean }) {
    return apiRequest<{ user: User }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  // Forgot password - request email reset code
  async forgotPassword(email: string) {
    return apiRequest<{ success: boolean; message: string; resetToken?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      requiresAuth: false,
    });
  },

  // Reset password
  async resetPassword(payload: { email?: string; token?: string; password?: string; newPassword?: string }) {
    return apiRequest<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  // Delete self account
  async deleteAccount() {
    return apiRequest<{ success: boolean; message: string }>("/auth/profile", {
      method: "DELETE",
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
