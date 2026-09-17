import mongoose, { type Document, type Model } from "mongoose";

export type FoodItemStatus =
  | "Review_pending"
  | "Approved"
  | "Rejected"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

// Interface for FoodItem (Table 4: Food_Items / Master Category List)
export interface IFoodItem extends Document {
  name: string;
  image_url: string;
  status: FoodItemStatus;
  created_by?: mongoose.Types.ObjectId | null;
  stall_id?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new mongoose.Schema<IFoodItem>(
  {
    name: {
      type: String,
      required: [true, "Food item / category name is required"],
      unique: true,
      trim: true,
    },
    image_url: {
      type: String,
      required: [true, "Category image URL is required"],
    },
    status: {
      type: String,
      enum: ["Review_pending", "Approved", "Rejected", "PENDING_REVIEW", "APPROVED", "REJECTED"],
      default: "Review_pending",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      default: null,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

export const FoodItem: Model<IFoodItem> = mongoose.model<IFoodItem>("FoodItem", FoodItemSchema);
export default FoodItem;
