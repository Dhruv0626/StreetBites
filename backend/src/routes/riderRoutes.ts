import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import {
  getRiderStats,
  toggleRiderOnlineStatus,
  updateRiderSettings,
  getRiderQueue,
  acceptQueueOrder,
  declineQueueOrder,
  getActiveRoute,
  getRiderHistory,
  settleRiderDebt,
  completeDeliveryWithOtp,
} from "../controllers/riderController.ts";

const router = Router();

const AVATAR_SOURCE = "C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\ca5371d6-d7d4-4c69-ae10-975c2786ff28\\rider_avatar_cap_1790003033907.jpg";
const FRONTEND_AVATAR_DEST = "d:\\streetBites\\Frontend\\src\\assets\\images\\rider_avatar.jpg";

try {
  if (fs.existsSync(AVATAR_SOURCE)) {
    const destDir = path.dirname(FRONTEND_AVATAR_DEST);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(AVATAR_SOURCE, FRONTEND_AVATAR_DEST);
  }
} catch (_e) {
}

// Endpoint to serve the rider cartoon avatar directly
router.get("/default-avatar", (_req: Request, res: Response) => {
  if (fs.existsSync(FRONTEND_AVATAR_DEST)) {
    res.sendFile(FRONTEND_AVATAR_DEST);
  } else if (fs.existsSync(AVATAR_SOURCE)) {
    res.sendFile(AVATAR_SOURCE);
  } else {
    res.status(404).send("Avatar not found");
  }
});

// Dashboard Stats & Duty / Settings
router.get("/stats", getRiderStats);
router.put("/toggle-online", toggleRiderOnlineStatus);
router.put("/settings", updateRiderSettings);

// Queue (Online riders only + distance range filter)
router.get("/queue", getRiderQueue);
router.put("/orders/:id/accept", acceptQueueOrder);
router.put("/orders/:id/decline", declineQueueOrder);

// Active Route & OTP Verification
router.get("/active-route", getActiveRoute);
router.post("/orders/:id/verify-otp", completeDeliveryWithOtp);

// History
router.get("/history", getRiderHistory);

// Debt Settlement
router.post("/settle-debt", settleRiderDebt);

export default router;
