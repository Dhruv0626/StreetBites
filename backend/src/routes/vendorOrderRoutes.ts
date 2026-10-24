import { Router } from "express";
import {
  getVendorOrders,
  updateVendorOrderStatus,
  rejectVendorOrder,
  getVendorMetrics,
  getVendorAnalytics,
  requestVendorWithdrawal,
} from "../controllers/vendorOrderController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Retrieve live kitchen queue and past orders (Live orders first!)
router.get("/", protect, getVendorOrders);

// Quick metrics for navbar badge
router.get("/metrics", protect, getVendorMetrics);

// Detailed vendor analytics dashboard (KPIs, revenue breakdown, top items)
router.get("/analytics", protect, getVendorAnalytics);

// Vendor Request Payout Withdrawal
router.post("/payouts/withdraw", protect, requestVendorWithdrawal);

// Update status (e.g. Preparing, Completed / Ready for pickup, Cancelled)
router.patch("/:id/status", protect, updateVendorOrderStatus);

// Dedicated reject order endpoint
router.post("/:id/reject", protect, rejectVendorOrder);

export default router;
