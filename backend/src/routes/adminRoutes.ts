import { Router } from "express";
import {
  getAdminTransactions,
  processPendingPayouts,
  getAdminComplaints,
  updateComplaintStatus,
  getAdminLiveOrders,
  getAdminFoodItems,
  updateFoodItemStatus,
  getAdminCounts,
  getAdminOverviewStats,
} from "../controllers/adminController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Dashboard Counts & Overview (Approvals, Orders, Complaints, Revenue)
router.get("/counts", getAdminCounts);
router.get("/overview", getAdminOverviewStats);

// Transactions & Payouts
router.get("/transactions", protect, getAdminTransactions);
router.post("/transactions/process-payouts", protect, processPendingPayouts);

// Complaints & Disputes
router.get("/complaints", protect, getAdminComplaints);
router.patch("/complaints/:id/status", protect, updateComplaintStatus);

// Live Orders
router.get("/orders", protect, getAdminLiveOrders);

// Food Items / Menu Items Approval
router.get("/food-items", getAdminFoodItems);
router.patch("/food-items/:id/status", updateFoodItemStatus);
router.put("/food-items/:id/status", updateFoodItemStatus);

export default router;
