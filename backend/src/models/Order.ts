import mongoose, { type Document, type Model } from "mongoose";

export type PaymentMethod = "ONLINE" | "COD";
export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "RIDER_AT_DOOR"
  | "AT_DOOR"
  | "DELIVERED"
  | "CANCELLED";
export type CodDepositStatus = "PENDING_DEPOSIT" | "DEPOSITED_TO_ADMIN";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

// Interface for Order (Table 6: Parent Master Order)
export interface IOrder extends Document {
  customer_id: mongoose.Types.ObjectId;
  cluster_id: mongoose.Types.ObjectId;
  food_items_total: number;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  status: OrderStatus;
  delivery_address: string;
  delivery_coordinates?: {
    type?: "Point";
    coordinates: [number, number];
  };
  delivery_notes?: string;
  rider_id?: mongoose.Types.ObjectId | null;
  rider_earned_fee?: number;
  platform_fee_earned?: number;
  current_dispatched_rider_id?: mongoose.Types.ObjectId | null;
  dispatch_expires_at?: Date | null;
  rejected_rider_ids?: mongoose.Types.ObjectId[];
  delivery_otp: string;
  cod_amount_held?: number;
  cod_deposit_status?: CodDepositStatus | null;
  refunded_amount?: number;
  rejection_note?: string;
  collected_checkpoints?: number[];
  rider_at_door?: boolean;
  delivered_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
    },
    cluster_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cluster",
      required: [true, "Cluster ID is required"],
    },
    food_items_total: {
      type: Number,
      required: [true, "Food items total amount is required"],
      min: [0, "Food items total cannot be negative"],
    },
    delivery_fee: {
      type: Number,
      required: [true, "Delivery fee is required"],
      min: [0, "Delivery fee cannot be negative"],
    },
    tax_amount: {
      type: Number,
      required: [true, "Tax amount (5% GST) is required"],
      min: [0, "Tax amount cannot be negative"],
    },
    total_amount: {
      type: Number,
      required: [true, "Grand total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    payment_method: {
      type: String,
      enum: ["ONLINE", "COD"],
      required: [true, "Payment method is required"],
    },
    payment_status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    razorpay_order_id: {
      type: String,
      default: null,
    },
    razorpay_payment_id: {
      type: String,
      default: null,
    },
    razorpay_signature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PREPARING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "RIDER_AT_DOOR",
        "AT_DOOR",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
    delivery_address: {
      type: String,
      required: [true, "Delivery address is required"],
    },
    delivery_coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.5873, 23.0248],
      },
    },
    delivery_notes: {
      type: String,
      default: "",
    },
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    current_dispatched_rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dispatch_expires_at: {
      type: Date,
      default: null,
    },
    rejected_rider_ids: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    rider_earned_fee: {
      type: Number,
      default: 0,
    },
    platform_fee_earned: {
      type: Number,
      default: 0,
    },
    delivery_otp: {
      type: String,
      required: [true, "Delivery OTP is required"],
    },
    cod_amount_held: {
      type: Number,
      default: 0,
    },
    cod_deposit_status: {
      type: String,
      enum: ["PENDING_DEPOSIT", "DEPOSITED_TO_ADMIN"],
      default: null,
    },
    refunded_amount: {
      type: Number,
      default: 0,
    },
    rejection_note: {
      type: String,
      default: null,
    },
    collected_checkpoints: {
      type: [Number],
      default: [],
    },
    delivered_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for order history and rider queue filtering
OrderSchema.index({ customer_id: 1, createdAt: -1 });
OrderSchema.index({ rider_id: 1, status: 1 });
OrderSchema.index({ cluster_id: 1, status: 1 });

export const Order: Model<IOrder> = mongoose.model<IOrder>("Order", OrderSchema);
export default Order;
