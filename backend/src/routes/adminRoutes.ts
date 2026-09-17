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
} from "../controllers/adminController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Dashboard Counts (Approvals, Orders, Complaints)
router.get("/counts", getAdminCounts);

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
