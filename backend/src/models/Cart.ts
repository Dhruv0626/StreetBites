import mongoose, { type Document, type Model } from "mongoose";

// Interface for Cart (Table 5: Multi-Stall Customer Cart)
export interface ICartItem extends Document {
  customer_id: mongoose.Types.ObjectId;
  stall_id: mongoose.Types.ObjectId;
  item_id: mongoose.Types.ObjectId; // References Stalls.menu_items._id
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema = new mongoose.Schema<ICartItem>(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
    },
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      required: [true, "Stall ID is required"],
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Menu item ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure fast cart lookups and prevent duplicate entries per item
CartSchema.index({ customer_id: 1, stall_id: 1, item_id: 1 }, { unique: true });

export const Cart: Model<ICartItem> = mongoose.model<ICartItem>("Cart", CartSchema);
export default Cart;
