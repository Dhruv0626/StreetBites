import { Router } from "express";
import {
  submitReview,
  getOrderReviews,
  getStallReviews,
} from "../controllers/reviewController.ts";
import { protectOptional } from "../middlewares/authMiddleware.ts";

const router = Router();

// Submit review for an order
router.post("/", protectOptional, submitReview);

// Get reviews for a specific order
router.get("/order/:orderId", protectOptional, getOrderReviews);

// Get reviews for a specific stall
router.get("/stall/:stallId", getStallReviews);

export default router;
