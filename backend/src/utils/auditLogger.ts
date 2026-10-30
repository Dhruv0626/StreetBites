import type { Request } from "express";
import KycAuditLog, { type KycAuditAction } from "../models/KycAuditLog.ts";

/**
 * Resolves reliable client IP address handling proxies & load balancers
 */
export const getClientIp = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown_ip"
  );
};

/**
 * Records an immutable KYC Audit Log entry whenever an administrator interacts with sensitive KYC data
 */
export const logKycAccess = async (params: {
  req: Request;
  action: KycAuditAction;
  targetUserId?: any;
  targetName?: string;
  targetRole?: string;
  details?: Record<string, any>;
}): Promise<void> => {
  try {
    const authUser = (params.req as any).user;
    if (!authUser?.id) return;

    await KycAuditLog.create({
      admin_id: authUser.id,
      admin_email: authUser.email || "admin@streetbites.internal",
      admin_name: authUser.name,
      action: params.action,
      target_user_id: params.targetUserId || null,
      target_name: params.targetName,
      target_role: params.targetRole,
      ip_address: getClientIp(params.req),
      user_agent: (params.req.headers["user-agent"] as string) || "unknown",
      details: params.details,
    });
  } catch (err) {
    console.error("KYC Audit Log Record Error:", err);
  }
};

