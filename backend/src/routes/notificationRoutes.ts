import { Router } from "express";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
  getUnreadCount,
} from "../controllers/notificationController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

router.use(protect);

router.get("/", getUserNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/mark-all-read", markAllNotificationsRead);
router.put("/:id/read", markSingleNotificationRead);

export default router;
