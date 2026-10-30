import { Router } from "express";
import {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer,
} from "../controllers/offerController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Public Promotion & Offer Endpoints
router.get("/", getOffers);
router.get("/:id", getOfferById);

// Admin-Only Promotion Management Endpoints
router.post("/", protect, authorize("ADMIN"), createOffer);
router.put("/:id", protect, authorize("ADMIN"), updateOffer);
router.put("/:id/toggle", protect, authorize("ADMIN"), toggleOfferStatus);
router.delete("/:id", protect, authorize("ADMIN"), deleteOffer);

export default router;
