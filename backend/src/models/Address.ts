import mongoose, { type Document, type Model } from "mongoose";

// Interface for User Address (Table 8: Saved Delivery Addresses)
export interface IAddress extends Document {
  customer_id: mongoose.Types.ObjectId;
  label: string;
  detail: string;
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
      type: mongoose.Schema.Types.ObjectId,
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
