import { Router } from "express";
import {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer,
} from "../controllers/offerController.ts";

const router = Router();

// Promotion & Offer Endpoints (GET, POST, PUT, DELETE)
router.get("/", getOffers);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.put("/:id/toggle", toggleOfferStatus);
router.delete("/:id", deleteOffer);

export default router;
