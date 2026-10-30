import { apiRequest } from "./api";

export interface RiderOnboardingPayload {
  name: string;
  email: string;
  phone: string;
  aadhaarPhoto?: string | null;
  licensePhoto?: string | null;
  vehicle_model: string;
  makeModel?: string;
  vehiclePhoto?: string | null;
  vehicleNumberPlateImage?: string | null;
  rcPhoto?: string | null;
  insurancePhoto?: string | null;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface VendorOnboardingPayload {
  ownerName: string;
  email: string;
  phone: string;
  aadhaarPhoto?: string | null;
  stallName: string;
  stall_category: string;
  establishedYear: string;
  description: string;
  openTill: string;
  stallPhoto?: string | null;
  fssaiPhoto?: string | null;
  panPhoto?: string | null;
  cluster: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export const onboardingService = {
  // Submit Rider Onboarding Data & Documents to Cloudinary
  submitRiderOnboarding: async (data: RiderOnboardingPayload) => {
    return apiRequest<{ user: any }>("/onboarding/rider", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Submit Vendor Onboarding Data & Stall Photos to Cloudinary
  submitVendorOnboarding: async (data: VendorOnboardingPayload) => {
    return apiRequest<{ user: any; stall: any }>("/onboarding/vendor", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get All Verification Applications (Admin Summary)
  getVerifications: async (params?: { status?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "all") query.append("status", params.status);
    if (params?.type && params.type !== "all") query.append("type", params.type);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<any[]>(`/onboarding/verifications${queryString}`, {
      method: "GET",
    });
  },

  // Get Single Verification Application with Full KYC Documents (Audited on-demand inspection)
  getVerificationById: async (id: string) => {
    return apiRequest<any>(`/onboarding/verifications/${id}`, {
      method: "GET",
    });
  },

  // Get KYC Security Audit Logs (DPDP Compliance & Anti-Scraping Monitoring)
  getKycAuditLogs: async () => {
    return apiRequest<any[]>("/onboarding/verifications-audit", {
      method: "GET",
    });
  },

  // Update Verification Status (Admin Approve / Reject)
  updateVerificationStatus: async (id: string, status: "approved" | "rejected" | "pending") => {
    return apiRequest<{ id: string; status: string }>(`/onboarding/verify/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  // Get Vendor Details & Stall
  getVendorDetails: async (params?: { userId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append("userId", params.userId);
    if (params?.email) query.append("email", params.email);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ user: any; stall: any }>(`/onboarding/vendor${queryString}`, {
      method: "GET",
    });
  },

  // Toggle Vendor Stall Online / Accepting Orders status
  toggleVendorOnlineStatus: async (is_accepting_orders: boolean, userId?: string) => {
    return apiRequest<{ is_accepting_orders: boolean; status: string; last_opened_at?: string | Date | null }>(
      "/onboarding/vendor/toggle-status",
      {
        method: "PUT",
        body: JSON.stringify({ is_accepting_orders, userId }),
      }
    );
  },

  // Get Rider Details
  getRiderDetails: async (params?: { userId?: string; email?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append("userId", params.userId);
    if (params?.email) query.append("email", params.email);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<any>(`/onboarding/rider${queryString}`, {
      method: "GET",
    });
  },
};

export default onboardingService;
