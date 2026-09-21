import mongoose, { type Model } from "mongoose";

export type UserRole = "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type AccountStatus = "ACTIVE" | "SUSPENDED";

export interface IUser {
  _id?: any;
  name: string;
  email: string;
  phone_number?: string;
  password?: string;
  role: UserRole;
  dl_image_url?: string | null;
  aadhaar_image_url?: string | null;
  vehicle_photo_url?: string | null;
  vehicle_number_plate_image?: string | null;
  rc_image_url?: string | null;
  insurance_image_url?: string | null;
  vehicle_model?: string | null;
  verification_status: VerificationStatus;
  account_status: AccountStatus;
  is_online: boolean;
  current_coordinates?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  upi_id?: string | null;
  wallet_balance: number;
  floating_cash_debt: number;
  cash_limit: number;
  favorite_stalls?: any[];
  google_id?: string | null;
  facebook_id?: string | null;
  avatar_url?: string | null;
  refresh_token?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const PointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone_number: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: any) {
        return !this.google_id;
      },
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["CUSTOMER", "VENDOR", "RIDER", "ADMIN"],
      default: "CUSTOMER",
    },
    dl_image_url: {
      type: String,
    },
    aadhaar_image_url: {
      type: String,
    },
    vehicle_photo_url: {
      type: String,
    },
    vehicle_number_plate_image: {
      type: String,
    },
    rc_image_url: {
      type: String,
    },
    insurance_image_url: {
      type: String,
    },
    vehicle_model: {
      type: String,
    },
    verification_status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
    },
    account_status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
    },
    is_online: {
      type: Boolean,
    },
    current_coordinates: {
      type: PointSchema,
      default: undefined,
      required: false,
    },
    bank_name: {
      type: String,
    },
    bank_account_no: {
      type: String,
    },
    bank_ifsc: {
      type: String,
    },
    upi_id: {
      type: String,
    },
    wallet_balance: {
      type: Number,
      default: 0,
    },
    floating_cash_debt: {
      type: Number,
      default: 0,
      min: [0, "Floating cash debt cannot be negative"],
    },
    cash_limit: {
      type: Number,
      default: 0,
      min: [0, "Cash limit cannot be negative"],
    },
    favorite_stalls: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Stall",
        },
      ],
      default: undefined,
    },
    google_id: {
      type: String,
      sparse: true,
    },
    facebook_id: {
      type: String,
      sparse: true,
    },
    avatar_url: {
      type: String,
    },
    refresh_token: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for location queries (sparse so missing coordinates don't fail)
UserSchema.index({ current_coordinates: "2dsphere" }, { sparse: true });

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
