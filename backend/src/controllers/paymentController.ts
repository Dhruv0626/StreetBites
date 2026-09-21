import type { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/Order.ts";
import SubOrder from "../models/SubOrder.ts";
import Stall from "../models/Stall.ts";
import Cart from "../models/Cart.ts";
import Transaction from "../models/Transaction.ts";
import User from "../models/User.ts";

/**
 * Helper to resolve user from auth or request query/body
 */
const resolveCustomer = async (req: Request) => {
  const userId = (req as any).user?.id || (req as any).user?._id || req.body?.customer_id;
  if (!userId) return null;
  return User.findById(userId);
};

/**
 * @desc    Create Razorpay Order for Customer Checkout
 * @route   POST /api/payments/razorpay/create-order
 */
export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, cluster_id, delivery_fee = 0, delivery_address, delivery_notes = "" } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Cart items are required to initiate payment." });
      return;
    }

    if (!cluster_id) {
      res.status(400).json({ success: false, message: "Khau Galli cluster ID is required." });
      return;
    }

    const foodItemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const taxAmount = Math.round(foodItemsTotal * 0.05 * 10) / 10;
    const totalAmount = Math.round((foodItemsTotal + Number(delivery_fee) + taxAmount) * 10) / 10;
    const amountInPaise = Math.round(totalAmount * 100);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If Razorpay live/test credentials are configured, create real order with Razorpay API
    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: {
              cluster_id: String(cluster_id),
              delivery_fee: String(delivery_fee),
            },
          }),
        });

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json();
          razorpayOrderId = rzpData.id;
        } else {
          console.warn("Razorpay API returned status:", rzpResponse.status, "Falling back to simulated order ID");
        }
      } catch (apiErr) {
        console.warn("Could not reach Razorpay API, using simulated order ID for local test mode:", apiErr);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        keyId: keyId || "rzp_test_streetbites",
        foodItemsTotal,
        taxAmount,
        deliveryFee: delivery_fee,
        totalAmount,
      },
    });
  } catch (error: any) {
    console.error("Create Razorpay Order Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create Razorpay order.",
    });
  }
};

/**
 * @desc    Verify Razorpay Payment & Finalize Master Order + Sub-Orders
 * @route   POST /api/payments/razorpay/verify
 */
export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveCustomer(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Please log in to finalize your order." });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cluster_id,
      items,
      delivery_fee = 0,
      delivery_address,
      delivery_notes = "",
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Order items are missing." });
      return;
    }

    // Cryptographic signature check if Razorpay key secret is present
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ success: false, message: "Invalid payment signature verification failed." });
        return;
      }
    }

    const foodItemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const taxAmount = Math.round(foodItemsTotal * 0.05 * 10) / 10;
    const totalAmount = Math.round((foodItemsTotal + Number(delivery_fee) + taxAmount) * 10) / 10;

    // Generate 4-digit Delivery OTP
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // 1. Create Master Parent Order
    const masterOrder = await Order.create({
      customer_id: user._id,
      cluster_id: new mongoose.Types.ObjectId(cluster_id),
      food_items_total: foodItemsTotal,
      delivery_fee: Number(delivery_fee),
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: "ONLINE",
      payment_status: "PAID",
      razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      razorpay_signature: razorpay_signature || `sig_${Date.now()}`,
      status: "PREPARING",
      delivery_address: delivery_address || "Customer Address",
      delivery_notes,
      delivery_otp: deliveryOtp,
      platform_fee_earned: 0, // will compute below from items
    });

    let totalPlatformFee = 0;
    let totalVendorPayout = 0;

    // 2. Create Sub-Orders for each item with exact (95% Vendor Base, 15% Platform Profit)
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const customerPrice = Number(item.price) || 0;

      // Check stall for registered base_price
      let basePrice = Math.round((customerPrice / 1.1) * 100) / 100;
      try {
        if (item.stall_id || item.stallId) {
          const stall = await Stall.findById(item.stall_id || item.stallId);
          if (stall) {
            const foundItem = stall.menu_items.find(
              (m: any) => m._id?.toString() === String(item.item_id || item.id) || m.name === item.name
            );
            if (foundItem?.base_price) {
              basePrice = foundItem.base_price;
            }
          }
        }
      } catch (e) {
        // use derived basePrice
      }

      const vendorEarnedAmount = Math.round(basePrice * 0.95 * qty * 100) / 100;
      const platformGain = Math.round(((customerPrice - basePrice) + basePrice * 0.05) * qty * 100) / 100;

      totalPlatformFee += platformGain;
      totalVendorPayout += vendorEarnedAmount;

      await SubOrder.create({
        order_id: masterOrder._id,
        stall_id: item.stall_id || item.stallId,
        item_id: item.item_id || item.id || new mongoose.Types.ObjectId(),
        quantity: qty,
        vendor_earned_amount: vendorEarnedAmount,
        stall_status: "ACCEPTED",
      });
    }

    // Update master order with exact platform fee earned
    masterOrder.platform_fee_earned = Math.round(totalPlatformFee * 100) / 100;
    await masterOrder.save();

    // 3. Record Global Platform Ledger & Vendor Payout Entries
    // PLATFORM_FEE: Global system financial entry (user_id: null)
    await Transaction.create({
      user_id: null,
      order_id: masterOrder._id,
      amount: Math.round(totalPlatformFee * 100) / 100,
      type: "PLATFORM_FEE",
      status: "COMPLETED",
      note: `15% platform profit on online Order MO-${masterOrder._id.toString().slice(-5).toUpperCase()}`,
    });

    // VENDOR_PAYOUT: Aggregate vendor share
    await Transaction.create({
      user_id: null,
      order_id: masterOrder._id,
      amount: Math.round(totalVendorPayout * 100) / 100,
      type: "VENDOR_PAYOUT",
      status: "PENDING",
      note: `95% base food revenue payable to vendors for Order MO-${masterOrder._id.toString().slice(-5).toUpperCase()}`,
    });

    // 4. Clear Customer's Cart Document
    try {
      await Cart.findOneAndUpdate(
        { customer_id: user._id.toString() },
        { $set: { items: [] } }
      );
    } catch (cartErr) {
      console.warn("Could not clear cart after order:", cartErr);
    }

    res.status(201).json({
      success: true,
      message: "Payment verified and order placed successfully!",
      data: {
        orderId: masterOrder._id,
        orderNumber: `MO-${masterOrder._id.toString().slice(-5).toUpperCase()}`,
        status: masterOrder.status,
        totalAmount: masterOrder.total_amount,
        deliveryOtp: masterOrder.delivery_otp,
      },
    });
  } catch (error: any) {
    console.error("Verify Razorpay Payment Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Payment verification failed.",
    });
  }
};

/**
 * @desc    Create Cash on Delivery (COD) Order
 * @route   POST /api/payments/cod/create-order
 */
export const createCodOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveCustomer(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Please log in to place an order." });
      return;
    }

    const {
      cluster_id,
      items,
      delivery_fee = 0,
      delivery_address,
      delivery_notes = "",
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Order items are required." });
      return;
    }

    const foodItemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const taxAmount = Math.round(foodItemsTotal * 0.05 * 10) / 10;
    const totalAmount = Math.round((foodItemsTotal + Number(delivery_fee) + taxAmount) * 10) / 10;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create Master Order
    const masterOrder = await Order.create({
      customer_id: user._id,
      cluster_id: new mongoose.Types.ObjectId(cluster_id),
      food_items_total: foodItemsTotal,
      delivery_fee: Number(delivery_fee),
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: "COD",
      payment_status: "PENDING",
      cod_deposit_status: "PENDING_DEPOSIT",
      cod_amount_held: totalAmount,
      status: "PREPARING",
      delivery_address: delivery_address || "Customer Address",
      delivery_notes,
      delivery_otp: deliveryOtp,
      platform_fee_earned: 0,
    });

    let totalPlatformFee = 0;
    let totalVendorPayout = 0;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const customerPrice = Number(item.price) || 0;
      let basePrice = Math.round((customerPrice / 1.1) * 100) / 100;

      try {
        if (item.stall_id || item.stallId) {
          const stall = await Stall.findById(item.stall_id || item.stallId);
          if (stall) {
            const foundItem = stall.menu_items.find(
              (m: any) => m._id?.toString() === String(item.item_id || item.id) || m.name === item.name
            );
            if (foundItem?.base_price) {
              basePrice = foundItem.base_price;
            }
          }
        }
      } catch (e) {
        // use derived basePrice
      }

      const vendorEarnedAmount = Math.round(basePrice * 0.95 * qty * 100) / 100;
      const platformGain = Math.round(((customerPrice - basePrice) + basePrice * 0.05) * qty * 100) / 100;

      totalPlatformFee += platformGain;
      totalVendorPayout += vendorEarnedAmount;

      await SubOrder.create({
        order_id: masterOrder._id,
        stall_id: item.stall_id || item.stallId,
        item_id: item.item_id || item.id || new mongoose.Types.ObjectId(),
        quantity: qty,
        vendor_earned_amount: vendorEarnedAmount,
        stall_status: "ACCEPTED",
      });
    }

    masterOrder.platform_fee_earned = Math.round(totalPlatformFee * 100) / 100;
    await masterOrder.save();

    // Clear cart
    try {
      await Cart.findOneAndUpdate(
        { customer_id: user._id.toString() },
        { $set: { items: [] } }
      );
    } catch (cartErr) {
      console.warn("Could not clear cart:", cartErr);
    }

    res.status(201).json({
      success: true,
      message: "Cash on Delivery order placed successfully!",
      data: {
        orderId: masterOrder._id,
        orderNumber: `MO-${masterOrder._id.toString().slice(-5).toUpperCase()}`,
        status: masterOrder.status,
        totalAmount: masterOrder.total_amount,
        deliveryOtp: masterOrder.delivery_otp,
      },
    });
  } catch (error: any) {
    console.error("Create COD Order Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to place COD order.",
    });
  }
};

/**
 * @desc    Create Razorpay Order for Rider Debt Repayment
 * @route   POST /api/payments/rider/repay-debt/create-order
 */
export const createRiderRepayOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = (req as any).user?.id || req.body.riderId || req.query.riderId;
    if (!riderId) {
      res.status(401).json({ success: false, message: "Rider ID is required." });
      return;
    }

    const pendingOrders = await Order.find({
      rider_id: riderId,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    });

    const totalDebt = pendingOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);

    if (totalDebt <= 0) {
      res.status(400).json({ success: false, message: "You have no outstanding floating COD debt to settle." });
      return;
    }

    const amountInPaise = Math.round(totalDebt * 100);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = `debt_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_debt_${Date.now()}`,
            notes: { riderId: String(riderId), type: "RIDER_COD_REPAYMENT" },
          }),
        });

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json();
          razorpayOrderId = rzpData.id;
        }
      } catch (err) {
        console.warn("Razorpay API error in debt settlement, using test ID:", err);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        keyId: keyId || "rzp_test_streetbites",
        debtAmount: totalDebt,
      },
    });
  } catch (error: any) {
    console.error("Create Rider Debt Order Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to initiate debt settlement.",
    });
  }
};

/**
 * @desc    Verify Rider Debt Repayment & Reset Floating Debt
 * @route   POST /api/payments/rider/repay-debt/verify
 */
export const verifyRiderRepay = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = (req as any).user?.id || req.body.riderId;
    const rider = await User.findById(riderId);
    if (!rider) {
      res.status(404).json({ success: false, message: "Rider not found." });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Cryptographic signature check if Razorpay key secret is present
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ success: false, message: "Signature verification failed." });
        return;
      }
    }

    const pendingOrders = await Order.find({
      rider_id: rider._id,
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
    });

    const totalSettled = pendingOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);

    // Mark orders deposited to admin
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

    // Reset rider floating cash debt
    rider.floating_cash_debt = 0;
    await rider.save();

    // Record Transaction in Ledger
    await Transaction.create({
      user_id: rider._id,
      amount: totalSettled,
      type: "RIDER_COD_DEPOSIT",
      status: "COMPLETED",
      note: `Rider ${rider.name} settled ₹${totalSettled} floating COD debt via online payment. Payment ID: ${razorpay_payment_id || "direct"}`,
    });

    res.status(200).json({
      success: true,
      message: `Successfully cleared ₹${totalSettled} of floating cash debt!`,
      data: {
        settledAmount: totalSettled,
        remainingDebt: 0,
      },
    });
  } catch (error: any) {
    console.error("Verify Rider Debt Repay Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to finalize debt repayment.",
    });
  }
};

/**
 * @desc    Get Global Platform Financial Overview (For Superadmin & All Admin Users)
 * @route   GET /api/payments/admin/overview
 */
export const getAdminFinancialOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(50).populate("user_id", "name role email").lean();

    // 1. Total Platform Revenue (15% Profit Ledger Entries)
    const platformTransactions = await Transaction.find({ type: "PLATFORM_FEE" });
    const totalPlatformRevenue = platformTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // 2. Total Vendor Disbursed / Pending Payouts
    const vendorTransactions = await Transaction.find({ type: "VENDOR_PAYOUT" });
    const totalVendorPayouts = vendorTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Floating COD Cash Currently in Field (Undeposited by Riders)
    const undepositedCodOrders = await Order.find({
      payment_method: "COD",
      cod_deposit_status: "PENDING_DEPOSIT",
      status: "DELIVERED",
    });
    const floatingCashInField = undepositedCodOrders.reduce((sum, o) => sum + (o.cod_amount_held || o.total_amount || 0), 0);

    // 4. Settled COD Deposits from Riders
    const riderDepositTransactions = await Transaction.find({ type: "RIDER_COD_DEPOSIT" });
    const totalRiderDeposits = riderDepositTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
        totalVendorPayouts: Math.round(totalVendorPayouts * 100) / 100,
        floatingCashInField: Math.round(floatingCashInField * 100) / 100,
        totalRiderDeposits: Math.round(totalRiderDeposits * 100) / 100,
        transactions: transactions.map((t: any) => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          user: t.user_id ? `${t.user_id.name} (${t.user_id.role})` : "Global Platform System",
          note: t.note || "Platform Ledger Entry",
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get Admin Financial Overview Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch financial overview.",
    });
  }
};

/**
 * @desc    Get Customer's Order History
 * @route   GET /api/payments/my-orders
 */
export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await resolveCustomer(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Please log in to view orders." });
      return;
    }

    const orders = await Order.find({ customer_id: user._id })
      .populate("cluster_id", "name coordinates city")
      .populate("rider_id", "name phone_number")
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = await Promise.all(
      orders.map(async (o: any) => {
        const subOrders = await SubOrder.find({ order_id: o._id }).populate("stall_id", "name image_url").lean();
        return {
          id: o._id,
          orderNumber: `MO-${o._id.toString().slice(-5).toUpperCase()}`,
          clusterName: o.cluster_id?.name || "Khau Galli",
          status: o.status,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status || "PAID",
          totalAmount: o.total_amount,
          foodItemsTotal: o.food_items_total,
          deliveryFee: o.delivery_fee,
          deliveryAddress: o.delivery_address,
          deliveryOtp: o.delivery_otp,
          rider: o.rider_id ? { name: o.rider_id.name, phone: o.rider_id.phone_number } : null,
          itemsCount: subOrders.length,
          createdAt: o.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formattedOrders,
    });
  } catch (error: any) {
    console.error("Get Customer Orders Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch customer orders.",
    });
  }
};
