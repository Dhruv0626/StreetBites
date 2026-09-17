import { Router } from "express";
import {
  getVendorMenu,
  addMenuItem,
  addFoodCategory,
  toggleItemAvailability,
  deleteMenuItem
} from "../controllers/vendorMenuController.ts";

const router = Router();

router.get("/", getVendorMenu);
router.post("/item", addMenuItem);
router.post("/category", addFoodCategory);
router.patch("/item/:id/availability", toggleItemAvailability);
router.delete("/item/:id", deleteMenuItem);

export default router;

