import mongoose, { type Document, type Model } from "mongoose";

export type TransactionType =
  | "VENDOR_PAYOUT"
  | "RIDER_EARNING"
  | "PLATFORM_FEE"
  | "RIDER_COD_DEDUCTION"
  | "RIDER_COD_DEPOSIT"
  | "CUSTOMER_REFUND";

export type TransactionStatus = "PENDING" | "PROCESSING" | "COMPLETED";

// Interface for Transaction (Table 9: Transactions & Money Ledger)
export interface ITransaction extends Document {
  user_id?: mongoose.Types.ObjectId | null; // Vendor, Rider, or Admin/Platform (null = Global Platform Ledger)
  order_id?: mongoose.Types.ObjectId | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
    },
    type: {
      type: String,
      enum: [
        "VENDOR_PAYOUT",
        "RIDER_EARNING",
        "PLATFORM_FEE",
        "RIDER_COD_DEDUCTION",
        "RIDER_COD_DEPOSIT",
        "CUSTOMER_REFUND",
      ],
      required: [true, "Transaction type is required"],
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED"],
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

// Indexes for user ledger statements & order financial tracking
TransactionSchema.index({ user_id: 1, createdAt: -1 });
TransactionSchema.index({ order_id: 1 });

export const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);
export default Transaction;
