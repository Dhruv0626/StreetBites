import { Router } from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createCodOrder,
  createRiderRepayOrder,
  verifyRiderRepay,
  getAdminFinancialOverview,
  getCustomerOrders,
} from "../controllers/paymentController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Customer Online Razorpay Checkout
router.post("/razorpay/create-order", protect, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifyRazorpayPayment);

// Customer Cash on Delivery Checkout
router.post("/cod/create-order", protect, createCodOrder);

// Customer Order History
router.get("/my-orders", protect, getCustomerOrders);

// Rider Debt Repayment via Razorpay Online Payment
router.post("/rider/repay-debt/create-order", protect, createRiderRepayOrder);
router.post("/rider/repay-debt/verify", protect, verifyRiderRepay);

// Global Admin Financial Ledger & Revenue Overview
router.get("/admin/overview", protect, getAdminFinancialOverview);

export default router;
