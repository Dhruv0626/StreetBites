import { Router } from "express";
import {
  getVendorOrders,
  updateVendorOrderStatus,
  rejectVendorOrder,
  getVendorMetrics,
  getVendorAnalytics,
  requestVendorWithdrawal,
  getVendorPayoutHistory,
  updateVendorBankDetails,
} from "../controllers/vendorOrderController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Restrict all vendor kitchen queue and order management to Vendors and Admins
router.use(protect, authorize("VENDOR", "ADMIN"));

// Retrieve live kitchen queue and past orders (Live orders first!)
router.get("/", getVendorOrders);

// Quick metrics for navbar badge
router.get("/metrics", getVendorMetrics);

// Detailed vendor analytics dashboard (KPIs, revenue breakdown, top items)
router.get("/analytics", getVendorAnalytics);

// Vendor Payouts & Settlement History
router.get("/payouts", getVendorPayoutHistory);

// Vendor Update Bank & Payout Details
router.put("/payouts/bank-details", updateVendorBankDetails);

// Vendor Request Payout Withdrawal
router.post("/payouts/withdraw", requestVendorWithdrawal);

// Update status (e.g. Preparing, Completed / Ready for pickup, Cancelled)
router.patch("/:id/status", updateVendorOrderStatus);

// Dedicated reject order endpoint
router.post("/:id/reject", rejectVendorOrder);

export default router;
