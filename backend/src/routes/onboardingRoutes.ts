import { Router } from "express";
import {
  registerRiderDetails,
  registerVendorDetails,
  getRiderDetails,
  updateRiderDetails,
  deleteRiderDetails,
  getVendorDetails,
  updateVendorDetails,
  deleteVendorDetails,
  toggleVendorOnlineStatus,
  getOnboardingStatus,
  getVerifications,
  updateVerificationStatus,
} from "../controllers/onboardingController.ts";
import { protect } from "../middlewares/authMiddleware.ts";
import { sensitiveActionLimiter } from "../middlewares/rateLimiter.ts";

const router = Router();

// Rider CRUD Endpoints
router.post("/rider", sensitiveActionLimiter, registerRiderDetails);
router.get("/rider", getRiderDetails);
router.put("/rider", updateRiderDetails);
router.delete("/rider", deleteRiderDetails);

// Vendor CRUD Endpoints
router.post("/vendor", sensitiveActionLimiter, registerVendorDetails);
router.get("/vendor", getVendorDetails);
router.put("/vendor", updateVendorDetails);
router.put("/vendor/toggle-status", toggleVendorOnlineStatus);
router.delete("/vendor", deleteVendorDetails);

// Status & Verification Endpoints
router.get("/status", getOnboardingStatus);
router.get("/verifications", getVerifications);
router.put("/verify/:id", updateVerificationStatus);

export default router;
