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
  forgotPassword,
  resetPassword,
  deleteSelfAccount,
  getAllUsers,
  updateUserStatus,
  deleteUser,
} from "../controllers/authController.ts";
import { protect } from "../middlewares/authMiddleware.ts";
import { authRateLimiter } from "../middlewares/rateLimiter.ts";

const router: any = express.Router();

// Public Authentication Routes (Protected with Strict Auth Rate Limiter against Brute-Force & DDoS)
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);

// Google OAuth2 Routes
router.post("/google", authRateLimiter, googleAuth);
router.get("/google/callback", googleCallback);
router.get("/google/url", getGoogleAuthUrl);

// Facebook OAuth Routes
router.post("/facebook", authRateLimiter, facebookAuth);
router.get("/facebook/callback", facebookCallback);
router.get("/facebook/url", getFacebookAuthUrl);

// Logout Route
router.post("/logout", logout);

// Protected Routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteSelfAccount);

// Admin User Management Routes
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
