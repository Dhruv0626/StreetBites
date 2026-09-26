import type { Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.ts";
import Order from "../models/Order.ts";
import SubOrder from "../models/SubOrder.ts";
import Stall from "../models/Stall.ts";
import Transaction from "../models/Transaction.ts";
import PlatformSetting from "../models/PlatformSetting.ts";

/**
 * Helper to resolve rider user document from auth, cookies, or query params
 */
const resolveRider = async (req: Request) => {
  let userId = (req as any).user?.id || (req as any).user?._id || req.query.riderId || req.query.userId;
  const email = req.query.email as string;

  if (!userId && req.cookies?.accessToken) {
    try {
      const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
      const decoded = jwt.verify(req.cookies.accessToken, accessSecret) as any;
      if (decoded?.id) userId = decoded.id;
    } catch (e) {
      // ignore token parse error
    }
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
    const u = await User.findById(userId);
    if (u) return u;
  }
  if (email) {
    const u = await User.findOne({ email: email.toLowerCase() });
    if (u) return u;
  }
  return null;
};

/**
 * @desc    Get Rider Dashboard Statistics & Earnings (Real data, zeroed if fresh)
 * @route   GET /api/rider/stats
 */
export const getRiderStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(200).json({
        success: true,
        data: {
          riderId: "",
          name: "Rider",
          isOnline: false,
          todayEarnings: 0,
          completedTripsCount: 0,
          timeOnline: "Offline",
          currentCodDebt: 0,
          totalWeekEarnings: 0,
          chartData: [
            { name: "Mon", earnings: 0 },
            { name: "Tue", earnings: 0 },
            { name: "Wed", earnings: 0 },
            { name: "Thu", earnings: 0 },
            { name: "Fri", earnings: 0 },
            { name: "Sat", earnings: 0 },
            { name: "Sun", earnings: 0 },
          ],
          breakdown: {
            baseFare: 0,
            distancePay: 0,
            bonusPay: 0,
            total: 0,
          },
          codTransactions: [],
          recentTrips: [],
        },
      });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Today's completed orders
    const todayOrders = await Order.find({
      rider_id: rider._id,
      status: "DELIVERED",
      delivered_at: { $gte: startOfToday, $lte: endOfToday },
    });

    const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.rider_earned_fee || 0), 0);
    const completedTripsCount = todayOrders.length;

    // 2. COD Debt calculation (floating cash held from COD deliveries not yet settled)
    const pendingCodOrders = await Order.find({
      rider_id: rider._id,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    }).sort({ delivered_at: -1 });

    const currentCodDebt = pendingCodOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);

    // COD Transactions list (from pending and settled orders)
    const allCodOrders = await Order.find({
      rider_id: rider._id,
      payment_method: "COD",
      status: "DELIVERED",
    })
      .sort({ delivered_at: -1, createdAt: -1 })
      .limit(10);

    const codTransactions = allCodOrders.map((o) => ({
      id: `TX-${o._id.toString().slice(-6).toUpperCase()}`,
      type: "collection" as const,
      amount: `₹${o.cod_amount_held || o.total_amount || 0}`,
      order: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
      time: o.delivered_at ? new Date(o.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
      status: o.cod_deposit_status === "PENDING_DEPOSIT" ? "pending" : "completed",
    }));

    // 3. Weekly earnings chart (Mon - Sun of current week)
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekOrders = await Order.find({
      rider_id: rider._id,
      status: "DELIVERED",
      delivered_at: { $gte: startOfWeek },
    });

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const chartData = dayNames.map((name, index) => {
      const dayEarnings = weekOrders
        .filter((o) => {
          if (!o.delivered_at) return false;
          const d = new Date(o.delivered_at);
          const dow = (d.getDay() + 6) % 7;
          return dow === index;
        })
        .reduce((sum, o) => sum + (o.rider_earned_fee || 0), 0);

      return { name, earnings: dayEarnings };
    });

    const totalWeekEarnings = chartData.reduce((sum, d) => sum + d.earnings, 0);

    // 4. Recent trips (latest 10 delivered orders)
    const recentDeliveredOrders = await Order.find({
      rider_id: rider._id,
      status: "DELIVERED",
    })
      .sort({ delivered_at: -1, createdAt: -1 })
      .limit(10);

    const recentTrips = await Promise.all(
      recentDeliveredOrders.map(async (o) => {
        const subOrders = await SubOrder.find({ order_id: o._id });
        const uniqueStalls = new Set(subOrders.map((so) => so.stall_id.toString())).size;
        return {
          id: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
          time: o.delivered_at
            ? new Date(o.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recent",
          stalls: Math.max(uniqueStalls, 1),
          distance: "2.4 km",
          payout: `₹${o.rider_earned_fee || 0}`,
          rawPayout: o.rider_earned_fee || 0,
        };
      })
    );

    // 5. Today's Breakdown
    const baseFare = completedTripsCount * 20;
    const distancePay = Math.max(0, Math.round(todayEarnings * 0.6));
    const bonusPay = Math.max(0, todayEarnings - baseFare - distancePay);

    const platformSettings = await PlatformSetting.findOne();
    const effectiveCashLimit = rider.cash_limit && rider.cash_limit > 0
      ? rider.cash_limit
      : (platformSettings?.rider_cash_limit ?? 0);

    res.status(200).json({
      success: true,
      data: {
        riderId: rider._id,
        name: rider.name,
        isOnline: rider.is_online,
        todayEarnings,
        completedTripsCount,
        timeOnline: rider.is_online ? "Active Now" : "Offline",
        currentCodDebt,
        cashLimit: effectiveCashLimit,
        totalWeekEarnings,
        chartData,
        breakdown: {
          baseFare,
          distancePay,
          bonusPay,
          total: todayEarnings,
        },
        codTransactions,
        recentTrips,
      },
    });
  } catch (error: any) {
    console.error("Get Rider Stats Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch rider stats.",
    });
  }
};

/**
 * @desc    Get Rider Order Queue (Orders waiting for rider pickup)
 * @route   GET /api/rider/queue
 */
export const getRiderQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const queueOrders = await Order.find({
      status: { $in: ["PREPARING", "READY_FOR_PICKUP"] },
      rider_id: null,
    })
      .populate("cluster_id", "name location")
      .populate("customer_id", "name phone_number")
      .sort({ createdAt: -1 })
      .limit(20);

    const formatted = await Promise.all(
      queueOrders.map(async (o) => {
        const subOrders = await SubOrder.find({ order_id: o._id });
        const uniqueStalls = new Set(subOrders.map((so) => so.stall_id.toString())).size;
        const totalItems = subOrders.reduce((sum, so) => sum + so.quantity, 0);

        return {
          id: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
          rawId: o._id,
          timeLeft: 120,
          stalls: Math.max(uniqueStalls, 1),
          items: totalItems || 1,
          distance: "2.5 km",
          cluster: (o.cluster_id as any)?.name || "StreetBites Cluster",
          drop: o.delivery_address || "Customer Location",
          payout: `₹${o.delivery_fee || 50}`,
          totalAmount: o.total_amount,
          paymentMethod: o.payment_method,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Get Rider Queue Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch rider queue.",
    });
  }
};

/**
 * @desc    Accept an order from queue
 * @route   PUT /api/rider/orders/:id/accept
 */
export const acceptQueueOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { id } = req.params;
    const order = await Order.findOne({
      _id: id,
      rider_id: null,
    });

    if (!order) {
      res.status(400).json({
        success: false,
        message: "Order has already been accepted by another rider or does not exist.",
      });
      return;
    }

    // Check COD limit enforcement if order is COD
    if (order.payment_method === "COD") {
      const platformSettings = await PlatformSetting.findOne();
      const effectiveCashLimit = rider.cash_limit && rider.cash_limit > 0
        ? rider.cash_limit
        : (platformSettings?.rider_cash_limit ?? 0);

      if (effectiveCashLimit > 0) {
        const pendingCodOrders = await Order.find({
          rider_id: rider._id,
          payment_method: "COD",
          cod_deposit_status: "PENDING_DEPOSIT",
          status: "DELIVERED",
        });
        const currentDebt = pendingCodOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);
        if (currentDebt + (order.total_amount || 0) > effectiveCashLimit) {
          res.status(400).json({
            success: false,
            message: `Cannot accept COD order. Your floating cash debt (₹${currentDebt}) would exceed the allowed cash limit of ₹${effectiveCashLimit}. Please settle your debt first.`,
          });
          return;
        }
      }
    }

    order.rider_id = rider._id;
    order.status = "READY_FOR_PICKUP";
    order.rider_earned_fee = order.delivery_fee || 50;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order accepted successfully!",
      data: order,
    });
  } catch (error: any) {
    console.error("Accept Order Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to accept order.",
    });
  }
};

/**
 * @desc    Get Active Delivery Route for Rider
 * @route   GET /api/rider/active-route
 */
export const getActiveRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    // Find ongoing order
    const order = await Order.findOne({
      rider_id: rider._id,
      status: { $in: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
    })
      .populate("cluster_id", "name location coordinates")
      .populate("customer_id", "name phone_number");

    if (!order) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    // Fetch stalls for pickups
    const subOrders = await SubOrder.find({ order_id: order._id }).populate("stall_id", "stall_name stall_number location coordinates");

    const pickupStalls = subOrders.map((so, idx) => {
      const stall = so.stall_id as any;
      return {
        type: "pickup",
        id: String.fromCharCode(65 + idx), // A, B, C...
        title: `${stall?.stall_name || "Stall"}`,
        desc: stall?.location || "Khau Galli",
        dist: "0.2 km",
        amount: idx === 0 ? `₹${Math.round((order.delivery_fee || 50) * 0.7)} pickup` : "+₹15 bonus",
        position: stall?.coordinates?.coordinates || [72.5873, 23.0242],
      };
    });

    const dropPoint = {
      type: "drop",
      id: String.fromCharCode(65 + pickupStalls.length),
      title: `Drop · ${(order.customer_id as any)?.name || "Customer"}`,
      desc: order.delivery_address,
      dist: "2.4 km",
      amount: order.payment_method === "COD" ? `Collect ₹${order.total_amount} COD` : "Paid Online",
      position: [72.545, 23.036] as [number, number],
    };

    const checkpoints = [...pickupStalls, dropPoint];

    res.status(200).json({
      success: true,
      data: {
        orderId: `MO-${order._id.toString().slice(-5).toUpperCase()}`,
        rawId: order._id,
        status: order.status,
        deliveryOtp: order.delivery_otp,
        paymentMethod: order.payment_method,
        totalAmount: order.total_amount,
        riderEarnedFee: order.rider_earned_fee || order.delivery_fee || 50,
        codAmountHeld: order.cod_amount_held || (order.payment_method === "COD" ? order.total_amount : 0),
        checkpoints,
      },
    });
  } catch (error: any) {
    console.error("Get Active Route Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch active route.",
    });
  }
};

/**
 * @desc    Get Rider Delivery History
 * @route   GET /api/rider/history
 */
export const getRiderHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    const deliveredOrders = await Order.find({
      rider_id: rider._id,
      status: "DELIVERED",
    })
      .sort({ delivered_at: -1, createdAt: -1 })
      .limit(50);

    const history = await Promise.all(
      deliveredOrders.map(async (o) => {
        const subOrders = await SubOrder.find({ order_id: o._id });
        const uniqueStalls = new Set(subOrders.map((so) => so.stall_id.toString())).size;

        return {
          id: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
          rawId: o._id,
          time: o.delivered_at
            ? new Date(o.delivered_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Delivered",
          stalls: Math.max(uniqueStalls, 1),
          distance: "2.8 km",
          payout: `₹${o.rider_earned_fee || 0}`,
          status: "completed",
        };
      })
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Get Rider History Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch delivery history.",
    });
  }
};

/**
 * @desc    Settle COD Debt (Instant Settlement)
 * @route   POST /api/rider/settle-debt
 */
export const settleRiderDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const pendingOrders = await Order.find({
      rider_id: rider._id,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    });

    const totalSettled = pendingOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);

    if (totalSettled > 0) {
      await Order.updateMany(
        {
          rider_id: rider._id,
          payment_method: "COD",
          cod_deposit_status: "PENDING_DEPOSIT",
        },
        {
          $set: { cod_deposit_status: "DEPOSITED_TO_ADMIN" },
        }
      );

      // Record transaction
      await Transaction.create({
        user_id: rider._id,
        amount: totalSettled,
        type: "RIDER_COD_DEDUCTION",
        status: "COMPLETED",
        note: `COD Debt settled by rider ${rider.name}`,
      });
    }

    res.status(200).json({
      success: true,
      message: totalSettled > 0 ? `Successfully settled ₹${totalSettled} of COD debt!` : "No outstanding COD debt to settle.",
      data: {
        settledAmount: totalSettled,
        remainingDebt: 0,
      },
    });
  } catch (error: any) {
    console.error("Settle Debt Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to settle debt.",
    });
  }
};
