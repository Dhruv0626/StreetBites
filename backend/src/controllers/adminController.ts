import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.ts";
import { Feedback } from "../models/Feedback.ts";
import { Order } from "../models/Order.ts";
import { User } from "../models/User.ts";
import { Stall } from "../models/Stall.ts";
import { FoodItem } from "../models/FoodItem.ts";
import { Cluster } from "../models/Cluster.ts";
import { SubOrder } from "../models/SubOrder.ts";

// @desc    Get admin dashboard overview statistics & dynamic revenue trend
// @route   GET /api/admin/overview
// @access  Admin
export const getAdminOverviewStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. User counts
    const [
      customersCount,
      vendorsCount,
      ridersCount,
      adminsCount,
      liveOrdersCount,
      pendingKycCount,
      pendingFoodCount,
      recentOrdersDocs,
    ] = await Promise.all([
      User.countDocuments({ role: "CUSTOMER" }),
      User.countDocuments({ role: "VENDOR" }),
      User.countDocuments({ role: "RIDER" }),
      User.countDocuments({ role: "ADMIN" }),
      Order.countDocuments({
        status: {
          $in: [
            "PENDING",
            "PREPARING",
            "READY_FOR_PICKUP",
            "OUT_FOR_DELIVERY",
            "RIDER_AT_DOOR",
            "AT_DOOR",
          ],
        },
      }),
      User.countDocuments({
        verification_status: "PENDING",
        role: { $in: ["VENDOR", "RIDER"] },
      }),
      FoodItem.countDocuments({
        status: { $in: ["Review_pending", "PENDING_REVIEW"] },
      }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("customer_id", "name email phone_number")
        .populate("cluster_id", "name city")
        .lean(),
    ]);

    const pendingApprovals = pendingKycCount + pendingFoodCount;

    const recentOrders = (recentOrdersDocs || []).map((o: any) => ({
      id: o._id.toString(),
      orderNumber: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
      customerName: o.customer_id?.name || "Customer",
      clusterName: o.cluster_id?.name || "Khau Galli",
      totalAmount: o.total_amount || 0,
      paymentMethod: o.payment_method || "ONLINE",
      status: o.status || "PENDING",
      date: o.createdAt
        ? new Date(o.createdAt).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recent",
    }));

    // 2. Order metrics & gross revenue
    const orders = await Order.find({ status: { $ne: "CANCELLED" } })
      .select("total_amount food_items_total delivery_fee tax_amount platform_fee_earned status payment_method createdAt")
      .lean();

    let totalGrossRevenue = 0;
    let totalPlatformFee = 0;
    let totalDeliveryFees = 0;
    let todayGrossRevenue = 0;
    let todayPlatformFee = 0;
    let todayOrdersCount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find().lean();
    let txGrossTotal = 0;
    let txPlatformGain = 0;
    transactions.forEach((t: any) => {
      const tAmt = Number(t.total_order_amount) || 0;
      const tFee = Number(t.platform_revenue?.total_platform_fee) || 0;
      txGrossTotal += tAmt;
      txPlatformGain += tFee;
      if (t.createdAt && new Date(t.createdAt) >= todayStart) {
        todayPlatformFee += tFee;
      }
    });

    orders.forEach((o: any) => {
      const amt = Number(o.total_amount) || 0;
      const platFee = Number(o.platform_fee_earned) || Math.round((Number(o.food_items_total) || 0) * 0.15);
      const delFee = Number(o.delivery_fee) || 0;

      totalGrossRevenue += amt;
      totalPlatformFee += platFee;
      totalDeliveryFees += delFee;

      if (o.createdAt && new Date(o.createdAt) >= todayStart) {
        todayGrossRevenue += amt;
        todayPlatformFee += platFee;
        todayOrdersCount += 1;
      }
    });

    if (txGrossTotal > totalGrossRevenue) {
      totalGrossRevenue = txGrossTotal;
    }
    if (txPlatformGain > totalPlatformFee) {
      totalPlatformFee = txPlatformGain;
    }

    // 3. Last 7 Days Daily Revenue Trend Breakdown (Platform Fee Earnings)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyTrend: {
      name: string;
      date: string;
      fullDate: string;
      revenue: number;
      platformFee: number;
      grossRevenue: number;
      orders: number;
    }[] = [];

    // Build last 7 days array (from 6 days ago up to today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayOrders = orders.filter((o: any) => {
        if (!o.createdAt) return false;
        const ordDate = new Date(o.createdAt);
        return ordDate >= startOfDay && ordDate <= endOfDay;
      });

      const dayGrossRevenue = dayOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const dayPlatformFee = dayOrders.reduce(
        (sum: number, o: any) =>
          sum + (Number(o.platform_fee_earned) || Math.round((Number(o.food_items_total) || 0) * 0.15)),
        0
      );

      const dayTx = transactions.filter((t: any) => {
        if (!t.createdAt) return false;
        const txDate = new Date(t.createdAt);
        return txDate >= startOfDay && txDate <= endOfDay;
      });
      const dayTxGrossRevenue = dayTx.reduce((sum: number, t: any) => sum + (Number(t.total_order_amount) || 0), 0);
      const dayTxPlatformFee = dayTx.reduce(
        (sum: number, t: any) => sum + (Number(t.platform_revenue?.total_platform_fee) || 0),
        0
      );

      const finalDayGross = Math.max(dayGrossRevenue, dayTxGrossRevenue);
      const finalDayPlatform = Math.max(dayPlatformFee, dayTxPlatformFee);

      dailyTrend.push({
        name: dayNames[d.getDay()],
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        fullDate: d.toISOString().split("T")[0],
        revenue: Math.round(finalDayPlatform * 100) / 100, // Platform earnings for chart
        platformFee: Math.round(finalDayPlatform * 100) / 100,
        grossRevenue: Math.round(finalDayGross * 100) / 100,
        orders: dayOrders.length || dayTx.length,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        customers: customersCount,
        vendors: vendorsCount,
        riders: ridersCount,
        admins: adminsCount,
        totalUsers: customersCount + vendorsCount + ridersCount + adminsCount,
        totalOrders: orders.length,
        liveOrders: liveOrdersCount,
        totalRevenue: Math.round(totalPlatformFee * 100) / 100, // Platform earnings
        todayRevenue: Math.round(todayPlatformFee * 100) / 100, // Today's platform earnings
        totalPlatformRevenue: Math.round(totalPlatformFee * 100) / 100,
        todayPlatformRevenue: Math.round(todayPlatformFee * 100) / 100,
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        todayGrossRevenue: Math.round(todayGrossRevenue * 100) / 100,
        pendingApprovals,
        revenueChart: dailyTrend,
        recentOrders,
        stats: {
          customers: customersCount,
          vendors: vendorsCount,
          riders: ridersCount,
          admins: adminsCount,
          totalUsers: customersCount + vendorsCount + ridersCount + adminsCount,
          totalRevenue: Math.round(totalPlatformFee * 100) / 100,
          todayRevenue: Math.round(todayPlatformFee * 100) / 100,
          totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
          totalPlatformRevenue: Math.round(totalPlatformFee * 100) / 100,
          totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
          totalOrders: orders.length,
          liveOrders: liveOrdersCount,
          todayGrossRevenue: Math.round(todayGrossRevenue * 100) / 100,
          todayPlatformRevenue: Math.round(todayPlatformFee * 100) / 100,
          todayOrdersCount,
          pendingApprovals,
        },
        revenueTrend: dailyTrend,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin overview stats:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch overview stats",
    });
  }
};

// @desc    Get all transactions & financial summaries
// @route   GET /api/admin/transactions
// @access  Admin
export const getAdminTransactions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find()
      .populate("customer_id", "name email phone_number")
      .populate("rider_payout.rider_id", "name phone_number")
      .populate("vendor_payouts.vendor_id", "name email phone_number")
      .populate("vendor_payouts.stall_id", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formattedTransactions = transactions.map((t: any) => {
      const vendorTotal = Array.isArray(t.vendor_payouts)
        ? t.vendor_payouts.reduce((sum: number, vp: any) => sum + (vp.amount || 0), 0)
        : 0;

      return {
        id: t._id.toString(),
        orderId: t.order_number || `ORD-${t.order_id?.toString().slice(-6).toUpperCase()}`,
        type: t.payment_method === "ONLINE" ? "ONLINE_ORDER" : "COD_ORDER",
        amount: t.total_order_amount || 0,
        vendorGain: Math.round(vendorTotal * 100) / 100,
        riderGain: Math.round((t.rider_payout?.amount || 0) * 100) / 100,
        platformGain: Math.round((t.platform_revenue?.total_platform_fee || 0) * 100) / 100,
        total: t.total_order_amount || 0,
        status: t.settlement_status?.toLowerCase() || "pending",
        user: t.customer_id
          ? {
            id: t.customer_id._id,
            name: t.customer_id.name,
            role: "CUSTOMER",
            email: t.customer_id.email,
            phone: t.customer_id.phone_number,
          }
          : null,
        vendorPayouts: t.vendor_payouts || [],
        riderPayout: t.rider_payout || {},
        platformRevenue: t.platform_revenue || {},
        date: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "N/A",
      };
    });

    const payouts = formattedTransactions;
    const refunds: any[] = [];

    // Calculate floating COD cash held by riders in field
    const pendingCodOrders = await Order.find({
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    });
    const floatingCodCash = pendingCodOrders.reduce(
      (sum, o) => sum + (o.cod_amount_held || o.total_amount || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        all: formattedTransactions,
        payouts,
        refunds,
        floatingCodCash,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch transactions",
    });
  }
};

// @desc    Process pending payouts
// @route   POST /api/admin/transactions/process-payouts
// @access  Admin
export const processPendingPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.body;

    if (transactionId) {
      await Transaction.findByIdAndUpdate(transactionId, { status: "COMPLETED" });
    } else {
      await Transaction.updateMany(
        { status: { $in: ["PENDING", "PROCESSING"] } },
        { status: "COMPLETED" }
      );
    }

    res.status(200).json({
      success: true,
      message: "Payouts processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payouts:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to process payouts",
    });
  }
};

// @desc    Get all complaints & disputes
// @route   GET /api/admin/complaints
// @access  Admin
export const getAdminComplaints = async (_req: Request, res: Response): Promise<void> => {
  try {
    const complaints = await Feedback.find({ feedback_type: "COMPLAINT" })
      .populate("user_id", "name email phone_number role")
      .populate("order_id", "total_amount status")
      .populate("stall_id", "stall_name")
      .sort({ createdAt: -1 })
      .lean();

    const formattedComplaints = complaints.map((c: any) => ({
      id: `TKT-${c._id.toString().slice(-6).toUpperCase()}`,
      _id: c._id.toString(),
      user: c.user_id?.name || "Anonymous User",
      role: c.user_id?.role ? (c.user_id.role.charAt(0) + c.user_id.role.slice(1).toLowerCase()) : "Customer",
      email: c.user_id?.email || "N/A",
      phone: c.user_id?.phone_number || "N/A",
      orderId: c.order_id?._id ? `ORD-${c.order_id._id.toString().slice(-6).toUpperCase()}` : "N/A",
      stall: c.stall_id?.stall_name || "N/A",
      issue: c.comment || c.issue_type?.replace(/_/g, " ") || "No issue description provided",
      issueType: c.issue_type || "OTHER",
      priority: c.issue_type === "FOOD_QUALITY" || c.issue_type === "RIDER_BEHAVIOR" ? "High" : "Medium",
      status: c.status === "OPEN" ? "Open" : c.status === "IN_PROGRESS" ? "In Progress" : "Resolved",
      time: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }) : "Just now",
    }));

    res.status(200).json({
      success: true,
      data: formattedComplaints,
    });
  } catch (error: any) {
    console.error("Error fetching admin complaints:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch complaints",
    });
  }
};

// @desc    Update complaint status
// @route   PATCH /api/admin/complaints/:id/status
// @access  Admin
export const updateComplaintStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: "Complaint ticket not found",
      });
      return;
    }

    const upperStatus = status?.toUpperCase() || "RESOLVED";
    feedback.status = upperStatus as any;
    await feedback.save();

    res.status(200).json({
      success: true,
      message: `Complaint marked as ${upperStatus}`,
      data: feedback,
    });
  } catch (error: any) {
    console.error("Error updating complaint status:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update complaint status",
    });
  }
};

// @desc    Get live active orders for admin map tracking
// @route   GET /api/admin/orders
// @access  Admin
export const getAdminLiveOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({
      status: { $in: ["PENDING", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "RIDER_AT_DOOR", "AT_DOOR"] },
    })
      .populate("customer_id", "name phone_number email")
      .populate("rider_id", "name phone_number email")
      .populate("cluster_id", "name coordinates city")
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map((o: any) => o._id);
    const subOrders = await SubOrder.find({ order_id: { $in: orderIds } })
      .populate("stall_id", "name stall_category menu_items rating")
      .lean();

    const subOrdersByOrderId = new Map<string, any[]>();
    for (const so of subOrders) {
      const oid = so.order_id.toString();
      if (!subOrdersByOrderId.has(oid)) {
        subOrdersByOrderId.set(oid, []);
      }
      subOrdersByOrderId.get(oid)!.push(so);
    }

    const formattedOrders = orders.map((o: any) => {
      const orderSubOrders = subOrdersByOrderId.get(o._id.toString()) || [];

      const stallsList: any[] = [];
      const stallSet = new Set<string>();

      orderSubOrders.forEach((so: any) => {
        const stall = so.stall_id;
        if (stall && !stallSet.has(stall._id?.toString())) {
          stallSet.add(stall._id?.toString());
          const menuItem = (stall.menu_items || []).find(
            (m: any) => m._id?.toString() === so.item_id?.toString()
          );
          stallsList.push({
            stallId: stall._id?.toString(),
            name: stall.name,
            category: stall.stall_category,
            status: so.stall_status,
            item: menuItem?.name || "Street Food Item",
            quantity: so.quantity,
          });
        }
      });

      // Parse coordinates
      const pickupCoords: [number, number] = [
        o.cluster_id?.coordinates?.coordinates?.[0] || 72.5714,
        o.cluster_id?.coordinates?.coordinates?.[1] || 23.0225,
      ];

      let dropCoords: [number, number] | null = null;
      if (o.delivery_coordinates) {
        if (Array.isArray(o.delivery_coordinates.coordinates)) {
          dropCoords = [o.delivery_coordinates.coordinates[0], o.delivery_coordinates.coordinates[1]];
        } else if (Array.isArray(o.delivery_coordinates)) {
          dropCoords = [o.delivery_coordinates[0], o.delivery_coordinates[1]];
        }
      }

      // Friendly display status
      let displayStatus: "In Transit" | "Delayed" | "At Stall" | "At Door" | "Pending" = "At Stall";
      if (o.status === "OUT_FOR_DELIVERY") displayStatus = "In Transit";
      else if (o.status === "RIDER_AT_DOOR" || o.status === "AT_DOOR") displayStatus = "At Door";
      else if (o.status === "PENDING") displayStatus = "Pending";
      else if (o.status === "PREPARING" || o.status === "READY_FOR_PICKUP") displayStatus = "At Stall";

      return {
        id: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
        _id: o._id.toString(),
        vendor: o.cluster_id?.name || (stallsList[0]?.name ? `${stallsList[0].name}` : "Food Hub"),
        clusterName: o.cluster_id?.name || "Street Food Hub",
        rider: o.rider_id?.name || "Unassigned",
        riderPhone: o.rider_id?.phone_number || "N/A",
        riderEmail: o.rider_id?.email || "",
        customer: o.customer_id?.name || "Customer",
        customerPhone: o.customer_id?.phone_number || "N/A",
        customerEmail: o.customer_id?.email || "",
        status: displayStatus,
        rawStatus: o.status,
        deliveryAddress: o.delivery_address || "Ahmedabad",
        deliveryOtp: o.delivery_otp,
        time: o.createdAt
          ? new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Just now",
        issue: null,
        position: pickupCoords,
        pickupCoords,
        dropCoords: dropCoords || pickupCoords,
        stalls: stallsList,
        totalAmount: o.total_amount,
        paymentMethod: o.payment_method || "ONLINE",
        collectedCheckpoints: o.collected_checkpoints || [],
      };
    });

    res.status(200).json({
      success: true,
      data: formattedOrders,
    });
  } catch (error: any) {
    console.error("Error fetching live admin orders:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch live orders",
    });
  }
};

// @desc    Get all food items (master categories) for admin review & approval
// @route   GET /api/admin/food-items
// @access  Admin
export const getAdminFoodItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filterStatus = typeof status === "string" ? status.toLowerCase() : "all";

    // Fetch all master food items
    const masterItems = await FoodItem.find().sort({ createdAt: -1 }).lean();

    // Fetch users for any items that have created_by
    const createdByIds = masterItems
      .map((m: any) => m.created_by)
      .filter((id: any) => id && mongoose.isValidObjectId(id));
    const createdUsers =
      createdByIds.length > 0
        ? await User.find({ _id: { $in: createdByIds } }).lean()
        : [];

    // Also get all stalls to link or fallback vendor information
    const stalls: any[] = await Stall.find()
      .populate("vendor_id", "name email phone_number")
      .populate("cluster_id", "name city")
      .lean();

    const clusters: any[] = await Cluster.find().lean();
    const defaultCluster: any = clusters.length > 0 ? clusters[0] : null;
    const fallbackVendor: any = await User.findOne({ role: "VENDOR" }).lean();

    let allFoodItems = masterItems.map((m: any) => {
      const mStatus =
        (m.status || "").toLowerCase() === "approved"
          ? "Approved"
          : (m.status || "").toLowerCase() === "rejected"
            ? "Rejected"
            : "Review_pending";

      const createdUser: any = createdUsers.find(
        (u: any) => u._id.toString() === m.created_by?.toString()
      );

      // Find stall linked directly by stall_id or by createdUser vendor_id
      let linkedStall: any = stalls.find(
        (s: any) => s._id.toString() === m.stall_id?.toString()
      );
      if (!linkedStall && createdUser) {
        linkedStall = stalls.find(
          (s: any) =>
            s.vendor_id?._id?.toString() === createdUser._id.toString() ||
            s.vendor_id?.toString() === createdUser._id.toString()
        );
      }

      // If missing, look for stall with matching menu_items or stall_category
      if (!linkedStall) {
        linkedStall = stalls.find(
          (s: any) =>
            (s.menu_items || []).some(
              (item: any) =>
                (item.food_item_id && item.food_item_id.toString() === m._id.toString()) ||
                (item.name && item.name.toLowerCase().includes(m.name.toLowerCase()))
            ) ||
            (s.stall_category && s.stall_category.toLowerCase().includes(m.name.toLowerCase()))
        );
      }

      // 1. Resolve Vendor Contact Info
      let vendorName = createdUser?.name || linkedStall?.vendor_id?.name || fallbackVendor?.name || "Vendor Partner";
      let vendorEmail = createdUser?.email || linkedStall?.vendor_id?.email || fallbackVendor?.email || "vendor@streetbites.in";
      let vendorPhone = createdUser?.phone_number || linkedStall?.vendor_id?.phone_number || fallbackVendor?.phone_number || "+91 98765 43210";

      // 2. Resolve Stall Info
      let stallName = linkedStall?.name || `${vendorName}'s Stall`;
      let stallCategory = linkedStall?.stall_category || m.name;

      // 3. Resolve Cluster Info accurately
      let clusterName = "";
      let clusterCity = "";

      const clusterObj = linkedStall?.cluster_id;
      if (clusterObj) {
        if (typeof clusterObj === "object" && clusterObj.name) {
          clusterName = clusterObj.name;
          clusterCity = clusterObj.city || "Ahmedabad";
        } else {
          const matchedCluster = clusters.find(
            (c: any) => c._id?.toString() === clusterObj?.toString()
          );
          if (matchedCluster) {
            clusterName = matchedCluster.name;
            clusterCity = matchedCluster.city || "Ahmedabad";
          }
        }
      }

      // If still missing, use default cluster from DB
      if (!clusterName && defaultCluster) {
        clusterName = defaultCluster.name;
        clusterCity = defaultCluster.city || "Ahmedabad";
      }

      if (!clusterName) {
        clusterName = "Khau Galli";
        clusterCity = "Ahmedabad";
      }

      return {
        id: m._id.toString(),
        _id: m._id.toString(),
        name: m.name,
        description: `Freshly prepared authentic street food: ${m.name}`,
        image_url: m.image_url || "",
        status: mStatus,
        vendorName,
        vendorEmail,
        vendorPhone,
        stallName,
        stallCategory,
        clusterName,
        clusterCity,
        createdAt: m.createdAt || new Date(),
      };
    });

    // Filter by status if requested
    if (filterStatus !== "all" && filterStatus !== "") {
      if (filterStatus === "review_pending" || filterStatus === "pending") {
        allFoodItems = allFoodItems.filter((i) => i.status === "Review_pending");
      } else if (filterStatus === "approved") {
        allFoodItems = allFoodItems.filter((i) => i.status === "Approved");
      } else if (filterStatus === "rejected") {
        allFoodItems = allFoodItems.filter((i) => i.status === "Rejected");
      }
    }

    // Sort: Review_pending first, then by date descending
    allFoodItems.sort((a, b) => {
      if (a.status === "Review_pending" && b.status !== "Review_pending") return -1;
      if (b.status === "Review_pending" && a.status !== "Review_pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.status(200).json({
      success: true,
      count: allFoodItems.length,
      data: allFoodItems,
    });
  } catch (error: any) {
    console.error("Error fetching admin food items:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch food items for review",
    });
  }
};

// @desc    Get real-time admin counts for sidebar badges (Approvals, Live Orders, Complaints)
// @route   GET /api/admin/counts
// @access  Admin
export const getAdminCounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pendingKyc = await User.countDocuments({
      role: { $in: ["VENDOR", "RIDER"] },
      verification_status: "PENDING",
    });

    const pendingMasterFoodItems = await FoodItem.countDocuments({
      status: { $in: ["Review_pending", "PENDING_REVIEW"] },
    });

    const totalApprovals = pendingKyc + pendingMasterFoodItems;

    const liveOrders = await Order.countDocuments({
      status: { $in: ["PENDING", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
    });

    const openComplaints = await Feedback.countDocuments({
      feedback_type: "COMPLAINT",
      status: "OPEN",
    });

    res.status(200).json({
      success: true,
      data: {
        approvals: totalApprovals,
        pendingKyc,
        pendingFoodItems: pendingMasterFoodItems,
        orders: liveOrders,
        complaints: openComplaints,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin counts:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch counts",
    });
  }
};

// @desc    Update food item approval status (Approve / Reject / Reset)
// @route   PATCH /api/admin/food-items/:id/status
// @access  Admin
export const updateFoodItemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required" });
      return;
    }

    const lower = (status || "").toLowerCase().trim();
    const newStatus: "Review_pending" | "Approved" | "Rejected" =
      lower === "approved" ? "Approved" : lower === "rejected" ? "Rejected" : "Review_pending";

    if (mongoose.isValidObjectId(id)) {
      await FoodItem.findByIdAndUpdate(id, { status: newStatus });
    }

    res.status(200).json({
      success: true,
      message: `Food item status updated to ${newStatus}`,
      data: { id, status: newStatus },
    });
  } catch (error: any) {
    console.error("Error updating food item status:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update food item status",
    });
  }
};

