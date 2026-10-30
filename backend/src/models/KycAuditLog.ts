import mongoose, { Schema, type Document, type Model } from "mongoose";

export type KycAuditAction =
  | "LIST_VERIFICATIONS"
  | "INSPECT_APPLICANT"
  | "APPROVE_KYC"
  | "REJECT_KYC"
  | "RESET_KYC";

export interface IKycAuditLog extends Document {
  admin_id: mongoose.Types.ObjectId;
  admin_email: string;
  admin_name?: string;
  action: KycAuditAction;
  target_user_id?: mongoose.Types.ObjectId | null;
  target_name?: string;
  target_role?: string;
  ip_address: string;
  user_agent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const KycAuditLogSchema = new Schema<IKycAuditLog>(
  {
    admin_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    admin_email: {
      type: String,
      required: true,
      index: true,
    },
    admin_name: {
      type: String,
    },
    action: {
      type: String,
      enum: ["LIST_VERIFICATIONS", "INSPECT_APPLICANT", "APPROVE_KYC", "REJECT_KYC", "RESET_KYC"],
      required: true,
      index: true,
    },
    target_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    target_name: {
      type: String,
    },
    target_role: {
      type: String,
    },
    ip_address: {
      type: String,
      required: true,
    },
    user_agent: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index to automatically retain audit logs for 1 year for DPDP compliance (365 days)
KycAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const KycAuditLog: Model<IKycAuditLog> = mongoose.model<IKycAuditLog>("KycAuditLog", KycAuditLogSchema);
export default KycAuditLog;

