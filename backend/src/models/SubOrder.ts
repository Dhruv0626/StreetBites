import mongoose, { type Document, type Model } from "mongoose";

export type StallOrderStatus = "ACCEPTED" | "PREPARING" | "READY";

// Interface for SubOrder (Table 7: Sub_Order / Stall-Level Breakdown)
export interface ISubOrder extends Document {
  order_id: mongoose.Types.ObjectId;
  stall_id: mongoose.Types.ObjectId;
  item_id: mongoose.Types.ObjectId; // References Stalls.menu_items._id
  quantity: number;
  vendor_earned_amount: number; // 95% of vendor base price * quantity
  stall_status: StallOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SubOrderSchema = new mongoose.Schema<ISubOrder>(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Parent order ID reference is required"],
    },
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      required: [true, "Stall ID reference is required"],
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Menu item ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    vendor_earned_amount: {
      type: Number,
      required: [true, "Vendor earned payout amount is required"],
      min: [0, "Vendor earned amount cannot be negative"],
    },
    stall_status: {
      type: String,
      enum: ["ACCEPTED", "PREPARING", "READY"],
      default: "ACCEPTED",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for vendor orders dashboard & parent order breakdown
SubOrderSchema.index({ stall_id: 1, stall_status: 1 });
SubOrderSchema.index({ order_id: 1 });

export const SubOrder: Model<ISubOrder> = mongoose.model<ISubOrder>("SubOrder", SubOrderSchema);
export default SubOrder;
