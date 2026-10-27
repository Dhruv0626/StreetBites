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
export const createNotification = async (params: CreateNotificationParams | any) => {
  try {
    const rawUserId = params?.userId || params?.user_id;
    if (!rawUserId) return null;

    const rawOrderId = params?.orderId || params?.order_id || (params?.data && params.data.order_id);

    const notif = await Notification.create({
      user_id: new mongoose.Types.ObjectId(rawUserId),
      title: params.title,
      message: params.message,
      type: params.type || "SYSTEM",
      order_id: rawOrderId ? new mongoose.Types.ObjectId(rawOrderId) : undefined,
      amount: params.amount,
      is_read: false,
    });
    return notif;
  } catch (err) {
    console.warn("Failed to create in-app notification:", err);
    return null;
  }
};
