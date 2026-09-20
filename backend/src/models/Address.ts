import mongoose, { type Document, type Model } from "mongoose";

// Interface for User Address (Table 8: Saved Delivery Addresses)
export interface IAddress extends Document {
  customer_id: any;
  label: string;
  detail: string;
  house_no?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  is_primary: boolean;
  lat_lng: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema<IAddress>(
  {
    customer_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: [true, "Customer ID reference is required"],
    },
    label: {
      type: String,
      required: [true, "Address label is required (e.g. Home, Office)"],
      trim: true,
    },
    detail: {
      type: String,
      required: [true, "Full address details are required"],
      trim: true,
    },
    house_no: {
      type: String,
      default: "",
      trim: true,
    },
    area: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "Ahmedabad",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    landmark: {
      type: String,
      default: "",
      trim: true,
    },
    is_primary: {
      type: Boolean,
      default: false,
    },
    lat_lng: {
      type: PointSchema,
      required: [true, "Address coordinates are required"],
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location queries and fast customer address lookup
AddressSchema.index({ lat_lng: "2dsphere" });
AddressSchema.index({ customer_id: 1 });

export const Address: Model<IAddress> = mongoose.model<IAddress>("Address", AddressSchema);
export default Address;
