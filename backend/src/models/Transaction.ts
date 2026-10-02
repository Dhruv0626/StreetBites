import mongoose, { type Document, type Model } from "mongoose";

export type OverallSettlementStatus = "PENDING" | "PARTIALLY_SETTLED" | "COMPLETED" | "CANCELLED";

export interface IVendorPayoutItem {
  stall_id: mongoose.Types.ObjectId;
  vendor_id?: mongoose.Types.ObjectId | null;
  stall_name?: string;
  amount: number; // 95% base food revenue for this stall's dishes
  status: "PENDING" | "COLLECTED" | "COMPLETED"; // Updated upon rider stall pickup
  collected_at?: Date | null;
  payout_at?: Date | null;
}

export interface IRiderPayoutItem {
  rider_id?: mongoose.Types.ObjectId | null;
  amount: number; // 100% delivery fee + surges
  status: "PENDING" | "COMPLETED";
  cod_cash_collected?: number; // Total cash physically collected from customer
  cod_cash_debt?: number; // Remaining debt payable to platform (Total - Delivery Fee)
  payout_at?: Date | null;
}

export interface IPlatformRevenueItem {
  vendor_commission_amount: number; // 5% base commission
  customer_markup_amount: number; // 10% food markup
  total_platform_fee: number; // Total platform revenue
  tax_amount: number; // 5% GST
  status: "PENDING" | "COMPLETED";
  realized_at?: Date | null;
}

// Interface for Unified Single-Entry Transaction Document (One Record Per Order)
export interface ITransaction extends Document {
  order_id: mongoose.Types.ObjectId;
  order_number: string; // e.g. "MO-77123"
  customer_id?: mongoose.Types.ObjectId | null;
  payment_method: "ONLINE" | "COD";
  payment_status: "PENDING" | "PAID";
  total_order_amount: number; // Gross total paid/payable by customer

  // 1. Consolidated Vendor Payouts Array (One entry for each stall in the order)
  vendor_payouts: IVendorPayoutItem[];

  // 2. Rider Earnings & COD Debt (Populated/Updated on assignment & completion)
  rider_payout: IRiderPayoutItem;

  // 3. Platform Revenue & Tax Realization
  platform_revenue: IPlatformRevenueItem;

  // Overall settlement state
  settlement_status: OverallSettlementStatus;
  note?: string;

  createdAt: Date;
  updatedAt: Date;
}

const VendorPayoutSchema = new mongoose.Schema<IVendorPayoutItem>(
  {
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      required: [true, "Stall ID is required for vendor payout"],
    },
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    stall_name: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "Vendor payout amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["PENDING", "COLLECTED", "COMPLETED"],
      default: "PENDING",
    },
    collected_at: {
      type: Date,
      default: null,
    },
    payout_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const RiderPayoutSchema = new mongoose.Schema<IRiderPayoutItem>(
  {
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "Rider payout amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
    cod_cash_collected: {
      type: Number,
      default: 0,
    },
    cod_cash_debt: {
      type: Number,
      default: 0,
    },
    payout_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const PlatformRevenueSchema = new mongoose.Schema<IPlatformRevenueItem>(
  {
    vendor_commission_amount: {
      type: Number,
      default: 0,
    },
    customer_markup_amount: {
      type: Number,
      default: 0,
    },
    total_platform_fee: {
      type: Number,
      default: 0,
    },
    tax_amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
    realized_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema<ITransaction>(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID reference is required"],
      unique: true, // Guarantees 1 single consolidated transaction entry per order
    },
    order_number: {
      type: String,
      required: [true, "Order number identifier is required"],
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    payment_method: {
      type: String,
      enum: ["ONLINE", "COD"],
      required: [true, "Payment method is required"],
    },
    payment_status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
    total_order_amount: {
      type: Number,
      required: [true, "Total order amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    vendor_payouts: {
      type: [VendorPayoutSchema],
      default: [],
    },
    rider_payout: {
      type: RiderPayoutSchema,
      default: () => ({
        rider_id: null,
        amount: 0,
        status: "PENDING",
        cod_cash_collected: 0,
        cod_cash_debt: 0,
        payout_at: null,
      }),
    },
    platform_revenue: {
      type: PlatformRevenueSchema,
      default: () => ({
        vendor_commission_amount: 0,
        customer_markup_amount: 0,
        total_platform_fee: 0,
        tax_amount: 0,
        status: "PENDING",
        realized_at: null,
      }),
    },
    settlement_status: {
      type: String,
      enum: ["PENDING", "PARTIALLY_SETTLED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for superfast queries across Admin, Vendor, and Rider portals
TransactionSchema.index({ order_id: 1 }, { unique: true });
TransactionSchema.index({ "vendor_payouts.vendor_id": 1, createdAt: -1 });
TransactionSchema.index({ "rider_payout.rider_id": 1, createdAt: -1 });
TransactionSchema.index({ settlement_status: 1 });

export const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);
export default Transaction;
