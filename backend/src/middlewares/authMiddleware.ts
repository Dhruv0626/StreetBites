import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Not authorized to access this route. No access token provided.",
    });
    return;
  }

  try {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      "streetbites_access_jwt_secret_dev_key_2026";

    const decoded = jwt.verify(token, accessSecret) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Access token is invalid or expired. Please refresh your token.",
    });
  }
};
