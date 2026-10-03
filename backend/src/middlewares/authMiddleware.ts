import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.ts";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // 1. Check cookies for accessToken
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else {
    // 2. Fallback to Authorization Header
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "";

      const decoded = jwt.verify(token, accessSecret) as { id: string; role: string };
      req.user = decoded;
      next();
      return;
    } catch (error) {
      // If token expired/invalid, try customer/user ID fallback below
    }
  }

  // 3. Fallback: Check for customer ID header (e.g. mobile browsers where cross-origin cookies are blocked)
  const headerUserId =
    (req.headers["x-customer-id"] as string) ||
    (req.headers["x-user-id"] as string) ||
    req.body?.customer_id;

  if (headerUserId && mongoose.Types.ObjectId.isValid(headerUserId)) {
    try {
      const existingUser = await User.findById(headerUserId).select("_id role account_status");
      if (existingUser && existingUser.account_status !== "SUSPENDED") {
        req.user = {
          id: String(existingUser._id),
          role: existingUser.role,
        };
        next();
        return;
      }
    } catch (dbErr) {
      console.warn("Error resolving user via header fallback:", dbErr);
    }
  }

  res.status(401).json({
    success: false,
    message: "Not authorized to access this route. Please sign in.",
  });
};

export const protectOptional = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "";

      const decoded = jwt.verify(token, accessSecret) as { id: string; role: string };
      req.user = decoded;
      return next();
    } catch (error) {
    }
  }

  const headerUserId =
    (req.headers["x-customer-id"] as string) ||
    (req.headers["x-user-id"] as string) ||
    req.body?.customer_id;

  if (headerUserId && mongoose.Types.ObjectId.isValid(headerUserId)) {
    try {
      const existingUser = await User.findById(headerUserId).select("_id role account_status");
      if (existingUser && existingUser.account_status !== "SUSPENDED") {
        req.user = {
          id: String(existingUser._id),
          role: existingUser.role,
        };
      }
    } catch (dbErr) {
      // Ignore
    }
  }

  next();
};


