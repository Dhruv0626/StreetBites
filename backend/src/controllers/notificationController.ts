import type { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.ts";
import User from "../models/User.ts";

const resolveUser = async (req: Request) => {
  const userId =
    (req as any).user?.id ||
    (req as any).user?._id ||
    req.body?.user_id ||
    (req.query?.user_id as string);
  if (!userId) return null;
  return User.findById(userId);
};

/**
 * @desc    Get In-App Notifications for Current User
 * @route   GET /api/notifications
 */
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Please log in to view notifications." });
      return;
    }

    let notifications = await Notification.find({ user_id: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // If new customer has no notifications yet, add initial welcome & promo notifications
    if (notifications.length === 0) {
      const initialNotifs: any[] = [];
      if (user.role === "CUSTOMER") {
        initialNotifs.push({
          user_id: user._id,
          title: "Welcome to StreetBites! 🌮",
          message: "Discover the best street food stalls in your city with fast, hot consolidated delivery.",
          type: "SYSTEM",
          is_read: false,
        });
        initialNotifs.push({
          user_id: user._id,
          title: "Special Offer: Flat ₹50 Off! 🎟️",
          message: "Use coupon STREET50 at checkout to enjoy ₹50 off on your next delicious order.",
          type: "PROMO",
          is_read: false,
        });
      } else if (user.role === "VENDOR") {
        initialNotifs.push({
          user_id: user._id,
          title: "Welcome to Vendor Hub! 🏪",
          message: "Your stall is active on StreetBites. You will receive real-time notifications for every incoming order.",
          type: "SYSTEM",
          is_read: false,
        });
      } else if (user.role === "RIDER") {
        initialNotifs.push({
          user_id: user._id,
          title: "Rider Hub Active! 🛵",
          message: "You are ready to accept delivery runs. Stay online to get assigned to nearby food cluster orders.",
          type: "SYSTEM",
          is_read: false,
        });
      }

      if (initialNotifs.length > 0) {
        await Notification.insertMany(initialNotifs);
        notifications = await Notification.find({ user_id: user._id })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
      }
    }

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch notifications.",
    });
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PUT /api/notifications/mark-all-read
 */
export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "User unauthorized." });
      return;
    }

    await Notification.updateMany({ user_id: user._id, is_read: false }, { $set: { is_read: true } });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error: any) {
    console.error("Mark All Read Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to mark notifications as read.",
    });
  }
};

/**
 * @desc    Mark Single Notification as Read
 * @route   PUT /api/notifications/:id/read
 */
export const markSingleNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid notification ID." });
      return;
    }

    await Notification.findByIdAndUpdate(id, { $set: { is_read: true } });

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error: any) {
    console.error("Mark Read Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to mark notification.",
    });
  }
};

/**
 * @desc    Get Unread Notifications Count
 * @route   GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(200).json({ success: true, count: 0 });
      return;
    }

    const count = await Notification.countDocuments({ user_id: user._id, is_read: false });
    res.status(200).json({ success: true, count });
  } catch (error: any) {
    res.status(200).json({ success: true, count: 0 });
  }
};
