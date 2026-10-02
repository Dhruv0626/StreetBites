import mongoose, { type Document, type Model } from "mongoose";

// Interface for Notification (Table 11: In-App Notifications)
export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "ORDER" | "PAYOUT" | "DELIVERY" | "PROMO" | "SYSTEM";
  order_id?: mongoose.Types.ObjectId;
  amount?: number;
  is_read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Target user ID reference is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message body is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["ORDER", "PAYOUT", "DELIVERY", "PROMO", "SYSTEM"],
      default: "SYSTEM",
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast user notification loading
NotificationSchema.index({ user_id: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
export default Notification;
