import express from "express";
import {
  register,
  login,
  refreshAccessToken,
  googleAuth,
  googleCallback,
  getGoogleAuthUrl,
  facebookAuth,
  facebookCallback,
  getFacebookAuthUrl,
  logout,
  getProfile,
  updateProfile,
  getAllUsers,
  updateUserStatus,
  deleteUser,
} from "../controllers/authController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router: any = express.Router();

// Public Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);

// Google OAuth2 Routes
router.post("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/google/url", getGoogleAuthUrl);

// Facebook OAuth Routes
router.post("/facebook", facebookAuth);
router.get("/facebook/callback", facebookCallback);
router.get("/facebook/url", getFacebookAuthUrl);

// Logout Route
router.post("/logout", logout);

// Protected Routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Admin User Management Routes
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
