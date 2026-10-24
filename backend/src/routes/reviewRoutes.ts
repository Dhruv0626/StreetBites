import { Router } from "express";
import {
  submitReview,
  getOrderReviews,
  getStallReviews,
  submitCustomerComplaint,
} from "../controllers/reviewController.ts";
import { protectOptional } from "../middlewares/authMiddleware.ts";

const router = Router();

// Submit review for an order
router.post("/", protectOptional, submitReview);

// Submit complaint / report issue
router.post("/complaint", protectOptional, submitCustomerComplaint);

// Get reviews for a specific order
router.get("/order/:orderId", protectOptional, getOrderReviews);

// Get reviews for a specific stall
router.get("/stall/:stallId", getStallReviews);

export default router;

