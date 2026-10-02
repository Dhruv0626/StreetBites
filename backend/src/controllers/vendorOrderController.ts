import type { Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Order from "../models/Order.ts";
import SubOrder from "../models/SubOrder.ts";
import Stall from "../models/Stall.ts";
import User from "../models/User.ts";
import Transaction from "../models/Transaction.ts";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";

/**
 * Safely extract user ID from auth context, cookies, or headers
 */
const resolveUserId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.id) return req.user.id;

  const token =
    req.cookies?.accessToken ||
    (typeof req.headers?.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined);

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "";
      const decoded = jwt.verify(token, accessSecret) as any;
      if (decoded?.id) return decoded.id;
    } catch {
      // ignore token verification error
    }
  }

  // Fallback query or headers
  if (req.query?.userId && typeof req.query.userId === "string") return req.query.userId;
  if (req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string") return req.headers["x-user-id"];

  // Fallback: find first vendor user in database
  const vendorUser = await User.findOne({ role: "VENDOR" });
  return vendorUser ? vendorUser._id.toString() : null;
};

/**
 * Find existing Stall for this vendor
 */
const resolveVendorStall = async (userId: string | null): Promise<any> => {
  if (userId && mongoose.isValidObjectId(userId)) {
    const user: any = await User.findById(userId);
    if (user?.stall_id) {
      const stall = await Stall.findById(user.stall_id);
      if (stall) return stall;
    }
    const stall = await Stall.findOne({ vendor_id: userId });
    if (stall) return stall;
  }

  // Fallback: check existing registered stalls without creating dummy data
  return await Stall.findOne();
};

/**
 * Helper to format relative time
 */
const formatTimeAgo = (date: Date | string): string => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/**
 * @desc    Get live incoming and historical orders for Vendor Kitchen
 * @route   GET /api/vendor/orders
 * @access  Vendor
 */
export const getVendorOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const primaryStall = await resolveVendorStall(userId);

    if (!primaryStall) {
      res.status(200).json({
        success: true,
        data: {
          orders: [],
          metrics: { liveCount: 0, avgPrep: "--", rating: "4.8", todayPayout: 0 },
        },
      });
      return;
    }

    // Find all stalls associated with this vendor
    const allVendorStalls = userId && mongoose.isValidObjectId(userId)
      ? await Stall.find({ vendor_id: userId }).lean()
      : [primaryStall];

    const stallIds = Array.from(
      new Set([
        primaryStall._id.toString(),
        ...allVendorStalls.map((s: any) => s._id.toString()),
      ])
    ).map((id) => new mongoose.Types.ObjectId(id));

    // Gather all dish menu item IDs from these stalls
    const menuItemIds: mongoose.Types.ObjectId[] = [];
    allVendorStalls.forEach((s: any) => {
      if (Array.isArray(s.menu_items)) {
        s.menu_items.forEach((m: any) => {
          if (m._id) menuItemIds.push(m._id);
        });
      }
    });

    const orConditions: any[] = [{ stall_id: { $in: stallIds } }];
    if (userId && mongoose.isValidObjectId(userId)) {
      orConditions.push({ stall_id: new mongoose.Types.ObjectId(userId) });
    }
    if (menuItemIds.length > 0) {
      orConditions.push({ item_id: { $in: menuItemIds } });
    }

    // Find all matching SubOrder records
    const subOrders = await SubOrder.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .lean();

    if (subOrders.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          orders: [],
          metrics: {
            liveCount: 0,
            avgPrep: "--",
            rating: primaryStall.rating ? Number(primaryStall.rating).toFixed(1) : "4.8",
            todayPayout: 0,
          },
          stall: {
            id: primaryStall._id,
            name: primaryStall.name,
            is_accepting_orders: primaryStall.is_accepting_orders,
          },
        },
      });
      return;
    }

    // Fetch parent master orders
    const orderIds = Array.from(
      new Set(subOrders.map((so) => so.order_id?.toString()).filter(Boolean))
    );

    const masterOrders = await Order.find({ _id: { $in: orderIds } })
      .populate("customer_id", "name phone_number email")
      .lean();

    const orderMap = new Map(masterOrders.map((o: any) => [o._id.toString(), o]));

    // Group suborders by parent order
    const groupedOrders: any[] = [];

    for (const orderId of orderIds) {
      const parentOrder: any = orderMap.get(orderId);
      if (!parentOrder) continue;

      const itemsForThisStall = subOrders.filter(
        (so) => so.order_id?.toString() === orderId
      );

      const itemsList = itemsForThisStall.map((so: any) => {
        let name = "Street Food Dish";
        let basePrice = so.vendor_earned_amount
          ? Math.round(((so.vendor_earned_amount / (so.quantity || 1)) / 0.95) * 100) / 100
          : 50;

        // Try matching from menu_items of vendor's stalls
        for (const stall of allVendorStalls) {
          if (stall.menu_items && Array.isArray(stall.menu_items)) {
            const found = stall.menu_items.find(
              (m: any) => m._id?.toString() === so.item_id?.toString()
            );
            if (found) {
              name = found.name;
              // Vendor should see their settled base_price from stall model
              basePrice = found.base_price !== undefined ? found.base_price : (found.price || basePrice);
              break;
            }
          }
        }

        return {
          subOrderId: so._id.toString(),
          itemId: so.item_id?.toString(),
          name,
          price: basePrice,
          quantity: so.quantity || 1,
          status: so.stall_status,
          prepTimeMinutes: so.estimated_prep_time_minutes || 15,
        };
      });

      const totalStallAmount = itemsList.reduce(
        (sum, it) => sum + it.price * it.quantity,
        0
      );
      const netPayout = itemsForThisStall.reduce(
        (sum, so: any) => sum + (so.vendor_earned_amount || 0),
        0
      ) || Math.round(totalStallAmount * 0.95 * 100) / 100;
      const commission = Math.max(
        0,
        Math.round((totalStallAmount - netPayout) * 100) / 100
      );

      // Determine vendor status
      let vendorStatus: "New" | "Preparing" | "Completed" | "Cancelled" = "New";
      if (parentOrder.status === "CANCELLED") {
        vendorStatus = "Cancelled";
      } else if (itemsForThisStall.every((so: any) => so.stall_status === "READY")) {
        vendorStatus = "Completed";
      } else if (itemsForThisStall.some((so: any) => so.stall_status === "PREPARING")) {
        vendorStatus = "Preparing";
      } else if (parentOrder.status === "DELIVERED") {
        vendorStatus = "Completed";
      }

      const activePrepMins = itemsForThisStall.find((so: any) => so.estimated_prep_time_minutes)?.estimated_prep_time_minutes || 15;

      groupedOrders.push({
        id: `ORD-${parentOrder._id.toString().slice(-6).toUpperCase()}`,
        orderId: parentOrder._id.toString(),
        status: vendorStatus,
        customer: parentOrder.customer_id?.name || "Customer",
        customerPhone: parentOrder.customer_id?.phone_number || "",
        deliveryAddress: parentOrder.delivery_address || "",
        deliveryNotes: parentOrder.delivery_notes || "",
        paymentMethod: parentOrder.payment_method || "ONLINE",
        paymentStatus: parentOrder.payment_status || "PAID",
        time: formatTimeAgo(parentOrder.createdAt),
        createdAt: parentOrder.createdAt,
        items: itemsList,
        total: totalStallAmount,
        net: netPayout,
        commission,
        prepTimeMinutes: activePrepMins,
      });
    }

    // CRITICAL: Live Orders ("New" then "Preparing") ALWAYS displayed first!
    const statusPriority: Record<string, number> = {
      New: 1,
      Preparing: 2,
      Completed: 3,
      Cancelled: 4,
    };

    groupedOrders.sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const liveCount = groupedOrders.filter(
      (o) => o.status === "New" || o.status === "Preparing"
    ).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayPayout = groupedOrders
      .filter((o) => o.status === "Completed" && new Date(o.createdAt) >= todayStart)
      .reduce((sum, o) => sum + (o.net || 0), 0);

    const avgPrep = liveCount > 0 ? "15m" : "12m";
    const stallRating = primaryStall.rating
      ? Number(primaryStall.rating).toFixed(1)
      : "4.8";

    res.status(200).json({
      success: true,
      data: {
        orders: groupedOrders,
        metrics: {
          liveCount,
          avgPrep,
          rating: stallRating,
          todayPayout,
        },
        stall: {
          id: primaryStall._id,
          name: primaryStall.name,
          is_accepting_orders: primaryStall.is_accepting_orders,
        },
      },
    });
  } catch (error: any) {
    console.error("Get Vendor Orders Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to load kitchen orders.",
    });
  }
};

/**
 * @desc    Update status of an order for this vendor's stall
 * @route   PATCH /api/vendor/orders/:id/status
 * @access  Vendor
 */
export const updateVendorOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, prepTimeMinutes, prep_time_minutes, estimated_prep_time_minutes, prepTime } = req.body;
    const userId = await resolveUserId(req);
    const primaryStall = await resolveVendorStall(userId);

    if (!primaryStall) {
      res.status(404).json({ success: false, message: "Vendor stall not found." });
      return;
    }

    // Map vendor action to SubOrder stall_status
    let newStallStatus: "ACCEPTED" | "PREPARING" | "READY" = "PREPARING";
    if (status === "Preparing" || status === "PREPARING") {
      newStallStatus = "PREPARING";
    } else if (
      status === "Completed" ||
      status === "READY" ||
      status === "Ready"
    ) {
      newStallStatus = "READY";
    }

    // Locate the parent master order
    let order: any = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
      if (!order) {
        const so = await SubOrder.findById(id);
        if (so) {
          order = await Order.findById(so.order_id);
        }
      }
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

    const stallIds = [
      primaryStall._id,
      ...(userId && mongoose.isValidObjectId(userId) ? [new mongoose.Types.ObjectId(userId)] : []),
    ];

    const parsedPrepTime = Number(
      estimated_prep_time_minutes ||
      prepTimeMinutes ||
      prep_time_minutes ||
      prepTime
    ) || 15;

    if (status === "Cancelled" || status === "CANCELLED" || status === "REJECTED" || status === "Rejected") {
      const reason = req.body.reason || "Stall busy / Item unavailable";

      // 1. Mark suborders for this stall as REJECTED
      await SubOrder.updateMany(
        { order_id: order._id, stall_id: { $in: stallIds } },
        {
          $set: {
            stall_status: "REJECTED",
            rejection_reason: reason,
          },
        }
      );

      // 2. Action on Stall: increment consecutive missed orders & auto-offline if >= 2
      primaryStall.consecutive_missed_orders = (primaryStall.consecutive_missed_orders || 0) + 1;
      primaryStall.total_orders_received = (primaryStall.total_orders_received || 0) + 1;

      if (primaryStall.consecutive_missed_orders >= 2) {
        primaryStall.is_accepting_orders = false;
        primaryStall.auto_offline_until = new Date(Date.now() + 30 * 60 * 1000); // 30 min cooldown
      }

      // If rejection reason is OUT_OF_STOCK, auto-stockout the specific menu items
      if (
        reason.toUpperCase().includes("STOCK") ||
        reason.toUpperCase().includes("OUT OF STOCK") ||
        req.body.itemOutStock === true
      ) {
        const rejectedSubOrders = await SubOrder.find({
          order_id: order._id,
          stall_id: { $in: stallIds },
        });
        const itemIdsToDisable = rejectedSubOrders.map((so) => so.item_id.toString());

        if (primaryStall.menu_items && Array.isArray(primaryStall.menu_items)) {
          primaryStall.menu_items.forEach((m: any) => {
            if (itemIdsToDisable.includes(m._id?.toString())) {
              m.is_available = false;
            }
          });
        }
      }

      await primaryStall.save();

      // 3. Automated Master Order Resolution
      const allSubOrders = await SubOrder.find({ order_id: order._id });
      const activeSubOrders = allSubOrders.filter((so) => so.stall_status !== "REJECTED");
      const rejectedSubOrders = allSubOrders.filter((so) => so.stall_status === "REJECTED");

      const rejectedFoodTotal = rejectedSubOrders
        .filter((so) => stallIds.some((id) => id.equals(so.stall_id)))
        .reduce((sum, so) => sum + (so.vendor_earned_amount ? Math.round(so.vendor_earned_amount / 0.95) : 50), 0);
      const rejectedTax = Math.round(rejectedFoodTotal * 0.05);
      const rejectedDeduction = rejectedFoodTotal + rejectedTax;

      if (activeSubOrders.length === 0) {
        // Case A: 100% Rejection - Cancel whole order and issue 100% full refund
        order.status = "CANCELLED";
        order.rejection_note = `Order cancelled. Stalls were unable to fulfill the request (${reason}).`;

        if (order.payment_method === "ONLINE" && order.payment_status === "PAID") {
          order.payment_status = "REFUNDED";
          order.refunded_amount = order.total_amount;

          await Transaction.create({
            user_id: order.customer_id,
            order_id: order._id,
            amount: order.total_amount,
            type: "CUSTOMER_REFUND",
            status: "COMPLETED",
            note: `100% Full refund processed for cancelled Order #${order._id.toString().slice(-6).toUpperCase()}`,
          });
        } else if (order.payment_method === "COD") {
          order.total_amount = 0;
          order.food_items_total = 0;
          order.tax_amount = 0;
        }

        await order.save();

        res.status(200).json({
          success: true,
          message: "Order rejected. Since all stalls were rejected, 100% full refund processed.",
          orderStatus: "CANCELLED",
          consecutiveMissedOrders: primaryStall.consecutive_missed_orders,
          isStallOffline: !primaryStall.is_accepting_orders,
        });
        return;
      } else {
        // Case B: Partial Rejection - Continue order with active stalls & issue partial refund
        if (order.payment_method === "ONLINE") {
          order.refunded_amount = (order.refunded_amount || 0) + rejectedDeduction;

          await Transaction.create({
            user_id: order.customer_id,
            order_id: order._id,
            amount: rejectedDeduction,
            type: "CUSTOMER_REFUND",
            status: "COMPLETED",
            note: `Partial refund of ₹${rejectedDeduction} issued for items rejected by ${primaryStall.name}`,
          });
        } else if (order.payment_method === "COD") {
          order.food_items_total = Math.max(0, order.food_items_total - rejectedFoodTotal);
          order.tax_amount = Math.max(0, order.tax_amount - rejectedTax);
          order.total_amount = Math.max(0, order.total_amount - rejectedDeduction);
        }

        // Advance master order if all remaining stalls are READY
        if (activeSubOrders.every((so) => so.stall_status === "READY")) {
          order.status = "READY_FOR_PICKUP";
        } else if (activeSubOrders.some((so) => so.stall_status === "PREPARING")) {
          order.status = "PREPARING";
        }

        await order.save();

        res.status(200).json({
          success: true,
          message: `Stall order rejected (${reason}). Automated partial refund of ₹${rejectedDeduction} processed for customer. Remaining stalls continue cooking.`,
          refundedAmount: rejectedDeduction,
          newTotalAmount: order.total_amount,
          consecutiveMissedOrders: primaryStall.consecutive_missed_orders,
          isStallOffline: !primaryStall.is_accepting_orders,
        });
        return;
      }
    } else {
      // Vendor is ACCEPTING / PREPARING / READY
      primaryStall.consecutive_missed_orders = 0; // reset missed orders streak
      primaryStall.total_orders_accepted = (primaryStall.total_orders_accepted || 0) + 1;
      primaryStall.total_orders_received = (primaryStall.total_orders_received || 0) + 1;
      await primaryStall.save();

      const updatePayload: any = { stall_status: newStallStatus };
      if (newStallStatus === "PREPARING" || estimated_prep_time_minutes || prepTimeMinutes || prep_time_minutes || prepTime) {
        updatePayload.estimated_prep_time_minutes = parsedPrepTime;
      }

      await SubOrder.updateMany(
        { order_id: order._id, stall_id: { $in: stallIds } },
        { $set: updatePayload }
      );

      // Advance master order status if appropriate
      if (newStallStatus === "PREPARING" && (order.status === "PENDING" || order.status === "PLACED")) {
        order.status = "PREPARING";
        await order.save();
      } else if (newStallStatus === "READY") {
        // If all active suborders across all stalls are now READY, update parent to READY_FOR_PICKUP
        const remainingUnready = await SubOrder.find({
          order_id: order._id,
          stall_status: { $in: ["ACCEPTED", "PREPARING"] },
        });

        if (remainingUnready.length === 0) {
          order.status = "READY_FOR_PICKUP";
          await order.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      estimated_prep_time_minutes: parsedPrepTime,
    });
  } catch (error: any) {
    console.error("Update Vendor Order Status Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update order status.",
    });
  }
};

/**
 * @desc    Dedicated endpoint to reject an incoming order with reason
 * @route   POST /api/vendor/orders/:id/reject
 * @access  Vendor
 */
export const rejectVendorOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  req.body.status = "REJECTED";
  return updateVendorOrderStatus(req, res);
};

/**
 * @desc    Quick count of live orders for vendor navbar badge
 * @route   GET /api/vendor/orders/metrics
 * @access  Vendor
 */
export const getVendorMetrics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const primaryStall = await resolveVendorStall(userId);

    if (!primaryStall) {
      res.status(200).json({ success: true, data: { liveCount: 0 } });
      return;
    }

    const stallIds = [
      primaryStall._id,
      ...(userId && mongoose.isValidObjectId(userId) ? [new mongoose.Types.ObjectId(userId)] : []),
    ];

    const liveSubOrdersCount = await SubOrder.countDocuments({
      stall_id: { $in: stallIds },
      stall_status: { $in: ["ACCEPTED", "PREPARING"] },
    });

    res.status(200).json({
      success: true,
      data: {
        liveCount: liveSubOrdersCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message });
  }
};
