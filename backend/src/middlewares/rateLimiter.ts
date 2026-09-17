import { type Request, type Response, type NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds (e.g. 15 * 60 * 1000 = 15 mins)
  maxRequests: number; // Max requests allowed per IP in the window
  message?: string; // Custom error message
  statusCode?: number; // HTTP status code (default: 429)
  skipFailedRequests?: boolean;
}

/**
 * In-Memory Sliding Window Rate Limiter for DDoS & Brute-Force Protection
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests from this IP. Please try again later to prevent DDoS attacks.",
    statusCode = 429,
  } = options;

  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired IP records every 5 minutes to prevent memory leaks
  const cleanupInterval = Math.max(windowMs, 5 * 60 * 1000);
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, cleanupInterval);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract real client IP (supports proxies / cloudflare / load balancers)
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown_ip";

    const now = Date.now();
    let record = ipStore.get(clientIp);

    // If no existing record or window has expired, start a new window
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipStore.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    // Set standard RateLimit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    // If rate limit exceeded, block request and return 429
    if (record.count > maxRequests) {
      res.setHeader("Retry-After", resetSeconds);
      res.status(statusCode).json({
        success: false,
        status: 429,
        error: "RateLimitExceeded",
        message,
        retryAfterSeconds: resetSeconds,
      });
      return;
    }

    next();
  };
};

/**
 * 1. Global Rate Limiter:
 * 300 requests per 15 minutes per IP for general browsing across the entire API
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300,
  message: "Too many requests from your IP address. Please wait a few minutes before trying again.",
});

/**
 * 2. Strict Auth / Login Rate Limiter:
 * 15 requests per 15 minutes per IP to prevent brute-force password cracking & credential stuffing
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15,
  message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
});

/**
 * 3. Sensitive Action Limiter (Orders / Verification / Onboarding):
 * 40 requests per 15 minutes per IP to prevent checkout spam & fake order DDoS
 */
export const sensitiveActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 40,
  message: "Too many sensitive actions submitted from this IP. Please wait before retrying.",
});
