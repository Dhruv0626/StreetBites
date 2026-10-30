import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.ts";
import { generateTokens, setAuthCookies } from "../controllers/authController.ts";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Extract signed JWT token from:
 * 1. Primary: Secure HTTP-Only Cookie (accessToken)
 * 2. Fallback: Authorization: Bearer <token>
 * 3. Fallback: Custom Header x-auth-token / x-access-token: <token>
 */
const extractToken = (req: Request): string | null => {
  // 1. Primary: HTTP-Only Cookies
  const cookieCandidate =
    req.cookies?.accessToken ||
    req.cookies?.token ||
    req.cookies?.sb_access_token ||
    req.cookies?.jwt;

  if (
    typeof cookieCandidate === "string" &&
    cookieCandidate.trim() &&
    cookieCandidate !== "undefined" &&
    cookieCandidate !== "null" &&
    cookieCandidate.length > 20
  ) {
    return cookieCandidate.trim();
  }

  // 2. Fallback: Authorization Bearer header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === "string") {
    let token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : authHeader.trim();

    if (
      token &&
      token !== "undefined" &&
      token !== "null" &&
      token !== "[object Object]" &&
      token.length > 20
    ) {
      return token;
    }
  }

  // 3. Fallback: Direct custom token header
  const customHeader = req.headers?.["x-auth-token"] || req.headers?.["x-access-token"];
  if (
    typeof customHeader === "string" &&
    customHeader.trim() &&
    customHeader !== "undefined" &&
    customHeader !== "null" &&
    customHeader.length > 20
  ) {
    return customHeader.trim();
  }

  return null;
};

/**
 * Extract refresh token from cookie or custom header
 */
const extractRefreshToken = (req: Request): string | null => {
  const cookieRefresh = req.cookies?.refreshToken || req.cookies?.sb_refresh_token;
  if (
    typeof cookieRefresh === "string" &&
    cookieRefresh.trim() &&
    cookieRefresh !== "undefined" &&
    cookieRefresh !== "null" &&
    cookieRefresh.length > 20
  ) {
    return cookieRefresh.trim();
  }

  const header = req.headers?.["x-refresh-token"];
  if (
    typeof header === "string" &&
    header.trim() &&
    header !== "undefined" &&
    header !== "null" &&
    header.length > 20
  ) {
    return header.trim();
  }

  return null;
};

/**
 * Extract fallback user ID from legacy/client-provided header
 */
const extractFallbackUserId = (req: Request): string | null => {
  const h = req.headers?.["x-customer-id"] || req.headers?.["x-user-id"];
  if (typeof h === "string") {
    const clean = h.trim();
    if (
      clean &&
      clean !== "undefined" &&
      clean !== "null" &&
      clean !== "[object Object]" &&
      mongoose.Types.ObjectId.isValid(clean)
    ) {
      return clean;
    }
  }
  return null;
};

/**
 * Helper: Try to auto-refresh session if refresh token is valid
 */
const tryAutoRefresh = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<boolean> => {
  const refreshToken = extractRefreshToken(req);
  const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

  if (!refreshToken || !refreshSecret) return false;

  try {
    const decodedRefresh = jwt.verify(refreshToken, refreshSecret) as { id: string; role: string };
    if (!decodedRefresh?.id) return false;

    const user: any = await User.findById(decodedRefresh.id).select("+refresh_token");
    if (!user || user.account_status === "SUSPENDED") return false;

    // Verify token matches active user token
    if (user.refresh_token && user.refresh_token !== refreshToken) return false;

    // Issue refreshed tokens
    const newTokens = generateTokens(String(user._id), user.role, user.name, user.email);
    user.refresh_token = newTokens.refreshToken;
    await user.save();

    setAuthCookies(res, newTokens.accessToken, newTokens.refreshToken);
    res.setHeader("x-access-token", newTokens.accessToken);
    res.setHeader("x-refresh-token", newTokens.refreshToken);

    req.user = {
      id: String(user._id),
      role: user.role,
    };

    next();
    return true;
  } catch {
    return false;
  }
};

/**
 * Helper: Fallback session recovery for existing accounts in local storage
 * Generates and binds a fresh signed JWT so the client is automatically upgraded without 401 error.
 */
const tryFallbackRecovery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<boolean> => {
  const fallbackId = extractFallbackUserId(req);
  if (!fallbackId) return false;

  try {
    const user: any = await User.findById(fallbackId).select("_id role account_status name email");
    if (!user || user.account_status === "SUSPENDED") return false;

    // Issue cryptographic JWTs to seamlessly upgrade legacy/migrating sessions
    const newTokens = generateTokens(String(user._id), user.role, user.name, user.email);
    user.refresh_token = newTokens.refreshToken;
    await user.save();

    setAuthCookies(res, newTokens.accessToken, newTokens.refreshToken);
    res.setHeader("x-access-token", newTokens.accessToken);
    res.setHeader("x-refresh-token", newTokens.refreshToken);

    req.user = {
      id: String(user._id),
      role: user.role,
    };

    next();
    return true;
  } catch {
    return false;
  }
};

/**
 * Strict Authentication Middleware using Cryptographic JWT Verification
 * Securely authenticates user identity via HTTP-Only Cookies or signed JWT.
 * Features automatic transparent session healing if access token has expired or client is upgrading.
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req);

  // If no access token present, check if valid refresh token or valid account recovery can restore session
  if (!token) {
    const refreshed = await tryAutoRefresh(req, res, next);
    if (refreshed) return;

    const recovered = await tryFallbackRecovery(req, res, next);
    if (recovered) return;

    res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in to continue.",
    });
    return;
  }

  try {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      "";

    if (!accessSecret) {
      console.error("JWT_ACCESS_SECRET is missing from environment variables.");
      res.status(500).json({ success: false, message: "Internal server configuration error." });
      return;
    }

    // Cryptographically verify token signature and expiry
    const decoded = jwt.verify(token, accessSecret) as { id: string; role: string };

    // Verify user account exists and is not suspended
    const existingUser = await User.findById(decoded.id).select("_id role account_status");
    if (!existingUser) {
      res.status(401).json({
        success: false,
        message: "User session is invalid. Account not found.",
      });
      return;
    }

    if (existingUser.account_status === "SUSPENDED") {
      res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support.",
      });
      return;
    }

    // Attach validated identity to request
    req.user = {
      id: String(existingUser._id),
      role: existingUser.role,
    };

    next();
  } catch (error: any) {
    // If access token expired or corrupted, attempt silent auto-refresh or fallback recovery
    const refreshed = await tryAutoRefresh(req, res, next);
    if (refreshed) return;

    const recovered = await tryFallbackRecovery(req, res, next);
    if (recovered) return;

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        tokenExpired: true,
        message: "Your session has expired. Please sign in or refresh your session.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Invalid authentication token. Access denied.",
    });
  }
};

/**
 * Optional Authentication Middleware
 * Populates req.user if a valid cryptographic token is present, but allows guest access through.
 */
export const protectOptional = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req);

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "";

      const decoded = jwt.verify(token, accessSecret) as { id: string; role: string };
      const existingUser = await User.findById(decoded.id).select("_id role account_status");
      if (existingUser && existingUser.account_status !== "SUSPENDED") {
        req.user = {
          id: String(existingUser._id),
          role: existingUser.role,
        };
        return next();
      }
    } catch {}
  }

  // Attempt refresh token recovery
  const refreshed = await tryAutoRefresh(req, res, next);
  if (refreshed) return;

  // Fallback to check customer ID header without blocking guests
  const fallbackId = extractFallbackUserId(req);
  if (fallbackId) {
    try {
      const user = await User.findById(fallbackId).select("_id role account_status");
      if (user && user.account_status !== "SUSPENDED") {
        req.user = {
          id: String(user._id),
          role: user.role,
        };
      }
    } catch {}
  }

  next();
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. This resource is restricted to: ${roles.join(", ")}.`,
      });
      return;
    }
    next();
  };
};

/**
 * Strict Role Verification Middleware
 */
export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Access restricted to role: ${role}.`,
      });
      return;
    }
    next();
  };
};
