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
import { memoryCache } from "../utils/cache.ts";
import { createNotification } from "../utils/notificationHelper.ts";

// @desc    Get admin dashboard overview statistics & dynamic revenue trend
// @route   GET /api/admin/overview
// @access  Admin
export const getAdminOverviewStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const isFresh = _req.query.fresh === "true";
    if (!isFresh) {
      const cached = memoryCache.get("admin_overview_stats");
      if (cached) {
        res.status(200).json(cached);
        return;
      }
    }
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
        verification_status: { $in: ["PENDING", null, undefined] },
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

    // 2. Order metrics, platform revenue & payouts
    const [orders, transactions] = await Promise.all([
      Order.find({ status: { $ne: "CANCELLED" } })
        .select("total_amount food_items_total delivery_fee tax_amount platform_fee_earned status payment_method payment_status cod_deposit_status cod_amount_held rider_earned_fee rider_id cluster_id delivered_at order_number createdAt updatedAt")
        .lean(),
      Transaction.find().lean(),
    ]);

    // Build fast transaction lookup map for real-time settlement synchronization
    const txnMap = new Map<string, any>();
    (transactions || []).forEach((t: any) => {
      if (t.order_id) txnMap.set(t.order_id.toString(), t);
      if (t.order_number) txnMap.set(String(t.order_number).toUpperCase(), t);
    });

    let totalGrossRevenue = 0;
    let totalPlatformFee = 0;
    let totalDeliveryFees = 0;
    let todayGrossRevenue = 0;
    let todayPlatformFee = 0;
    let todayOrdersCount = 0;

    let totalVendorPayouts = 0;
    let pendingVendorPayouts = 0;
    let settledVendorPayouts = 0;

    let totalRiderPayouts = 0;
    let pendingRiderPayouts = 0;
    let settledRiderPayouts = 0;

    let pendingCodCollection = 0;
    let clearedCodDebt = 0;
    let todayClearedCodDebt = 0;

    let onlineGrossInflow = 0;
    let todayOnlineGrossInflow = 0;
    let onlineSettledVendorPayouts = 0;
    let onlineSettledRiderPayouts = 0;
    let todayOnlineSettledVendorPayouts = 0;
    let todayOnlineSettledRiderPayouts = 0;

    let codSettledVendorPayouts = 0;
    let todayCodSettledVendorPayouts = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    orders.forEach((o: any) => {
      const amt = Number(o.total_amount) || 0;
      const foodTotal = Number(o.food_items_total) || Math.max(0, amt - (Number(o.delivery_fee) || 0));
      // Platform commission: 15% platform take (or platform_fee_earned)
      const platFee = Number(o.platform_fee_earned) || Math.round(foodTotal * 0.15 * 100) / 100;
      const delFee = Number(o.delivery_fee) || 0;
      const riderShare = Number(o.rider_earned_fee || delFee || 50);
      const vendorShare = Math.round(Math.max(0, foodTotal * 0.95) * 100) / 100;

      totalGrossRevenue += amt;
      totalPlatformFee += platFee;
      totalDeliveryFees += delFee;

      totalVendorPayouts += vendorShare;
      totalRiderPayouts += riderShare;

      const oId = o._id?.toString();
      const oNum = o.order_number ? String(o.order_number).toUpperCase() : "";
      const txn = txnMap.get(oId) || (oNum ? txnMap.get(oNum) : null);

      const statusUpper = String(o.status || "").trim().toUpperCase();
      const isDelivered = statusUpper === "DELIVERED" || statusUpper === "COMPLETED" || Boolean(o.delivered_at);
      const isOnline = o.payment_method === "ONLINE";
      const isCod = o.payment_method === "COD";

      // Synchronize Vendor Settlement Status:
      // An order's vendor payout is settled once delivered, completed in Transaction, or credited to wallet
      const isVendorSettled =
        isDelivered ||
        txn?.settlement_status === "COMPLETED" ||
        (Array.isArray(txn?.vendor_payouts) && txn.vendor_payouts.some((vp: any) => vp.status === "COMPLETED"));

      // Synchronize Rider Settlement Status:
      // An order's rider payout is settled/paid once delivered, completed in Transaction, or credited
      const isRiderSettled =
        isDelivered ||
        txn?.settlement_status === "COMPLETED" ||
        txn?.rider_payout?.status === "COMPLETED";

      if (isOnline) {
        // 1. ONLINE PAYMENT LOGIC:
        // Customer pays full amount online -> first added in platform revenue
        onlineGrossInflow += amt;

        if (isVendorSettled) {
          settledVendorPayouts += vendorShare;
          onlineSettledVendorPayouts += vendorShare;
        } else {
          pendingVendorPayouts += vendorShare;
        }

        if (isRiderSettled) {
          settledRiderPayouts += riderShare;
          onlineSettledRiderPayouts += riderShare;
        } else {
          pendingRiderPayouts += riderShare;
        }
      } else if (isCod) {
        // 2. COD ORDER LOGIC:
        // Rider collects full cash amount directly from customer; rider takes full amount.
        const netDebt = o.cod_amount_held !== undefined && o.cod_amount_held < amt
          ? Number(o.cod_amount_held)
          : Math.max(0, amt - riderShare);

        if (isVendorSettled) {
          // Vendor payout is cut from platform (platform disburses vendor's food earnings)
          settledVendorPayouts += vendorShare;
          codSettledVendorPayouts += vendorShare;
        } else {
          pendingVendorPayouts += vendorShare;
        }

        if (isRiderSettled) {
          // Rider payout retained by rider from cash collected
          settledRiderPayouts += riderShare;
        } else {
          pendingRiderPayouts += riderShare;
        }

        if (o.cod_deposit_status === "DEPOSITED_TO_ADMIN") {
          // When rider clears COD debt -> amount added in platform revenue
          clearedCodDebt += netDebt;
          if ((o.delivered_at && new Date(o.delivered_at) >= todayStart) || (o.updatedAt && new Date(o.updatedAt) >= todayStart)) {
            todayClearedCodDebt += netDebt;
          }
        } else if (isDelivered || isRiderSettled || o.cod_deposit_status === "PENDING_DEPOSIT") {
          pendingCodCollection += netDebt;
        }
      }

      if (o.createdAt && new Date(o.createdAt) >= todayStart) {
        todayGrossRevenue += amt;
        todayPlatformFee += platFee;
        todayOrdersCount += 1;
        if (isOnline) {
          todayOnlineGrossInflow += amt;
          if (isVendorSettled) {
            todayOnlineSettledVendorPayouts += vendorShare;
          }
          if (isRiderSettled) {
            todayOnlineSettledRiderPayouts += riderShare;
          }
        } else if (isCod && isVendorSettled) {
          todayCodSettledVendorPayouts += vendorShare;
        }
      }
    });

    totalGrossRevenue = Math.round(totalGrossRevenue * 100) / 100;
    totalPlatformFee = Math.round(totalPlatformFee * 100) / 100;
    clearedCodDebt = Math.round(clearedCodDebt * 100) / 100;
    todayClearedCodDebt = Math.round(todayClearedCodDebt * 100) / 100;

    // Platform Revenue = (Online Gross Inflow - Settled Vendor - Settled Rider) + (Cleared Rider COD Debt - COD Vendor Payout Cut)
    const onlineNetPlatformRevenue = onlineGrossInflow - (onlineSettledVendorPayouts + onlineSettledRiderPayouts);
    const codNetPlatformRevenue = clearedCodDebt - codSettledVendorPayouts;
    const totalPlatformRevenue = Math.round((onlineNetPlatformRevenue + codNetPlatformRevenue) * 100) / 100;

    const todayOnlineNetRevenue = todayOnlineGrossInflow - (todayOnlineSettledVendorPayouts + todayOnlineSettledRiderPayouts);
    const todayCodNetRevenue = todayClearedCodDebt - todayCodSettledVendorPayouts;
    const todayPlatformRevenue = Math.round((todayOnlineNetRevenue + todayCodNetRevenue) * 100) / 100;

    todayGrossRevenue = Math.round(todayGrossRevenue * 100) / 100;
    pendingCodCollection = Math.round(pendingCodCollection * 100) / 100;
    totalVendorPayouts = Math.round(totalVendorPayouts * 100) / 100;
    pendingVendorPayouts = Math.round(pendingVendorPayouts * 100) / 100;
    settledVendorPayouts = Math.round(settledVendorPayouts * 100) / 100;
    totalRiderPayouts = Math.round(totalRiderPayouts * 100) / 100;
    pendingRiderPayouts = Math.round(pendingRiderPayouts * 100) / 100;
    settledRiderPayouts = Math.round(settledRiderPayouts * 100) / 100;

    // 2b. Compute Real-Time Stakeholder Rankings (Top Vendors, Riders, Clusters)
    const [allStalls, subOrders, allRiders, allClusters] = await Promise.all([
      Stall.find().populate("vendor_id", "name email phone_number").populate("cluster_id", "name city").lean(),
      SubOrder.find().lean(),
      User.find({ role: "RIDER" }).select("name phone_number email wallet_balance rating").lean(),
      Cluster.find().lean(),
    ]);

    // Vendor rankings map: Calculate 15% Platform Take (5% vendor commission + 10% customer markup) stall wise
    const stallStatsMap = new Map<string, { orders: number; revenue: number }>();
    subOrders.forEach((so: any) => {
      const sId = (so.stall_id?._id || so.stall_id)?.toString();
      if (!sId) return;
      // Derive food base price from 95% vendor earned amount or subtotal
      const foodBase = so.vendor_earned_amount
        ? (Number(so.vendor_earned_amount) / 0.95)
        : (Number(so.subtotal) || 0);
      // 15% Platform Revenue earned from this stall (5% vendor commission + 10% markup)
      const platformEarned15 = Math.round(foodBase * 0.15 * 100) / 100;

      const prev = stallStatsMap.get(sId) || { orders: 0, revenue: 0 };
      stallStatsMap.set(sId, {
        orders: prev.orders + 1,
        revenue: Math.round((prev.revenue + platformEarned15) * 100) / 100,
      });
    });

    const vendorRanks = allStalls
      .map((s: any) => {
        const stats = stallStatsMap.get(s._id.toString()) || { orders: 0, revenue: 0 };
        return {
          id: s._id.toString(),
          name: s.name,
          ownerName: s.vendor_id?.name || "Vendor Partner",
          clusterName: s.cluster_id?.name || "Khau Galli",
          city: s.cluster_id?.city || "Ahmedabad",
          rating: s.rating || 4.8,
          totalOrders: stats.orders || (s.rating_count ? Math.max(1, s.rating_count) : 0),
          totalRevenue: Math.round(stats.revenue * 100) / 100,
          imageUrl: s.cover_image_url || s.image_url || "",
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalOrders - a.totalOrders)
      .slice(0, 5)
      .map((v, idx) => ({ ...v, rank: idx + 1 }));

    // Rider rankings map
    const deliveredOrders = orders.filter((o: any) => {
      const statusUpper = String(o.status || "").trim().toUpperCase();
      return statusUpper === "DELIVERED" || statusUpper === "COMPLETED" || Boolean(o.delivered_at);
    });
    const riderOrdersMap = new Map<string, { deliveries: number; earnings: number }>();

    deliveredOrders.forEach((o: any) => {
      if (!o.rider_id) return;
      const rId = o.rider_id.toString();
      const prev = riderOrdersMap.get(rId) || { deliveries: 0, earnings: 0 };
      const fee = Number(o.rider_earned_fee || o.delivery_fee || 50);
      riderOrdersMap.set(rId, {
        deliveries: prev.deliveries + 1,
        earnings: prev.earnings + fee,
      });
    });

    const riderRanks = allRiders
      .map((r: any) => {
        const stats = riderOrdersMap.get(r._id.toString()) || { deliveries: 0, earnings: 0 };
        return {
          id: r._id.toString(),
          name: r.name,
          phone: r.phone_number || "Verified Rider",
          completedDeliveries: stats.deliveries,
          totalEarnings: Math.round(stats.earnings * 100) / 100,
          walletBalance: r.wallet_balance || 0,
          rating: r.rating || 4.9,
          onTimeRate: "99.2%",
        };
      })
      .sort((a, b) => b.completedDeliveries - a.completedDeliveries || b.totalEarnings - a.totalEarnings)
      .slice(0, 5)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    // Cluster rankings map
    const clusterStatsMap = new Map<string, { orders: number; volume: number }>();
    orders.forEach((o: any) => {
      if (!o.cluster_id) return;
      const cId = o.cluster_id.toString();
      const prev = clusterStatsMap.get(cId) || { orders: 0, volume: 0 };
      clusterStatsMap.set(cId, {
        orders: prev.orders + 1,
        volume: prev.volume + (Number(o.total_amount) || 0),
      });
    });

    const clusterRanks = allClusters
      .map((c: any) => {
        const stats = clusterStatsMap.get(c._id.toString()) || { orders: 0, volume: 0 };
        return {
          id: c._id.toString(),
          name: c.name,
          city: c.city || "Ahmedabad",
          totalOrders: stats.orders,
          totalVolume: Math.round(stats.volume * 100) / 100,
          activeStalls: allStalls.filter(
            (s: any) =>
              s.cluster_id?._id?.toString() === c._id.toString() ||
              s.cluster_id?.toString() === c._id.toString()
          ).length,
        };
      })
      .sort((a, b) => b.totalVolume - a.totalVolume || b.totalOrders - a.totalOrders)
      .slice(0, 5)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

    // 3. Last 7 Days Daily Revenue Trend Breakdown (Platform Fee Earnings)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyTrend: {
      name: string;
      date: string;
      fullDate: string;
      revenue: number;
      platformFee: number;
      clearedCodDebt: number;
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
      let dayOnlineInflow = 0;
      let dayOnlineSettledVendor = 0;
      let dayOnlineSettledRider = 0;
      let dayCodClearedDebt = 0;
      let dayCodSettledVendor = 0;
      let dayPlatformFee = 0;

      dayOrders.forEach((o: any) => {
        const amt = Number(o.total_amount) || 0;
        const foodTotal = Number(o.food_items_total) || Math.max(0, amt - (Number(o.delivery_fee) || 0));
        const platFee = Number(o.platform_fee_earned) || Math.round(foodTotal * 0.15 * 100) / 100;
        const delFee = Number(o.delivery_fee) || 0;
        const riderShare = Number(o.rider_earned_fee || delFee || 50);
        const vendorShare = Math.round(Math.max(0, foodTotal * 0.95) * 100) / 100;
        const isDelivered = o.status === "DELIVERED";

        dayPlatformFee += platFee;

        if (o.payment_method === "ONLINE") {
          dayOnlineInflow += amt;
          if (isDelivered) {
            dayOnlineSettledVendor += vendorShare;
            dayOnlineSettledRider += riderShare;
          }
        } else if (o.payment_method === "COD") {
          const netDebt = o.cod_amount_held !== undefined && o.cod_amount_held < amt
            ? Number(o.cod_amount_held)
            : Math.max(0, amt - riderShare);

          if (isDelivered) {
            dayCodSettledVendor += vendorShare;
            if (o.cod_deposit_status === "DEPOSITED_TO_ADMIN") {
              dayCodClearedDebt += netDebt;
            }
          }
        }
      });

      const dayTotalRevenue = Math.round(
        (dayOnlineInflow - dayOnlineSettledVendor - dayOnlineSettledRider + dayCodClearedDebt - dayCodSettledVendor) * 100
      ) / 100;

      dailyTrend.push({
        name: dayNames[d.getDay()],
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        fullDate: d.toISOString().split("T")[0],
        revenue: dayTotalRevenue, // Net platform revenue following cash flow rules
        platformFee: Math.round(dayPlatformFee * 100) / 100,
        clearedCodDebt: Math.round(dayCodClearedDebt * 100) / 100,
        grossRevenue: Math.round(dayGrossRevenue * 100) / 100,
        orders: dayOrders.length,
      });
    }

    const responsePayload = {
      success: true,
      data: {
        customers: customersCount,
        vendors: vendorsCount,
        riders: ridersCount,
        admins: adminsCount,
        totalUsers: customersCount + vendorsCount + ridersCount + adminsCount,
        totalOrders: orders.length,
        liveOrders: liveOrdersCount,
        totalRevenue: totalPlatformRevenue,
        todayRevenue: todayPlatformRevenue,
        totalPlatformRevenue: totalPlatformRevenue,
        todayPlatformRevenue: todayPlatformRevenue,
        onlineGrossInflow: Math.round(onlineGrossInflow * 100) / 100,
        onlineSettledVendorPayouts: Math.round(onlineSettledVendorPayouts * 100) / 100,
        onlineSettledRiderPayouts: Math.round(onlineSettledRiderPayouts * 100) / 100,
        codSettledVendorPayouts: Math.round(codSettledVendorPayouts * 100) / 100,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        todayPlatformFee: Math.round(todayPlatformFee * 100) / 100,
        clearedCodDebt: Math.round(clearedCodDebt * 100) / 100,
        todayClearedCodDebt: Math.round(todayClearedCodDebt * 100) / 100,
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        todayGrossRevenue: Math.round(todayGrossRevenue * 100) / 100,
        pendingCodCollection: Math.round(pendingCodCollection * 100) / 100,
        vendorPayouts: {
          total: totalVendorPayouts,
          pending: pendingVendorPayouts,
          settled: settledVendorPayouts,
        },
        riderPayouts: {
          total: totalRiderPayouts,
          pending: pendingRiderPayouts,
          settled: settledRiderPayouts,
        },
        ranks: {
          vendors: vendorRanks,
          riders: riderRanks,
          clusters: clusterRanks,
        },
        pendingApprovals,
        revenueChart: dailyTrend,
        recentOrders,
        stats: {
          customers: customersCount,
          vendors: vendorsCount,
          riders: ridersCount,
          admins: adminsCount,
          totalUsers: customersCount + vendorsCount + ridersCount + adminsCount,
          totalRevenue: totalPlatformRevenue,
          todayRevenue: todayPlatformRevenue,
          totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
          totalPlatformRevenue: totalPlatformRevenue,
          todayPlatformRevenue: todayPlatformRevenue,
          onlineGrossInflow: Math.round(onlineGrossInflow * 100) / 100,
          onlineSettledVendorPayouts: Math.round(onlineSettledVendorPayouts * 100) / 100,
          onlineSettledRiderPayouts: Math.round(onlineSettledRiderPayouts * 100) / 100,
          codSettledVendorPayouts: Math.round(codSettledVendorPayouts * 100) / 100,
          totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
          clearedCodDebt: Math.round(clearedCodDebt * 100) / 100,
          todayClearedCodDebt: Math.round(todayClearedCodDebt * 100) / 100,
          totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
          pendingCodCollection: Math.round(pendingCodCollection * 100) / 100,
          vendorPayouts: {
            total: totalVendorPayouts,
            pending: pendingVendorPayouts,
            settled: settledVendorPayouts,
          },
          riderPayouts: {
            total: totalRiderPayouts,
            pending: pendingRiderPayouts,
            settled: settledRiderPayouts,
          },
          ranks: {
            vendors: vendorRanks,
            riders: riderRanks,
            clusters: clusterRanks,
          },
          totalOrders: orders.length,
          liveOrders: liveOrdersCount,
          todayGrossRevenue: Math.round(todayGrossRevenue * 100) / 100,
          todayPlatformRevenue: todayPlatformRevenue,
          todayOrdersCount,
          pendingApprovals,
        },
        revenueTrend: dailyTrend,
      },
    };

    memoryCache.set("admin_overview_stats", responsePayload, 60);

    res.status(200).json(responsePayload);
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
    const isFresh = _req.query.fresh === "true";
    if (!isFresh) {
      const cached = memoryCache.get("admin_transactions");
      if (cached) {
        res.status(200).json(cached);
        return;
      }
    }
    // 1. Auto-synchronize: Ensure all orders have a corresponding Transaction record
    try {
      const existingTxOrderIds = await Transaction.distinct("order_id");
      const existingIdSet = new Set((existingTxOrderIds || []).map((id: any) => id?.toString()));

      const unrecordedOrders = await Order.find({
        _id: { $nin: Array.from(existingIdSet) },
      }).limit(50).lean();

      if (unrecordedOrders.length > 0) {
        for (const o of unrecordedOrders) {
          const foodTotal = Number(o.food_items_total) || Math.max(0, (Number(o.total_amount) || 0) - (Number(o.delivery_fee) || 0));
          const deliveryFee = Number(o.delivery_fee) || 0;
          const platFee = Number(o.platform_fee_earned) || Math.round(foodTotal * 0.05);
          const vendorAmount = Math.max(0, foodTotal - platFee);

          // Find stalls for this order if suborders exist
          const subOrders = await SubOrder.find({ order_id: o._id }).populate("stall_id", "name vendor_id").lean();
          let vendorPayoutsList: any[] = [];
          if (subOrders.length > 0) {
            vendorPayoutsList = subOrders.map((so: any) => ({
              stall_id: so.stall_id?._id || so.stall_id,
              vendor_id: so.stall_id?.vendor_id || null,
              stall_name: so.stall_id?.name || "Khau Galli Stall",
              amount: Number(so.vendor_earned_amount) || Math.round(vendorAmount / subOrders.length),
              status: o.status === "DELIVERED" ? "COMPLETED" : "PENDING",
            }));
          } else {
            vendorPayoutsList = [{
              stall_id: new mongoose.Types.ObjectId(),
              vendor_id: null,
              stall_name: "Participating Food Stall",
              amount: vendorAmount,
              status: o.status === "DELIVERED" ? "COMPLETED" : "PENDING",
            }];
          }

          const isDelivered = o.status === "DELIVERED";
          await Transaction.create({
            order_id: o._id,
            order_number: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
            customer_id: o.customer_id,
            payment_method: o.payment_method || "ONLINE",
            payment_status: o.payment_status || (o.payment_method === "COD" ? "PENDING" : "PAID"),
            total_order_amount: Number(o.total_amount) || (foodTotal + deliveryFee),
            vendor_payouts: vendorPayoutsList,
            rider_payout: {
              rider_id: o.rider_id || null,
              amount: deliveryFee,
              status: isDelivered ? "COMPLETED" : "PENDING",
              cod_cash_collected: o.payment_method === "COD" && isDelivered ? Number(o.total_amount) : 0,
              cod_cash_debt: o.payment_method === "COD" && isDelivered && o.cod_deposit_status === "PENDING_DEPOSIT" ? Math.max(0, Number(o.total_amount) - deliveryFee) : 0,
            },
            platform_revenue: {
              vendor_commission_amount: platFee,
              customer_markup_amount: 0,
              total_platform_fee: platFee,
              tax_amount: Number(o.tax_amount) || 0,
              status: isDelivered ? "COMPLETED" : "PENDING",
            },
            settlement_status: isDelivered ? "COMPLETED" : (o.status === "CANCELLED" ? "CANCELLED" : "PENDING"),
            note: `Synchronized order settlement for MO-${o._id.toString().slice(-5).toUpperCase()}`,
          });
        }
      }
    } catch (syncErr) {
      console.warn("Background order transaction sync notice:", syncErr);
    }

    // 2. Fetch all transactions
    const transactions = await Transaction.find()
      .populate("customer_id", "name email phone_number")
      .populate("rider_payout.rider_id", "name phone_number")
      .populate("vendor_payouts.vendor_id", "name email phone_number")
      .populate("vendor_payouts.stall_id", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Separate withdrawal transactions from order-based transactions
    const withdrawalTxns: any[] = [];
    const orderTxns: any[] = [];

    for (const t of transactions) {
      const isWithdrawal = (t as any).order_number?.startsWith("WD-") ||
        (t as any).note?.includes("Payout Settlement");
      if (isWithdrawal) {
        withdrawalTxns.push(t);
      } else {
        orderTxns.push(t);
      }
    }

    const formattedTransactions = orderTxns.map((t: any) => {
      const vendorTotal = Array.isArray(t.vendor_payouts)
        ? t.vendor_payouts.reduce((sum: number, vp: any) => sum + (Number(vp.amount) || 0), 0)
        : 0;

      const stallNames = Array.isArray(t.vendor_payouts)
        ? t.vendor_payouts.map((vp: any) => vp.stall_name || vp.stall_id?.name || vp.vendor_id?.name).filter(Boolean).join(", ")
        : "";

      const riderName = t.rider_payout?.rider_id?.name || "";

      return {
        id: t._id.toString(),
        orderId: t.order_number || `ORD-${t.order_id?.toString().slice(-6).toUpperCase()}`,
        type: t.payment_method === "ONLINE" ? "ONLINE_ORDER" : "COD_ORDER",
        amount: Number(t.total_order_amount) || 0,
        vendorGain: Math.round(vendorTotal * 100) / 100,
        riderGain: Math.round((Number(t.rider_payout?.amount) || 0) * 100) / 100,
        platformGain: Math.round((Number(t.platform_revenue?.total_platform_fee) || 0) * 100) / 100,
        total: Number(t.total_order_amount) || 0,
        status: (t.settlement_status || "PENDING").toLowerCase(),
        user: t.customer_id
          ? {
            id: t.customer_id._id,
            name: t.customer_id.name,
            role: "CUSTOMER",
            email: t.customer_id.email,
            phone: t.customer_id.phone_number,
          }
          : null,
        vendorNames: stallNames || (t.note?.includes("Vendor Payout") ? "Vendor Payout" : ""),
        riderName,
        note: t.note || "",
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
          : "Recently",
      };
    });

    const payouts = formattedTransactions;

    // Format withdrawal transactions for the admin "Withdrawals" tab
    const withdrawals = withdrawalTxns.map((t: any) => {
      const isVendorWithdrawal = (t.note || "").includes("Vendor Payout");
      const isRiderWithdrawal = (t.note || "").includes("Rider Payout");

      // Determine who withdrew
      let recipientName = "Unknown";
      let recipientRole: "Vendor" | "Rider" = "Vendor";
      if (isVendorWithdrawal && Array.isArray(t.vendor_payouts) && t.vendor_payouts.length > 0) {
        const vp = t.vendor_payouts[0];
        recipientName = vp.vendor_id?.name || vp.stall_name || "Vendor";
        recipientRole = "Vendor";
      } else if (isRiderWithdrawal && t.rider_payout?.rider_id) {
        recipientName = t.rider_payout.rider_id.name || "Rider";
        recipientRole = "Rider";
      }

      // Extract bank info from the note (format: "... to BankName (A/C: AccNo)")
      let bankInfo = "";
      const noteStr = t.note || "";
      const bankMatch = noteStr.match(/to\s+(.+?)$/);
      if (bankMatch) bankInfo = bankMatch[1];

      return {
        id: t._id.toString(),
        txId: t.order_number || `WD-${t._id.toString().slice(-6).toUpperCase()}`,
        recipientName,
        recipientRole,
        amount: Number(t.total_order_amount) || 0,
        bankInfo,
        status: (t.settlement_status || "COMPLETED").toLowerCase(),
        note: noteStr,
        date: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "Recently",
      };
    });

    const totalWithdrawn = withdrawals.reduce((sum: number, w: any) => sum + (w.amount || 0), 0);

    // 3. Query all online customer refund requests & settlements
    const refundedOrders = await Order.find({
      payment_method: "ONLINE",
      $or: [
        { status: "CANCELLED" },
        { refund_status: { $in: ["PENDING", "COMPLETED"] } },
        { payment_status: "REFUNDED" },
        { refunded_amount: { $gt: 0 } },
      ],
    })
      .populate("customer_id", "name email phone_number upi_id")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const refunds = refundedOrders.map((ro: any) => {
      const isCompleted = ro.refund_status === "COMPLETED" || ro.payment_status === "REFUNDED";
      const statusLabel = isCompleted ? "Refunded" : "Pending";
      return {
        id: `REF-${ro._id.toString().slice(-6).toUpperCase()}`,
        orderDbId: ro._id.toString(),
        orderId: `MO-${ro._id.toString().slice(-5).toUpperCase()}`,
        customerName: ro.customer_id?.name || "Customer",
        customerPhone: ro.customer_id?.phone_number || "",
        customerEmail: ro.customer_id?.email || "",
        upiId: ro.customer_id?.upi_id || "Customer Source UPI",
        reason: ro.rejection_note || "Customer requested order cancellation",
        amount: Number(ro.refunded_amount || ro.total_amount || 0),
        status: statusLabel,
        paymentMethod: "ONLINE",
        date: ro.updatedAt || ro.createdAt
          ? new Date(ro.updatedAt || ro.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "Recently",
      };
    });

    // 4. Calculate floating COD cash held by riders in field & grouped rider ledger
    const pendingCodOrders = await Order.find({
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    })
      .populate("rider_id", "name phone_number email")
      .lean();

    const pendingCodRidersMap = new Map<string, any>();
    let floatingCodCash = 0;

    pendingCodOrders.forEach((o: any) => {
      const r = o.rider_id;
      const rId = (r?._id || r || "unknown").toString();
      const riderName = r?.name || "Rider Partner";
      const riderPhone = r?.phone_number || "Verified Rider";
      const riderFee = Number(o.rider_earned_fee || o.delivery_fee || 50);
      const netDebt = Math.max(0, (Number(o.total_amount) || 0) - riderFee);

      floatingCodCash += netDebt;

      const prev = pendingCodRidersMap.get(rId) || {
        riderId: rId,
        riderName,
        riderPhone,
        ordersCount: 0,
        orderIds: [],
        totalDebt: 0,
        lastDeliveredAt: o.delivered_at || o.createdAt,
      };

      prev.ordersCount += 1;
      prev.orderIds.push(`MO-${o._id.toString().slice(-5).toUpperCase()}`);
      prev.totalDebt += netDebt;
      pendingCodRidersMap.set(rId, prev);
    });

    floatingCodCash = Math.round(floatingCodCash * 100) / 100;
    const pendingCodRiders = Array.from(pendingCodRidersMap.values()).map((item: any) => ({
      ...item,
      totalDebt: Math.round(item.totalDebt * 100) / 100,
    }));

    // 5. Total Platform Commission & Stakeholder Payout Totals
    const allDeliveredOrders = await Order.find({ status: { $ne: "CANCELLED" } })
      .select("total_amount food_items_total delivery_fee platform_fee_earned status payment_method payment_status cod_deposit_status cod_amount_held rider_earned_fee delivered_at order_number")
      .lean();

    const adminTxnMap = new Map<string, any>();
    (transactions || []).forEach((t: any) => {
      if (t.order_id) adminTxnMap.set(t.order_id.toString(), t);
      if (t.order_number) adminTxnMap.set(String(t.order_number).toUpperCase(), t);
    });

    let totalPlatformFee = 0;
    let clearedCodDebt = 0;
    let totalVendorPayouts = 0;
    let settledVendorPayouts = 0;
    let pendingVendorPayouts = 0;

    let totalRiderPayouts = 0;
    let settledRiderPayouts = 0;
    let pendingRiderPayouts = 0;

    let onlineGrossInflow = 0;
    let onlineSettledVendorPayouts = 0;
    let onlineSettledRiderPayouts = 0;
    let codSettledVendorPayouts = 0;

    allDeliveredOrders.forEach((o: any) => {
      const amt = Number(o.total_amount) || 0;
      const foodTotal = Number(o.food_items_total) || Math.max(0, amt - (Number(o.delivery_fee) || 0));
      const platFee = Number(o.platform_fee_earned) || Math.round(foodTotal * 0.15 * 100) / 100;
      const vendorShare = Math.round(Math.max(0, foodTotal * 0.95) * 100) / 100;
      const riderShare = Number(o.rider_earned_fee || o.delivery_fee || 50);

      const oId = o._id?.toString();
      const oNum = o.order_number ? String(o.order_number).toUpperCase() : "";
      const txn = adminTxnMap.get(oId) || (oNum ? adminTxnMap.get(oNum) : null);

      const statusUpper = String(o.status || "").trim().toUpperCase();
      const isDelivered = statusUpper === "DELIVERED" || statusUpper === "COMPLETED" || Boolean(o.delivered_at);
      const isOnline = o.payment_method === "ONLINE";
      const isCod = o.payment_method === "COD";

      const isVendorSettled =
        isDelivered ||
        txn?.settlement_status === "COMPLETED" ||
        (Array.isArray(txn?.vendor_payouts) && txn.vendor_payouts.some((vp: any) => vp.status === "COMPLETED"));

      const isRiderSettled =
        isDelivered ||
        txn?.settlement_status === "COMPLETED" ||
        txn?.rider_payout?.status === "COMPLETED";

      totalPlatformFee += platFee;
      totalVendorPayouts += vendorShare;
      totalRiderPayouts += riderShare;

      if (isOnline) {
        // Online: Customer pays full amount online -> first added into platform revenue
        onlineGrossInflow += amt;

        if (isVendorSettled) {
          settledVendorPayouts += vendorShare;
          onlineSettledVendorPayouts += vendorShare;
        } else {
          pendingVendorPayouts += vendorShare;
        }

        if (isRiderSettled) {
          settledRiderPayouts += riderShare;
          onlineSettledRiderPayouts += riderShare;
        } else {
          pendingRiderPayouts += riderShare;
        }
      } else if (isCod) {
        // COD: Rider takes full amount; vendor payout cut from platform
        if (isVendorSettled) {
          settledVendorPayouts += vendorShare;
          codSettledVendorPayouts += vendorShare;
        } else {
          pendingVendorPayouts += vendorShare;
        }

        if (isRiderSettled) {
          settledRiderPayouts += riderShare;
        } else {
          pendingRiderPayouts += riderShare;
        }

        if (o.cod_deposit_status === "DEPOSITED_TO_ADMIN") {
          const netDebt = o.cod_amount_held !== undefined && o.cod_amount_held < amt
            ? Number(o.cod_amount_held)
            : Math.max(0, amt - riderShare);
          clearedCodDebt += netDebt;
        }
      }
    });

    clearedCodDebt = Math.round(clearedCodDebt * 100) / 100;
    const onlineNetRevenue = onlineGrossInflow - (onlineSettledVendorPayouts + onlineSettledRiderPayouts);
    const codNetRevenue = clearedCodDebt - codSettledVendorPayouts;
    const totalPlatformRevenue = Math.round((onlineNetRevenue + codNetRevenue) * 100) / 100;
    totalVendorPayouts = Math.round(totalVendorPayouts * 100) / 100;
    settledVendorPayouts = Math.round(settledVendorPayouts * 100) / 100;
    pendingVendorPayouts = Math.round(pendingVendorPayouts * 100) / 100;
    totalRiderPayouts = Math.round(totalRiderPayouts * 100) / 100;
    settledRiderPayouts = Math.round(settledRiderPayouts * 100) / 100;
    pendingRiderPayouts = Math.round(pendingRiderPayouts * 100) / 100;

    const responsePayload = {
      success: true,
      data: {
        all: formattedTransactions,
        payouts,
        refunds,
        withdrawals,
        totalWithdrawn,
        floatingCodCash,
        pendingCodCollection: floatingCodCash,
        clearedCodDebt,
        onlineGrossInflow: Math.round(onlineGrossInflow * 100) / 100,
        onlineSettledVendorPayouts: Math.round(onlineSettledVendorPayouts * 100) / 100,
        onlineSettledRiderPayouts: Math.round(onlineSettledRiderPayouts * 100) / 100,
        codSettledVendorPayouts: Math.round(codSettledVendorPayouts * 100) / 100,
        pendingCodRiders,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        totalPlatformRevenue,
        platformRevenue: totalPlatformRevenue,
        vendorPayouts: {
          total: totalVendorPayouts,
          pending: pendingVendorPayouts,
          settled: settledVendorPayouts,
        },
        riderPayouts: {
          total: totalRiderPayouts,
          pending: pendingRiderPayouts,
          settled: settledRiderPayouts,
        },
      },
    };

    memoryCache.set("admin_transactions", responsePayload, 60);

    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch transactions",
    });
  }
};

// @desc    Process pending payouts & settle transactions
// @route   POST /api/admin/transactions/process-payouts
// @access  Admin
export const processPendingPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.body;

    const now = new Date();
    if (transactionId) {
      await Transaction.findByIdAndUpdate(transactionId, {
        $set: {
          settlement_status: "COMPLETED",
          "vendor_payouts.$[].status": "COMPLETED",
          "vendor_payouts.$[].payout_at": now,
          "rider_payout.status": "COMPLETED",
          "rider_payout.payout_at": now,
          "platform_revenue.status": "COMPLETED",
          "platform_revenue.realized_at": now,
        },
      });
    } else {
      await Transaction.updateMany(
        { settlement_status: { $in: ["PENDING", "PARTIALLY_SETTLED"] } },
        {
          $set: {
            settlement_status: "COMPLETED",
            "vendor_payouts.$[].status": "COMPLETED",
            "vendor_payouts.$[].payout_at": now,
            "rider_payout.status": "COMPLETED",
            "rider_payout.payout_at": now,
            "platform_revenue.status": "COMPLETED",
            "platform_revenue.realized_at": now,
          },
        }
      );
    }

    memoryCache.invalidateAdminStats();

    res.status(200).json({
      success: true,
      message: "Payout settlements processed and marked as completed successfully.",
    });
  } catch (error: any) {
    console.error("Error processing payouts:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to process payouts",
    });
  }
};

// @desc    Settle and confirm rider COD cash deposit to platform
// @route   POST /api/admin/transactions/settle-rider-cod
// @access  Admin
export const settleRiderCodDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { riderId } = req.body;
    if (!riderId) {
      res.status(400).json({ success: false, message: "Rider ID is required." });
      return;
    }

    const pendingOrders = await Order.find({
      rider_id: riderId,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    });

    if (pendingOrders.length === 0) {
      res.status(400).json({ success: false, message: "No pending COD debt found for this rider." });
      return;
    }

    const totalCleared = pendingOrders.reduce((sum, o) => {
      const amt = Number(o.total_amount) || 0;
      const riderShare = Number(o.rider_earned_fee || o.delivery_fee || 50);
      const netDebt = o.cod_amount_held !== undefined && o.cod_amount_held < amt
        ? Number(o.cod_amount_held)
        : Math.max(0, amt - riderShare);
      return sum + netDebt;
    }, 0);

    const now = new Date();

    // 1. Mark orders as deposited to admin
    await Order.updateMany(
      {
        rider_id: riderId,
        payment_method: "COD",
        cod_deposit_status: "PENDING_DEPOSIT",
      },
      {
        $set: {
          cod_deposit_status: "DEPOSITED_TO_ADMIN",
          updatedAt: now,
        },
      }
    );

    // 2. Reset rider floating cash debt
    await User.findByIdAndUpdate(riderId, {
      $set: { floating_cash_debt: 0 },
    });

    // 3. Mark transaction records completed
    const orderIds = pendingOrders.map((o) => o._id);
    await Transaction.updateMany(
      { order_id: { $in: orderIds } },
      {
        $set: {
          "rider_payout.cod_cash_debt": 0,
          "platform_revenue.status": "COMPLETED",
          "platform_revenue.realized_at": now,
          settlement_status: "COMPLETED",
        },
      }
    ).catch(() => {});

    memoryCache.invalidateAdminStats();

    res.status(200).json({
      success: true,
      message: `Successfully confirmed ₹${Math.round(totalCleared * 100) / 100} of COD cash collection from rider. Amount added to platform revenue!`,
      data: {
        clearedAmount: Math.round(totalCleared * 100) / 100,
        riderId,
      },
    });
  } catch (error: any) {
    console.error("Error settling rider COD debt:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to settle rider COD debt.",
    });
  }
};

// @desc    Process customer refund for online order & notify customer UPI payout
// @route   POST /api/admin/transactions/process-refund
// @access  Admin
export const processCustomerRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: "Order ID is required." });
      return;
    }

    let order: any = null;
    if (mongoose.isValidObjectId(orderId)) {
      order = await Order.findById(orderId).populate("customer_id");
    }
    if (!order) {
      order = await Order.findOne({
        order_number: orderId.startsWith("MO-") ? orderId : `MO-${orderId}`,
      }).populate("customer_id");
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    if (order.payment_method !== "ONLINE") {
      res.status(400).json({
        success: false,
        message: "Only online orders require refund processing. COD orders do not involve customer pre-payment.",
      });
      return;
    }

    const now = new Date();
    const refundAmt = Number(order.refunded_amount || order.total_amount || 0);

    order.refund_status = "COMPLETED";
    order.payment_status = "REFUNDED";
    order.refunded_amount = refundAmt;
    order.refunded_at = now;
    await order.save();

    // Update Transaction record
    await Transaction.findOneAndUpdate(
      { order_id: order._id },
      {
        $set: {
          settlement_status: "COMPLETED",
          note: `Customer refund of ₹${refundAmt} processed by admin to source UPI/bank account.`,
        },
      }
    ).catch(() => {});

    memoryCache.invalidateAdminStats();

    // Customer Notification: "your payment refunded on your upi id"
    const customerId = order.customer_id?._id || order.customer_id;
    const cleanCode = (((order as any).order_number || order._id.toString().slice(-5)) as string).toUpperCase().replace(/^MO-/, "");

    if (customerId) {
      await createNotification({
        userId: customerId,
        type: "PAYOUT",
        title: "Refund Completed! 💸",
        message: `Your payment of ₹${refundAmt} for Order #${cleanCode} has been refunded to your UPI ID.`,
        orderId: order._id,
        amount: refundAmt,
      });
    }

    res.status(200).json({
      success: true,
      message: `Refund of ₹${refundAmt} successfully processed for Order #${cleanCode}. Notification delivered to customer.`,
      data: {
        orderId: order._id,
        orderCode: `MO-${cleanCode}`,
        refundAmount: refundAmt,
        refundStatus: "COMPLETED",
        refundedAt: now,
      },
    });
  } catch (error: any) {
    console.error("Error processing customer refund:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to process customer refund.",
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
      verification_status: { $in: ["PENDING", null, undefined] },
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

    memoryCache.invalidateAdminStats();

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

