import { Router } from "express";
import { getPlatformSettings, updatePlatformSettings } from "../controllers/AdminsettingController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Public endpoint for platform settings & Cloudinary video URL
router.get("/", getPlatformSettings);

// Admin-only platform settings configuration
router.put("/", protect, authorize("ADMIN"), updatePlatformSettings);

export default router;
