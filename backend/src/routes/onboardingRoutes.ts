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
  getVerificationById,
  updateVerificationStatus,
  getKycAuditLogs,
} from "../controllers/onboardingController.ts";
import { protect, protectOptional, authorize } from "../middlewares/authMiddleware.ts";
import { sensitiveActionLimiter, kycRateLimiter } from "../middlewares/rateLimiter.ts";

const router = Router();

// Rider CRUD Endpoints
router.post("/rider", sensitiveActionLimiter, protectOptional, registerRiderDetails);
router.get("/rider", protect, authorize("RIDER", "ADMIN"), getRiderDetails);
router.put("/rider", protect, authorize("RIDER", "ADMIN"), updateRiderDetails);
router.delete("/rider", protect, authorize("RIDER", "ADMIN"), deleteRiderDetails);

// Vendor CRUD Endpoints
router.post("/vendor", sensitiveActionLimiter, protectOptional, registerVendorDetails);
router.get("/vendor", protect, authorize("VENDOR", "ADMIN"), getVendorDetails);
router.put("/vendor", protect, authorize("VENDOR", "ADMIN"), updateVendorDetails);
router.put("/vendor/toggle-status", protect, authorize("VENDOR", "ADMIN"), toggleVendorOnlineStatus);
router.delete("/vendor", protect, authorize("VENDOR", "ADMIN"), deleteVendorDetails);

// Status & Verification Endpoints (Secured with kycRateLimiter and KycAuditLog against bulk scraping)
router.get("/status", protectOptional, getOnboardingStatus);
router.get("/verifications", protect, authorize("ADMIN"), kycRateLimiter, getVerifications);
router.get("/verifications-audit", protect, authorize("ADMIN"), getKycAuditLogs);
router.get("/verifications/:id", protect, authorize("ADMIN"), kycRateLimiter, getVerificationById);
router.put("/verify/:id", protect, authorize("ADMIN"), sensitiveActionLimiter, updateVerificationStatus);

export default router;
