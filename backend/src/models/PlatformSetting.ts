import mongoose, { type Document, type Model } from "mongoose";

// Interface for Platform Settings (Table 13: Global Singleton Settings)
export interface IPlatformSetting extends Document {
  base_delivery_fee: number;
  extra_stall_fee: number;
  vendor_commission_percentage: number;
  tax_percentage: number;
  is_weather_surge_enabled: boolean;
  is_festival_incentive_enabled: boolean;
  is_maintenance_mode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingSchema = new mongoose.Schema<IPlatformSetting>(
  {
    base_delivery_fee: {
      type: Number,
      default: 25.0,
      min: [0, "Base delivery fee cannot be negative"],
    },
    extra_stall_fee: {
      type: Number,
      min: [0, "Extra stall fee cannot be negative"],
    },
    vendor_commission_percentage: {
      type: Number,
      default: 5.0,
      min: [0, "Vendor commission cannot be negative"],
      max: [100, "Vendor commission cannot exceed 100%"],
    },
    tax_percentage: {
      type: Number,
      default: 5.0,
      min: [0, "Tax percentage cannot be negative"],
    },
    is_weather_surge_enabled: {
      type: Boolean,
      default: false,
    },
    is_festival_incentive_enabled: {
      type: Boolean,
      default: false,
    },
    is_maintenance_mode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformSetting: Model<IPlatformSetting> = mongoose.model<IPlatformSetting>(
  "PlatformSetting",
  PlatformSettingSchema
);
export default PlatformSetting;
