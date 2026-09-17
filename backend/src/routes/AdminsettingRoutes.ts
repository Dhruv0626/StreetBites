import { Router } from "express";
import { getPlatformSettings, updatePlatformSettings } from "../controllers/AdminsettingController.ts";

const router = Router();

// Public endpoint for platform settings & Cloudinary video URL
router.get("/", getPlatformSettings);
router.put("/", updatePlatformSettings);

export default router;
