import mongoose, { type Document, type Model } from "mongoose";

// Interface for embedded cart item (subdocument)
export interface ICartItem {
  _id?: any;
  stall_id: any;       // Reference / ID of Stall
  stall_name: string;  // Name of Stall
  item_id: string;     // Reference to menu item ID
  name: string;        // Item name
  price: number;       // Item price
  image?: string;      // Food item image
  quantity: number;    // Item quantity
}

// Interface for unified customer cart document (1 document per customer)
export interface ICart extends Document {
  customer_id: string;      // Unique Customer ID (user or guest)
  cluster_id: any;          // Locked Khau Galli (cluster) ID
  khau_galli_name: string;  // Locked Khau Galli Name
  items: ICartItem[];       // Array of items across any stall in this Khau Galli
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new mongoose.Schema<ICartItem>(
  {
    stall_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Stall",
      required: [true, "Stall ID is required"],
    },
    stall_name: {
      type: String,
      default: "",
    },
    item_id: {
      type: String,
      required: [true, "Item ID is required"],
    },
    name: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
  },
  { _id: true }
);

const CartSchema = new mongoose.Schema<ICart>(
  {
    customer_id: {
      type: String,
      required: [true, "Customer ID is required"],
      unique: true,
      index: true,
    },
    cluster_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Cluster",
      required: [true, "Khau Galli (cluster) ID is required"],
    },
    khau_galli_name: {
      type: String,
      default: "",
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
CartSchema.index({ customer_id: 1 }, { unique: true });
CartSchema.index({ customer_id: 1, cluster_id: 1 });

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", CartSchema);
export default Cart;
