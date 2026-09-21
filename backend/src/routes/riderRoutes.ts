import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import {
  getRiderStats,
  getRiderQueue,
  acceptQueueOrder,
  getActiveRoute,
  getRiderHistory,
  settleRiderDebt,
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
    console.log("✅ AI Cartoon Rider Avatar synchronized to Frontend assets!");
  }
} catch (e) {
  console.warn("Avatar sync note:", e);
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

// Dashboard Stats & Earnings
router.get("/stats", getRiderStats);

// Queue
router.get("/queue", getRiderQueue);
router.put("/orders/:id/accept", acceptQueueOrder);

// Active Route
router.get("/active-route", getActiveRoute);

// History
router.get("/history", getRiderHistory);

// Debt Settlement
router.post("/settle-debt", settleRiderDebt);

export default router;
