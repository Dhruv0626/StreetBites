import mongoose, { type Document, type Model } from "mongoose";

// Interface for embedded Menu Item
export interface IMenuItem {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  base_price: number; // Vendor Price (Baseline)
  price: number; // Customer Price (Calculated: base_price * 1.10)
  food_item_id?: mongoose.Types.ObjectId | null; // FK to FoodItem master category
  is_available: boolean;
  image_url: string;
}

export type StallStatus = "PENDING_VERIFICATION" | "ACTIVE" | "CLOSED";

// Interface for Stall (Table 3: Stalls / Vendors)
export interface IStall extends Document {
  vendor_id: mongoose.Types.ObjectId;
  cluster_id: mongoose.Types.ObjectId;
  name: string;
  stall_category: string;
  description?: string;
  since?: string;
  rating: number;
  image_url: string;
  fssai_image_url?: string | null;
  aadhar_image_url?: string | null;
  pan_image_url?: string | null;
  open_till?: string;
  is_accepting_orders: boolean;
  last_opened_at?: Date | null;
  menu_items: IMenuItem[];
  status: StallStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new mongoose.Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    base_price: {
      type: Number,
      required: [true, "Vendor base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    price: {
      type: Number,
      required: [true, "Customer price is required"],
      min: [0, "Price cannot be negative"],
    },
    food_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      default: null,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    image_url: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const StallSchema = new mongoose.Schema<IStall>(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID reference is required"],
    },
    cluster_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cluster",
      required: [true, "Cluster ID reference is required"],
    },
    name: {
      type: String,
      required: [true, "Stall name is required"],
      trim: true,
    },
    stall_category: {
      type: String,
      required: [true, "Stall food category is required"],
      default: "Fast Food & Dosa",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    since: {
      type: String,
      default: "1998",
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    image_url: {
      type: String,
      required: [true, "Storefront image URL is required"],
    },
    fssai_image_url: {
      type: String,
      default: null,
    },
    aadhar_image_url: {
      type: String,
      default: null,
    },
    pan_image_url: {
      type: String,
      default: null,
    },
    open_till: {
      type: String,
      default: "",
      trim: true,
    },
    is_accepting_orders: {
      type: Boolean,
      default: false,
    },
    last_opened_at: {
      type: Date,
      default: null,
    },
    menu_items: [MenuItemSchema],
    status: {
      type: String,
      enum: ["PENDING_VERIFICATION", "ACTIVE", "CLOSED"],
      default: "PENDING_VERIFICATION",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying by cluster and vendor
StallSchema.index({ cluster_id: 1, status: 1 });
StallSchema.index({ vendor_id: 1 });

export const Stall: Model<IStall> = mongoose.model<IStall>("Stall", StallSchema);
export default Stall;
