import type { Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.ts";
import Order from "../models/Order.ts";
import SubOrder from "../models/SubOrder.ts";
import Stall from "../models/Stall.ts";
import Transaction from "../models/Transaction.ts";
import PlatformSetting from "../models/PlatformSetting.ts";
import Address from "../models/Address.ts";
import { geocodeAddressBackend } from "./addressController.ts";
import { createNotification } from "../utils/notificationHelper.ts";

/**
 * Helper to resolve rider user document from auth, cookies, or query params
 */
const resolveRider = async (req: Request) => {
  let userId =
    (req as any).user?.id ||
    (req as any).user?._id ||
    req.query.riderId ||
    req.query.userId ||
    req.headers["x-user-id"] ||
    req.headers["x-rider-id"];
  const email = (req.query.email as string) || (req.headers["x-user-email"] as string);

  if (!userId && req.cookies?.accessToken) {
    try {
      const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
      const decoded = jwt.verify(req.cookies.accessToken, accessSecret) as any;
      if (decoded?.id) userId = decoded.id;
    } catch (e) {
      // ignore token parse error
    }
  }

  const authHeader = req.headers?.authorization;
  if (!userId && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    try {
      const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
      const decoded = jwt.verify(authHeader.split(" ")[1], accessSecret) as any;
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

  // Fallback to first active rider
  const fallbackRider = await User.findOne({ role: "RIDER" });
  return fallbackRider;
};

// Helper to calculate exact net COD debt held by rider (Order Total - Rider Delivery Earnings)
const getOrderNetCodDebt = (order: any): number => {
  if (order.payment_method !== "COD") return 0;
  if (order.cod_amount_held !== undefined && order.cod_amount_held < (order.total_amount || 0)) {
    return order.cod_amount_held;
  }
  const riderFee = order.rider_earned_fee || order.delivery_fee || 50;
  return Math.max(0, Math.round(((order.total_amount || 0) - riderFee) * 100) / 100);
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

    // 2. COD Debt calculation (floating cash held from COD deliveries minus rider fee not yet settled)
    const pendingCodOrders = await Order.find({
      rider_id: rider._id,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    }).sort({ delivered_at: -1 });

    const currentCodDebt = Math.round(
      pendingCodOrders.reduce((sum, o) => sum + getOrderNetCodDebt(o), 0) * 100
    ) / 100;

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
      amount: `₹${getOrderNetCodDebt(o)}`,
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
        isOnline: Boolean(rider.is_online),
        deliveryRangeKm: rider.delivery_range_km || 10,
        autoAccept: Boolean(rider.auto_accept),
        pushNotifications: rider.push_notifications !== false,
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
 * Helper to calculate Haversine distance between two coordinates in Kilometers
 */
function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * @desc    Toggle Rider Online / Offline Duty Status & Update Live Location
 * @route   PUT /api/rider/toggle-online
 */
export const toggleRiderOnlineStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { isOnline, lat, lng } = req.body;
    if (typeof isOnline === "boolean") {
      rider.is_online = isOnline;
    } else {
      rider.is_online = !rider.is_online;
    }

    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      rider.current_coordinates = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    await rider.save();

    res.status(200).json({
      success: true,
      message: rider.is_online
        ? "You are now ONLINE and ready to receive nearby delivery requests!"
        : "You are now OFFLINE. Delivery orders will not be displayed.",
      data: {
        riderId: rider._id,
        name: rider.name,
        isOnline: Boolean(rider.is_online),
        deliveryRangeKm: rider.delivery_range_km || 10,
        coordinates: rider.current_coordinates?.coordinates || null,
      },
    });
  } catch (error: any) {
    console.error("Toggle Rider Online Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update online status.",
    });
  }
};

/**
 * @desc    Update Rider Dispatch Settings (Max Delivery Radius, Auto-accept, Push Notifs)
 * @route   PUT /api/rider/settings
 */
export const updateRiderSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { deliveryRangeKm, autoAccept, pushNotifications, lat, lng } = req.body;

    if (typeof deliveryRangeKm === "number" && deliveryRangeKm >= 1 && deliveryRangeKm <= 50) {
      rider.delivery_range_km = deliveryRangeKm;
    }
    if (typeof autoAccept === "boolean") {
      rider.auto_accept = autoAccept;
    }
    if (typeof pushNotifications === "boolean") {
      rider.push_notifications = pushNotifications;
    }
    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      rider.current_coordinates = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    await rider.save();

    res.status(200).json({
      success: true,
      message: "Rider settings updated successfully!",
      data: {
        riderId: rider._id,
        isOnline: Boolean(rider.is_online),
        deliveryRangeKm: rider.delivery_range_km || 10,
        autoAccept: Boolean(rider.auto_accept),
        pushNotifications: rider.push_notifications !== false,
      },
    });
  } catch (error: any) {
    console.error("Update Rider Settings Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update rider settings.",
    });
  }
};

/**
 * @desc    Get Rider Order Queue (Orders waiting for rider pickup)
 *          Enforces:
 *          1. Only ONLINE riders can view and receive incoming orders.
 *          2. Filters orders within the rider's configured delivery range radius.
 * @route   GET /api/rider/queue
 */
export const getRiderQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);

    // Rule 1: If rider is OFFLINE, do not show any order accept data
    if (!rider || !rider.is_online) {
      res.status(200).json({
        success: true,
        isOnline: false,
        deliveryRangeKm: rider?.delivery_range_km || 10,
        message: "You are currently offline. Switch your status to Online to view and accept incoming delivery orders.",
        data: [],
      });
      return;
    }

    // Rule 2: Rider is ONLINE. Apply range controller filter
    const maxRangeKm = Number(req.query.range) || rider.delivery_range_km || 10;

    // Determine rider location for geospatial range matching
    let riderLat: number | null = null;
    let riderLng: number | null = null;

    if (req.query.lat && req.query.lng) {
      riderLat = parseFloat(req.query.lat as string);
      riderLng = parseFloat(req.query.lng as string);
    } else if (rider.current_coordinates?.coordinates?.length === 2) {
      riderLng = rider.current_coordinates.coordinates[0];
      riderLat = rider.current_coordinates.coordinates[1];
    }

    const queueOrders = await Order.find({
      status: { $in: ["PREPARING", "READY_FOR_PICKUP"] },
      rider_id: null,
    })
      .populate("cluster_id", "name location coordinates")
      .populate("customer_id", "name phone_number")
      .sort({ createdAt: 1 }); // FIFO order queue

    const eligibleOrders = [];
    const now = new Date();

    for (const o of queueOrders) {
      const cluster = o.cluster_id as any;
      let calculatedDistKm = 2.4; // default base distance if GPS not calibrated

      if (
        riderLat !== null &&
        riderLng !== null &&
        cluster?.coordinates?.coordinates?.length === 2
      ) {
        const clusterLng = cluster.coordinates.coordinates[0];
        const clusterLat = cluster.coordinates.coordinates[1];
        calculatedDistKm = getHaversineDistanceKm(riderLat, riderLng, clusterLat, clusterLng);
      }

      // Check if within rider's configured delivery range radius
      if (calculatedDistKm > maxRangeKm) {
        continue;
      }

      // Check if vendor has accepted: do not offer to riders if all sub-orders are still unaccepted / PENDING
      const subOrdersForOrder = await SubOrder.find({ order_id: o._id, stall_status: { $ne: "REJECTED" } });
      const hasVendorAccepted = subOrdersForOrder.length > 0 && subOrdersForOrder.some(
        (so) => so.stall_status === "ACCEPTED" || so.stall_status === "PREPARING" || so.stall_status === "READY"
      );
      if (!hasVendorAccepted) {
        continue;
      }

      // Check rejected list (skip if rider already declined/timed out on this order)
      const rejectedList = (o.rejected_rider_ids || []).map((id: any) => id.toString());
      if (rejectedList.includes(rider._id.toString())) {
        continue;
      }

      // ── Exclusive 1-by-1 Sequential Dispatch Engine ──
      let shouldShowToThisRider = false;
      let dispatchExpiry = o.dispatch_expires_at ? new Date(o.dispatch_expires_at) : null;

      if (o.current_dispatched_rider_id) {
        const currentRiderIdStr = o.current_dispatched_rider_id.toString();

        if (dispatchExpiry && dispatchExpiry > now) {
          // 60-second window is currently active for this specific rider
          if (currentRiderIdStr === rider._id.toString()) {
            shouldShowToThisRider = true;
          } else {
            // Currently offered exclusively to another rider
            continue;
          }
        } else {
          // 60s window expired without acceptance -> blacklist previous rider and forward to next
          if (!rejectedList.includes(currentRiderIdStr)) {
            o.rejected_rider_ids = o.rejected_rider_ids || [];
            o.rejected_rider_ids.push(o.current_dispatched_rider_id);
          }
          o.current_dispatched_rider_id = null;
          o.dispatch_expires_at = null;
          await o.save();
        }
      }

      // If order has no active exclusive dispatch, assign it exclusively to this rider for 60s
      if (!shouldShowToThisRider && !o.current_dispatched_rider_id) {
        dispatchExpiry = new Date(Date.now() + 60 * 1000); // 60 seconds (1 min)
        o.current_dispatched_rider_id = rider._id;
        o.dispatch_expires_at = dispatchExpiry;
        await o.save();
        shouldShowToThisRider = true;
      }

      if (shouldShowToThisRider && dispatchExpiry) {
        const remainingSeconds = Math.max(
          1,
          Math.round((dispatchExpiry.getTime() - Date.now()) / 1000)
        );

        const subOrders = await SubOrder.find({ order_id: o._id });
        const uniqueStalls = new Set(subOrders.map((so) => so.stall_id.toString())).size;
        const totalItems = subOrders.reduce((sum, so) => sum + (so.quantity || 1), 0);
        const maxPrepTime = Math.max(
          ...subOrders.map((so) => so.estimated_prep_time_minutes || 15),
          15
        );

        eligibleOrders.push({
          id: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
          rawId: o._id,
          timeLeft: remainingSeconds,
          expiresAt: dispatchExpiry.toISOString(),
          status: o.status,
          prepTimeMinutes: maxPrepTime,
          stalls: Math.max(uniqueStalls, 1),
          items: totalItems || 1,
          distance: `${calculatedDistKm.toFixed(1)} km`,
          distanceKm: parseFloat(calculatedDistKm.toFixed(1)),
          cluster: cluster?.name || "StreetBites Cluster",
          drop:
            typeof o.delivery_address === "string"
              ? o.delivery_address
              : (o.delivery_address as any)?.formatted ||
              (o.delivery_address as any)?.street ||
              "Customer Location",
          payout: `₹${o.delivery_fee || 50}`,
          totalAmount: o.total_amount,
          paymentMethod: o.payment_method,
        });
      }
    }

    res.status(200).json({
      success: true,
      isOnline: true,
      deliveryRangeKm: maxRangeKm,
      data: eligibleOrders,
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
 * @desc    Decline / Skip an order from queue (Immediately forwards to next available rider)
 * @route   PUT /api/rider/orders/:id/decline
 */
export const declineQueueOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { id } = req.params;
    const order = await Order.findById(id);

    if (order && !order.rider_id) {
      order.rejected_rider_ids = order.rejected_rider_ids || [];
      if (!order.rejected_rider_ids.some((rId) => rId.equals(rider._id))) {
        order.rejected_rider_ids.push(rider._id);
      }
      if (order.current_dispatched_rider_id?.equals(rider._id)) {
        order.current_dispatched_rider_id = null;
        order.dispatch_expires_at = null;
      }
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: "Order declined and forwarded to next available rider.",
    });
  } catch (error: any) {
    console.error("Decline Rider Order Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to decline order.",
    });
  }
};

/**
 * @desc    Accept an order from queue
 *          Enforces: Rider must be ONLINE to accept an order.
 * @route   PUT /api/rider/orders/:id/accept
 */
export const acceptQueueOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    // Must be online to accept orders
    if (!rider.is_online) {
      res.status(400).json({
        success: false,
        message: "You are currently offline. Please switch to Online mode in your dashboard to accept delivery requests.",
      });
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
        const currentDebt = pendingCodOrders.reduce((sum, o) => sum + getOrderNetCodDebt(o), 0);
        const newOrderEstimatedDebt = getOrderNetCodDebt(order);
        if (currentDebt + newOrderEstimatedDebt > effectiveCashLimit) {
          res.status(400).json({
            success: false,
            message: `Cannot accept COD order. Your floating cash debt (₹${currentDebt}) would exceed the allowed cash limit of ₹${effectiveCashLimit}. Please settle your debt first.`,
          });
          return;
        }
      }
    }

    order.rider_id = rider._id;
    // Maintain PREPARING status unless all vendors have already marked food READY
    const subOrders = await SubOrder.find({ order_id: order._id, stall_status: { $ne: "REJECTED" } });
    const allReady = subOrders.length > 0 && subOrders.every((so) => so.stall_status === "READY");
    if (allReady) {
      order.status = "READY_FOR_PICKUP";
    } else {
      order.status = "PREPARING";
    }
    order.rider_earned_fee = order.delivery_fee || 50;
    await order.save();

    const orderNum = `MO-${order._id.toString().slice(-5).toUpperCase()}`;

    // Update Consolidated Transaction Document with assigned rider
    await Transaction.findOneAndUpdate(
      { order_id: order._id },
      {
        $set: {
          "rider_payout.rider_id": rider._id,
          "rider_payout.amount": order.rider_earned_fee,
        },
      }
    ).catch(() => { });

    // Send In-App Notification to Rider
    await createNotification({
      userId: rider._id,
      title: "Delivery Assigned! 🛵",
      message: `You have accepted Order #${orderNum}. Head to the food stalls for pickup.`,
      type: "DELIVERY",
      orderId: order._id,
    });

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

    // Find ongoing order assigned to rider (or with active in-progress statuses)
    let order = await Order.findOne({
      rider_id: rider._id,
      status: { $in: ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
    })
      .populate("cluster_id", "name location coordinates")
      .populate("customer_id", "name phone_number");

    if (!order) {
      // Fallback: check if there is an active route order for this rider by ID or any recent accepted order
      order = await Order.findOne({
        rider_id: rider._id,
        status: { $nin: ["DELIVERED", "CANCELLED", "REJECTED"] },
      })
        .populate("cluster_id", "name location coordinates")
        .populate("customer_id", "name phone_number");
    }

    if (!order) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    const cluster = order.cluster_id as any;
    const clusterCoords: [number, number] =
      cluster?.coordinates?.coordinates?.length === 2
        ? [cluster.coordinates.coordinates[0], cluster.coordinates.coordinates[1]]
        : [72.5873, 23.0248];

    // Fetch all suborders for pickups with complete stall and menu items data
    const subOrders = await SubOrder.find({ order_id: order._id })
      .populate("stall_id", "name stall_category description image_url location coordinates menu_items")
      .lean();

    // Group suborders by stall to compile stall names and items to collect
    const stallMap = new Map<string, { stall: any; items: any[]; subOrders: any[]; totalQty: number }>();
    for (const so of subOrders) {
      const stall = so.stall_id as any;
      const sId = stall?._id?.toString() || so.stall_id?.toString();
      if (!sId) continue;

      let itemName = "Food Item";
      if (stall?.menu_items && Array.isArray(stall.menu_items)) {
        const found = stall.menu_items.find(
          (m: any) => m._id?.toString() === so.item_id?.toString()
        );
        if (found) {
          itemName = found.name;
        }
      }

      if (!stallMap.has(sId)) {
        stallMap.set(sId, {
          stall: stall || { name: cluster?.name || "Street Food Stall" },
          items: [{ name: itemName, quantity: so.quantity || 1 }],
          subOrders: [so],
          totalQty: so.quantity || 1,
        });
      } else {
        const entry = stallMap.get(sId)!;
        entry.items.push({ name: itemName, quantity: so.quantity || 1 });
        entry.subOrders.push(so);
        entry.totalQty += so.quantity || 1;
      }
    }

    const pickupStalls = Array.from(stallMap.values()).map((entry, idx) => {
      const stall = entry.stall;
      const stallName = stall?.name || stall?.stall_name || `Stall ${idx + 1}`;
      let stallCoords: [number, number] =
        stall?.coordinates?.coordinates?.length === 2 &&
          (stall.coordinates.coordinates[0] !== 0 || stall.coordinates.coordinates[1] !== 0)
          ? [Number(stall.coordinates.coordinates[0]), Number(stall.coordinates.coordinates[1])]
          : [clusterCoords[0], clusterCoords[1]];

      // If multiple stalls exist in the order, distribute them with an offset inside the food market so each pin is uniquely visible
      if (stallMap.size > 1) {
        const angle = (idx * 2 * Math.PI) / stallMap.size;
        const radius = 0.00045; // ~45 meters offset within the food galli
        stallCoords = [
          Number((clusterCoords[0] + Math.cos(angle) * radius).toFixed(6)),
          Number((clusterCoords[1] + Math.sin(angle) * radius).toFixed(6)),
        ];
      }

      const isCollected = (order.collected_checkpoints || []).includes(idx);
      const isReady = entry.subOrders.length > 0 && entry.subOrders.every((so) => so.stall_status === "READY");
      const isPreparing = entry.subOrders.some((so) => so.stall_status === "PREPARING");
      const isAccepted = entry.subOrders.some((so) => so.stall_status === "ACCEPTED");
      const currentStallStatus = isCollected ? "READY" : isReady ? "READY" : isPreparing ? "PREPARING" : isAccepted ? "ACCEPTED" : "PENDING";
      const itemsSummary = entry.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");

      return {
        type: "pickup",
        id: String.fromCharCode(65 + idx), // A, B, C...
        title: stallName,
        desc: `${cluster?.name || "Khau Galli"}${stall?.stall_category ? ` · ${stall.stall_category}` : ""}`,
        dist: itemsSummary ? `Pickup: ${itemsSummary}` : `${entry.totalQty} item${entry.totalQty > 1 ? "s" : ""} to collect`,
        amount: idx === 0 ? `₹${Math.round((order.delivery_fee || 50) * 0.7)} pickup` : "+₹15 bonus",
        position: stallCoords,
        items: entry.items,
        stallName: stallName,
        status: currentStallStatus,
        isReady: isReady,
        isCollected: isCollected,
      };
    });

    // ── Resolve Exact Customer Delivery Drop Coordinates ──────────────────
    let dropCoords: [number, number] | null = null;

    const isCentralDefault = (coords?: [number, number] | null) => {
      if (!coords || !Array.isArray(coords) || coords.length !== 2) return true;
      const [lng, lat] = coords;
      if (lng === 0 && lat === 0) return true;
      if (Math.abs(lng - 72.5714) < 0.003 && Math.abs(lat - 23.0225) < 0.003) return true;
      if (Math.abs(lng - 72.5873) < 0.003 && Math.abs(lat - 23.0248) < 0.003) return true;
      return false;
    };

    // 1. Direct coordinates from order.delivery_coordinates
    if (
      order.delivery_coordinates?.coordinates?.length === 2 &&
      (order.delivery_coordinates.coordinates[0] !== 0 || order.delivery_coordinates.coordinates[1] !== 0)
    ) {
      dropCoords = [
        Number(order.delivery_coordinates.coordinates[0]),
        Number(order.delivery_coordinates.coordinates[1]),
      ];
    } else if (
      Array.isArray((order as any).delivery_coordinates) &&
      (order as any).delivery_coordinates.length === 2
    ) {
      dropCoords = [
        Number((order as any).delivery_coordinates[0]),
        Number((order as any).delivery_coordinates[1]),
      ];
    }

    // 2. Fallback to customer's saved address from MongoDB if missing or default
    if (!dropCoords || isCentralDefault(dropCoords)) {
      const customerAddr = await Address.findOne({
        customer_id: order.customer_id,
      }).sort({ is_primary: -1, createdAt: -1 });

      if (customerAddr?.lat_lng?.coordinates?.length === 2 && !isCentralDefault(customerAddr.lat_lng.coordinates as any)) {
        dropCoords = [
          Number(customerAddr.lat_lng.coordinates[0]),
          Number(customerAddr.lat_lng.coordinates[1]),
        ];
      } else if ((customerAddr as any)?.coordinates?.length === 2 && !isCentralDefault((customerAddr as any).coordinates)) {
        dropCoords = [
          Number((customerAddr as any).coordinates[0]),
          Number((customerAddr as any).coordinates[1]),
        ];
      }
    }

    // 3. Fallback: Geocode from order.delivery_address text if missing or central default
    if ((!dropCoords || isCentralDefault(dropCoords)) && order.delivery_address) {
      try {
        const geocoded = await geocodeAddressBackend({ detail: order.delivery_address });
        if (geocoded) {
          dropCoords = [geocoded.lng, geocoded.lat];
          order.delivery_coordinates = {
            type: "Point",
            coordinates: dropCoords,
          };
          await order.save().catch(() => { });
        }
      } catch (geoErr) {
        console.warn("Geocoding fallback failed:", geoErr);
      }
    }

    if (!dropCoords || (dropCoords[0] === 0 && dropCoords[1] === 0)) {
      dropCoords = [72.5815, 23.1118]; // Chandkheda hub or general Ahmedabad fallback
    }

    const dropPoint = {
      type: "drop",
      id: String.fromCharCode(65 + pickupStalls.length),
      title: `Drop · ${(order.customer_id as any)?.name || "Customer"}`,
      desc: order.delivery_address,
      dist: "Delivery Point",
      amount: order.payment_method === "COD" ? `Collect ₹${order.total_amount} COD` : "Paid Online",
      position: dropCoords,
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
        codAmountHeld: getOrderNetCodDebt(order),
        collectedCheckpoints: order.collected_checkpoints || [],
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
 * @desc    Advance checkpoint or mark stall pickup collected
 * @route   POST /api/rider/orders/:id/collect-checkpoint
 */
export const collectRouteCheckpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { id } = req.params;
    const { checkpointIndex, totalCheckpoints } = req.body;

    let order: any = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      const cleanId = id.replace(/^ORD-|^MO-/i, "");
      order = await Order.findOne({
        _id: { $regex: new RegExp(cleanId + "$", "i") },
      });
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    // Persist collected checkpoint index
    if (typeof checkpointIndex === "number") {
      order.collected_checkpoints = order.collected_checkpoints || [];
      if (!order.collected_checkpoints.includes(checkpointIndex)) {
        order.collected_checkpoints.push(checkpointIndex);
      }
    }

    // Check if all pickup stalls have been collected
    const totalStallCheckpoints = (totalCheckpoints || 2) - 1; // excluding drop point
    const allStallsCollected =
      typeof checkpointIndex === "number" &&
      (checkpointIndex >= totalStallCheckpoints - 1 ||
        (order.collected_checkpoints && order.collected_checkpoints.length >= totalStallCheckpoints));

    if (allStallsCollected || order.status === "READY_FOR_PICKUP") {
      order.status = "OUT_FOR_DELIVERY";
    }
    await order.save();

    res.status(200).json({
      success: true,
      message: "Checkpoint marked collected successfully.",
      orderStatus: order.status,
      collectedCheckpoints: order.collected_checkpoints || [],
    });
  } catch (error: any) {
    console.error("Collect Route Checkpoint Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update checkpoint.",
    });
  }
};

/**
 * @desc    Mark Rider Arrived at Customer Doorstep
 * @route   POST /api/rider/orders/:id/at-door
 */
export const markRiderAtDoor = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { id } = req.params;

    let order: any = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      const cleanId = id.replace(/^ORD-|^MO-/i, "");
      order = await Order.findOne({
        _id: { $regex: new RegExp(cleanId + "$", "i") },
      });
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    order.status = "RIDER_AT_DOOR";
    order.rider_at_door = true;
    await order.save();

    // Create real-time notification for customer
    try {
      await createNotification({
        userId: order.customer_id,
        title: "Rider is at your Doorstep!",
        message: `Your StreetBites rider ${rider.name || "partner"} has arrived at your address. Please share your 4-digit Delivery OTP (${order.delivery_otp}) to collect your fresh food!`,
        type: "ORDER",
        orderId: order._id,
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch doorstep notification:", notifErr);
    }

    res.status(200).json({
      success: true,
      message: "Rider arrival at doorstep marked successfully.",
      orderStatus: order.status,
      riderAtDoor: true,
    });
  } catch (error: any) {
    console.error("Mark Rider At Door Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update doorstep status.",
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
 * @desc    Verify Customer OTP and Mark Order Delivered
 * @route   POST /api/rider/orders/:id/verify-otp
 */
export const completeDeliveryWithOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const rider = await resolveRider(req);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) {
      res.status(400).json({ success: false, message: "Delivery OTP is required." });
      return;
    }

    let order: any = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      const cleanId = id.replace(/^ORD-|^MO-/i, "");
      order = await Order.findOne({
        _id: { $regex: new RegExp(cleanId + "$", "i") },
      });
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    if (String(order.delivery_otp).trim() !== String(otp).trim()) {
      res.status(400).json({
        success: false,
        message: "Invalid Delivery OTP. Please verify 4-digit code with customer.",
      });
      return;
    }

    const riderEarned = order.rider_earned_fee || order.delivery_fee || 50;
    const isCod = order.payment_method === "COD";
    const codDebtAmount = isCod
      ? Math.max(0, Math.round(((order.total_amount || 0) - riderEarned) * 100) / 100)
      : 0;

    order.status = "DELIVERED";
    order.delivered_at = new Date();
    order.rider_earned_fee = riderEarned;
    order.payment_status = "PAID"; // Order is now fully paid

    if (isCod) {
      order.cod_deposit_status = "PENDING_DEPOSIT";
      order.cod_amount_held = codDebtAmount; // Net platform debt after deducting rider's earned fee
    }

    await order.save();

    // Mark suborders as READY if not already
    await SubOrder.updateMany(
      { order_id: order._id },
      { $set: { stall_status: "READY" } }
    );

    const orderNum = `MO-${order._id.toString().slice(-5).toUpperCase()}`;

    // 1. Notify Customer of Delivery Completion
    if (order.customer_id) {
      await createNotification({
        userId: order.customer_id,
        title: "Order Delivered! 🎉",
        message: `Your Order #${orderNum} has been delivered at your doorstep. Enjoy your hot street food meal!`,
        type: "DELIVERY",
        orderId: order._id,
      });
    }

    // 2. Rider Payout Notification & Wallet Credit
    // For online orders: customer paid digitally, credit rider wallet
    // For COD orders: rider kept cash from customer directly, debt is remaining net
    if (!isCod) {
      await User.findByIdAndUpdate(rider._id, { $inc: { wallet_balance: riderEarned } });
    }
    await createNotification({
      userId: rider._id,
      title: isCod ? "COD Delivery Completed! 💵" : "Delivery Payout Credited! 💵",
      message: isCod
        ? `Order #${orderNum} completed. You retained ₹${riderEarned} cash delivery fee. Remit net ₹${codDebtAmount} to platform.`
        : `₹${riderEarned} delivery payout credited to your wallet for completing Order #${orderNum}.`,
      type: "PAYOUT",
      orderId: order._id,
      amount: riderEarned,
    });

    // 3. Update Consolidated Single Transaction Document (Ensure payment_status is PAID)
    try {
      const existingTxn = await Transaction.findOne({ order_id: order._id });
      if (existingTxn) {
        existingTxn.payment_status = "PAID";
        existingTxn.settlement_status = "COMPLETED";
        if (existingTxn.rider_payout) {
          existingTxn.rider_payout.rider_id = rider._id;
          existingTxn.rider_payout.amount = riderEarned;
          existingTxn.rider_payout.status = "COMPLETED";
          existingTxn.rider_payout.cod_cash_collected = isCod ? (order.total_amount || 0) : 0;
          existingTxn.rider_payout.cod_cash_debt = isCod ? codDebtAmount : 0;
          existingTxn.rider_payout.payout_at = new Date();
        }
        if (existingTxn.platform_revenue) {
          existingTxn.platform_revenue.status = "COMPLETED";
          existingTxn.platform_revenue.realized_at = new Date();
        }
        if (Array.isArray(existingTxn.vendor_payouts)) {
          existingTxn.vendor_payouts.forEach((vp: any) => {
            vp.status = "COMPLETED";
            vp.payout_at = new Date();
          });
        }
        await existingTxn.save();
      } else {
        await Transaction.findOneAndUpdate(
          { order_id: order._id },
          {
            $set: {
              payment_status: "PAID",
              "rider_payout.rider_id": rider._id,
              "rider_payout.amount": riderEarned,
              "rider_payout.status": "COMPLETED",
              "rider_payout.cod_cash_collected": isCod ? (order.total_amount || 0) : 0,
              "rider_payout.cod_cash_debt": isCod ? codDebtAmount : 0,
              "rider_payout.payout_at": new Date(),
              "vendor_payouts.$[].status": "COMPLETED",
              "vendor_payouts.$[].payout_at": new Date(),
              "platform_revenue.status": "COMPLETED",
              "platform_revenue.realized_at": new Date(),
              settlement_status: "COMPLETED",
            },
          }
        );
      }
    } catch (txnErr) {
      console.warn("Could not update transaction settlement state:", txnErr);
    }

    // 4. Vendor Payout Notifications & Wallet Credits
    try {
      const subOrders = await SubOrder.find({ order_id: order._id }).populate("stall_id");
      const stallPayoutMap = new Map<string, { stall: any; amount: number }>();
      for (const so of subOrders) {
        const stall = so.stall_id as any;
        const sId = stall?._id?.toString() || so.stall_id?.toString();
        if (!sId) continue;
        const existing = stallPayoutMap.get(sId) || { stall, amount: 0 };
        existing.amount += so.vendor_earned_amount || 0;
        stallPayoutMap.set(sId, existing);
      }

      for (const [_, entry] of stallPayoutMap.entries()) {
        const stall = entry.stall;
        const payoutAmount = Math.round(entry.amount * 100) / 100;
        const vendorId = stall?.vendor_id;
        let vendorUser = vendorId ? await User.findById(vendorId) : null;
        if (!vendorUser && stall?._id) {
          vendorUser = await User.findOne({ stall_id: stall._id, role: "VENDOR" });
        }
        if (vendorUser && payoutAmount > 0) {
          await User.findByIdAndUpdate(vendorUser._id, { $inc: { wallet_balance: payoutAmount } });
          await createNotification({
            userId: vendorUser._id,
            title: "Payout Credited! 💰",
            message: `₹${payoutAmount} food sales revenue credited to your wallet for Order #${orderNum}.`,
            type: "PAYOUT",
            orderId: order._id,
            amount: payoutAmount,
          });
        }
      }
    } catch (vendorNotifErr) {
      console.warn("Vendor payout notification error:", vendorNotifErr);
    }

    res.status(200).json({
      success: true,
      message: "Order successfully delivered! Payouts updated.",
      data: {
        orderId: order._id,
        status: order.status,
        deliveredAt: order.delivered_at,
      },
    });
  } catch (error: any) {
    console.error("Complete Delivery Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to complete delivery.",
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

    const totalSettled = Math.round(
      pendingOrders.reduce((sum, o) => sum + getOrderNetCodDebt(o), 0) * 100
    ) / 100;

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

      // Update consolidated transactions debt balance for these orders
      const orderIds = pendingOrders.map((o) => o._id);
      await Transaction.updateMany(
        { order_id: { $in: orderIds } },
        {
          $set: {
            "rider_payout.cod_cash_debt": 0,
            settlement_status: "COMPLETED",
          },
        }
      ).catch(() => { });
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
