import { Router } from "express";
import {
  getVendorMenu,
  addMenuItem,
  updateMenuItem,
  addFoodCategory,
  toggleItemAvailability,
  deleteMenuItem
} from "../controllers/vendorMenuController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Restrict vendor menu management to authenticated Vendors and Admins
router.use(protect, authorize("VENDOR", "ADMIN"));

router.get("/", getVendorMenu);
router.post("/item", addMenuItem);
router.put("/item/:id", updateMenuItem);
router.patch("/item/:id", updateMenuItem);
router.post("/category", addFoodCategory);
router.patch("/item/:id/availability", toggleItemAvailability);
router.delete("/item/:id", deleteMenuItem);

export default router;


