import { apiRequest } from "./api";

export interface PlatformSettingsData {
  _id?: string;
  base_delivery_fee: number;
  extra_stall_fee: number;
  vendor_commission_percentage: number;
  tax_percentage: number;
  is_weather_surge_enabled: boolean;
  is_festival_incentive_enabled: boolean;
  is_maintenance_mode: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const settingService = {
  // Fetch platform settings from schema
  getPlatformSettings: async () => {
    return apiRequest<PlatformSettingsData>("/settings", {
      method: "GET",
    });
  },

  // Create or initialize platform settings
  createPlatformSettings: async (data: Partial<PlatformSettingsData>) => {
    return apiRequest<PlatformSettingsData>("/settings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update platform settings
  updatePlatformSettings: async (data: Partial<PlatformSettingsData>) => {
    return apiRequest<PlatformSettingsData>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Reset platform settings to defaults
  resetPlatformSettings: async () => {
    return apiRequest<PlatformSettingsData>("/settings", {
      method: "DELETE",
    });
  },
};

export default settingService;
