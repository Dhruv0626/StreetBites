import mongoose, { type Document, type Model } from "mongoose";

// Interface for Cluster (Table 2: Clusters / Khau Gallis)
export interface ICluster extends Document {
  name: string;
  city: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  image_url: string;
  is_active: boolean;
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

const ClusterSchema = new mongoose.Schema<ICluster>(
  {
    name: {
      type: String,
      required: [true, "Cluster name is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City name is required"],
      trim: true,
    },
    coordinates: {
      type: PointSchema,
      required: [true, "Cluster coordinates are required"],
    },
    image_url: {
      type: String,
      required: [true, "Cluster cover image is required"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location-based cluster searches
ClusterSchema.index({ coordinates: "2dsphere" });

export const Cluster: Model<ICluster> = mongoose.model<ICluster>("Cluster", ClusterSchema);
export default Cluster;
