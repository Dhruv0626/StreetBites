import mongoose, { type Document, type Model } from "mongoose";

export type TargetAudience = "ALL" | "NEW_USERS" | "CLUSTER_SPECIFIC";

// Interface for Offer (Table 12: Promotions & Discounts)
export interface IOffer extends Document {
  stall_id?: mongoose.Types.ObjectId | null; // Null if global platform offer
  title: string;
  description: string;
  discount_percentage: number;
  flat_discount_amount: number;
  min_order_amount: number;
  max_cap_amount: number;
  target_audience: TargetAudience;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new mongoose.Schema<IOffer>(
  {
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Promotion title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Promotion terms/description is required"],
      trim: true,
    },
    discount_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    flat_discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    min_order_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_cap_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    target_audience: {
      type: String,
      enum: ["ALL", "NEW_USERS", "CLUSTER_SPECIFIC"],
      default: "ALL",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for active promotions queries
OfferSchema.index({ stall_id: 1, is_active: 1 });
OfferSchema.index({ is_active: 1, target_audience: 1 });

export const Offer: Model<IOffer> = mongoose.model<IOffer>("Offer", OfferSchema);
export default Offer;
