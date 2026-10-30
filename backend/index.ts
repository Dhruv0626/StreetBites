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
import cartRoutes from "./src/routes/cartRoutes.ts";
import addressRoutes from "./src/routes/addressRoutes.ts";
import riderRoutes from "./src/routes/riderRoutes.ts";
import paymentRoutes from "./src/routes/paymentRoutes.ts";
import vendorOrderRoutes from "./src/routes/vendorOrderRoutes.ts";
import notificationRoutes from "./src/routes/notificationRoutes.ts";
import reviewRoutes from "./src/routes/reviewRoutes.ts";
import { globalRateLimiter } from "./src/middlewares/rateLimiter.ts";
import { applySecurityHeaders } from "./src/middlewares/helmetSecurity.ts";

// Initialize Express
const app = express();
const PORT = process.env.PORT || "";

// Security: Disable X-Powered-By fingerprinting and apply Helmet security headers
app.disable("x-powered-by");
app.use(applySecurityHeaders);

// Enable Trust Proxy for accurate client IP resolution behind load balancers/proxies
app.set("trust proxy", 1);

// Connect to Database
connectDB();

// Global Middlewares
// Build allowed origins list from CLIENT_URL (supports comma-separated values)
const rawClientUrl = process.env.CLIENT_URL || "";
const allowedOrigins: string[] = rawClientUrl
  .split(",")
  .map((url) => url.trim().replace(/\/$/, "")) // Strip trailing slashes
  .filter(Boolean);

// Always allow localhost in development for easier local testing
if (process.env.NODE_ENV !== "production") {
  ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"].forEach((url) => {
    if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
  });
}

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Normalize the incoming origin by stripping trailing slash
      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-auth-token",
      "x-refresh-token",
      "x-access-token",
      "x-customer-id",
      "x-user-id",
      "x-fresh",
      "x-cluster-id",
      "x-stall-id",
      "x-order-id",
      "x-requested-with",
      "Accept",
    ],
    exposedHeaders: ["x-access-token", "x-refresh-token", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// DDoS & Spam Protection: Apply Global Rate Limiting to all /api routes
app.use("/api", globalRateLimiter);

// Health check endpoints (for Render, uptime monitors, and background warm-ups)
app.get(["/health", "/api/health", "/"], (_req: Request, res: Response) => {
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
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/vendor/orders", vendorOrderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);

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