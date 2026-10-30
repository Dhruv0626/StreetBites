import { Router } from "express";
import {
  getAdminTransactions,
  processPendingPayouts,
  settleRiderCodDebt,
  processCustomerRefund,
  getAdminComplaints,
  updateComplaintStatus,
  getAdminLiveOrders,
  getAdminFoodItems,
  updateFoodItemStatus,
  getAdminCounts,
  getAdminOverviewStats,
} from "../controllers/adminController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Apply strict Admin authentication & role check to ALL /api/admin routes
router.use(protect, authorize("ADMIN"));

// Dashboard Counts & Overview (Approvals, Orders, Complaints, Revenue)
router.get("/counts", getAdminCounts);
router.get("/overview", getAdminOverviewStats);

// Transactions & Payouts
router.get("/transactions", getAdminTransactions);
router.post("/transactions/process-payouts", processPendingPayouts);
router.post("/transactions/settle-rider-cod", settleRiderCodDebt);
router.post("/transactions/process-refund", processCustomerRefund);

// Complaints & Disputes
router.get("/complaints", getAdminComplaints);
router.patch("/complaints/:id/status", updateComplaintStatus);

// Live Orders
router.get("/orders", getAdminLiveOrders);

// Food Items / Menu Items Approval
router.get("/food-items", getAdminFoodItems);
router.patch("/food-items/:id/status", updateFoodItemStatus);
router.put("/food-items/:id/status", updateFoodItemStatus);

export default router;
