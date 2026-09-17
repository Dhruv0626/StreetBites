import mongoose, { type Document, type Model } from "mongoose";

export type FeedbackType = "REVIEW" | "COMPLAINT";
export type ComplaintIssueType =
  | "FOOD_QUALITY"
  | "LATE_DELIVERY"
  | "WRONG_ITEM"
  | "RIDER_BEHAVIOR"
  | "OTHER";
export type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

// Interface for Feedback (Table 10: Reviews & Complaints)
export interface IFeedback extends Document {
  user_id: mongoose.Types.ObjectId;
  order_id?: mongoose.Types.ObjectId | null;
  stall_id?: mongoose.Types.ObjectId | null;
  feedback_type: FeedbackType;
  rating?: number | null; // 1 to 5 stars for public reviews
  issue_type?: ComplaintIssueType | null; // For private complaints
  comment: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new mongoose.Schema<IFeedback>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID reference is required"],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    stall_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stall",
      default: null,
    },
    feedback_type: {
      type: String,
      enum: ["REVIEW", "COMPLAINT"],
      required: [true, "Feedback type is required"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    issue_type: {
      type: String,
      enum: ["FOOD_QUALITY", "LATE_DELIVERY", "WRONG_ITEM", "RIDER_BEHAVIOR", "OTHER"],
      default: null,
    },
    comment: {
      type: String,
      required: [true, "Comment or feedback description is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED"],
      default: "OPEN",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for stall review queries and admin complaint handling
FeedbackSchema.index({ stall_id: 1, feedback_type: 1 });
FeedbackSchema.index({ user_id: 1 });
FeedbackSchema.index({ status: 1 });

export const Feedback: Model<IFeedback> = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default Feedback;
