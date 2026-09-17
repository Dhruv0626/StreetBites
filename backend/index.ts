import dotenv from "dotenv";
dotenv.config();

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db.ts";
import authRoutes from "./src/routes/authRoutes.ts";
import settingRoutes from "./src/routes/AdminsettingRoutes.ts";
import onboardingRoutes from "./src/routes/onboardingRoutes.ts";
import offerRoutes from "./src/routes/offerRoutes.ts";
import adminRoutes from "./src/routes/adminRoutes.ts";
import clusterRoutes from "./src/routes/clusterRoutes.ts";
import favoriteRoutes from "./src/routes/favoriteRoutes.ts";
import vendorMenuRoutes from "./src/routes/vendorMenuRoutes.ts";

import { globalRateLimiter } from "./src/middlewares/rateLimiter.ts";

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Enable Trust Proxy for accurate client IP resolution behind load balancers/proxies
app.set("trust proxy", 1);

// Connect to Database
connectDB();

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// DDoS & Spam Protection: Apply Global Rate Limiting to all /api routes
app.use("/api", globalRateLimiter);

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "StreetBites API is running smoothly 🚀",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clusters", clusterRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/vendor/menu", vendorMenuRoutes);

// Global Error Handler
app.use(
  (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error",
    });
  }
);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 StreetBites Backend running on http://localhost:${PORT}`);
});

export default app;