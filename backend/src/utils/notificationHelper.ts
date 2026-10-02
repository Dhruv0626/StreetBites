import mongoose from "mongoose";
import Notification from "../models/Notification.ts";

export interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: "ORDER" | "PAYOUT" | "DELIVERY" | "PROMO" | "SYSTEM";
  orderId?: string | mongoose.Types.ObjectId;
  amount?: number;
}

/**
 * Creates an in-app notification for a user (Vendor, Rider, Customer, Admin)
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    if (!params.userId) return null;
    const notif = await Notification.create({
      user_id: new mongoose.Types.ObjectId(params.userId),
      title: params.title,
      message: params.message,
      type: params.type || "SYSTEM",
      order_id: params.orderId ? new mongoose.Types.ObjectId(params.orderId) : undefined,
      amount: params.amount,
      is_read: false,
    });
    return notif;
  } catch (err) {
    console.warn("Failed to create in-app notification:", err);
    return null;
  }
};
