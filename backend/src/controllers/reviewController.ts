import type { Request, Response } from "express";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.ts";
import Stall from "../models/Stall.ts";
import Order from "../models/Order.ts";
import SubOrder from "../models/SubOrder.ts";
import User from "../models/User.ts";
import { memoryCache } from "../utils/cache.ts";
import { createNotification } from "../utils/notificationHelper.ts";

/**
 * Helper to safely resolve customer ID from token, headers, body, or query
 */
const getCustomerId = (req: Request): string | null => {
  const id =
    (req as any).user?.id ||
    (req as any).user?._id ||
    (req.headers["x-user-id"] as string) ||
    (req.headers["x-customer-id"] as string) ||
    (req.query.userId as string) ||
    (req.query.customer_id as string) ||
    (req.body?.userId as string) ||
    (req.body?.customer_id as string) ||
    (req.cookies?.customerId as string) ||
    null;

  return id && String(id).trim() ? String(id).trim() : null;
};

/**
 * Helper function to calculate and update average rating of a Stall
 */
export const recalculateStallAverageRating = async (stallId: mongoose.Types.ObjectId | string): Promise<{ averageRating: number; totalReviews: number }> => {
  const targetId = typeof stallId === "string" ? new mongoose.Types.ObjectId(stallId) : stallId;

  const reviews = await Feedback.find({
    stall_id: targetId,
    feedback_type: "REVIEW",
    rating: { $gte: 1, $lte: 5 },
  }).lean();

  if (!reviews || reviews.length === 0) {
    await Stall.findByIdAndUpdate(targetId, { rating: 0 });
    return { averageRating: 0, totalReviews: 0 };
  }

  const sum = reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;

  const updatedStall = await Stall.findByIdAndUpdate(
    targetId,
    { rating: avg },
    { new: true }
  ).lean();

  // Clear cluster cache so frontend receives updated rating immediately
  if (updatedStall?.cluster_id) {
    memoryCache.del("all_clusters");
    memoryCache.del(`cluster_${updatedStall.cluster_id.toString()}`);
  }

  return { averageRating: avg, totalReviews: reviews.length };
};

/**
 * @desc    Submit reviews / ratings for an order (single stall or multiple stalls)
 * @route   POST /api/reviews
 */
export const submitReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      res.status(401).json({
        success: false,
        message: "Customer authentication is required to leave a review.",
      });
      return;
    }

    const { order_id, stall_id, rating, comment, reviews } = req.body;

    if (!order_id) {
      res.status(400).json({
        success: false,
        message: "Order ID is required to submit a review.",
      });
      return;
    }

    // Verify order exists and belongs to this customer
    const order = await Order.findById(order_id);
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found.",
      });
      return;
    }

    if (order.customer_id && order.customer_id.toString() !== customerId.toString()) {
      res.status(403).json({
        success: false,
        message: "You can only review orders that belong to you.",
      });
      return;
    }

    // Order must be delivered before allowing reviews
    const normalizedStatus = String(order.status || "").toUpperCase();
    if (normalizedStatus !== "DELIVERED") {
      res.status(400).json({
        success: false,
        message: "You can rate stalls only after your food has been delivered.",
      });
      return;
    }

    // Build array of review submissions (supports single or batch review)
    const reviewList: Array<{ stall_id: string; rating: number; comment?: string }> = [];

    if (Array.isArray(reviews) && reviews.length > 0) {
      for (const rev of reviews) {
        if (rev.stall_id && rev.rating >= 1 && rev.rating <= 5) {
          reviewList.push({
            stall_id: String(rev.stall_id),
            rating: Math.min(5, Math.max(1, Math.round(Number(rev.rating)))),
            comment: rev.comment ? String(rev.comment).trim() : "",
          });
        }
      }
    } else if (stall_id && rating) {
      const numRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
      reviewList.push({
        stall_id: String(stall_id),
        rating: numRating,
        comment: comment ? String(comment).trim() : "",
      });
    }

    if (reviewList.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid rating (1 to 5 stars) and stall ID.",
      });
      return;
    }

    // Verify stalls belong to this order
    const subOrders = await SubOrder.find({ order_id: order._id }).lean();
    const validStallIds = new Set(
      subOrders
        .filter((so: any) => so.stall_id)
        .map((so: any) => so.stall_id.toString())
    );

    const savedReviews = [];
    const updatedStalls = [];

    for (const r of reviewList) {
      const targetStallId = r.stall_id;
      // Optional check if stall belongs to order
      if (validStallIds.size > 0 && !validStallIds.has(targetStallId)) {
        // Fallback: Check if targetStallId matches any stall or proceed
        const stallExists = await Stall.findById(targetStallId);
        if (!stallExists) continue;
      }

      // Upsert feedback record for this user, order, and stall
      const feedbackDoc = await Feedback.findOneAndUpdate(
        {
          user_id: new mongoose.Types.ObjectId(customerId),
          order_id: order._id,
          stall_id: new mongoose.Types.ObjectId(targetStallId),
          feedback_type: "REVIEW",
        },
        {
          user_id: new mongoose.Types.ObjectId(customerId),
          order_id: order._id,
          stall_id: new mongoose.Types.ObjectId(targetStallId),
          feedback_type: "REVIEW",
          rating: r.rating,
          comment: r.comment || "Great street food!",
          status: "RESOLVED",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      savedReviews.push(feedbackDoc);

      // Recalculate and persist the stall's average rating
      const { averageRating, totalReviews } = await recalculateStallAverageRating(targetStallId);
      updatedStalls.push({
        stallId: targetStallId,
        averageRating,
        totalReviews,
      });
    }

    res.status(200).json({
      success: true,
      message: "Thank you! Your ratings and feedback have been saved successfully.",
      reviews: savedReviews,
      updatedStalls,
    });
  } catch (error: any) {
    console.error("Submit Review Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to submit review.",
    });
  }
};

/**
 * @desc    Get reviews submitted for a specific order by the customer
 * @route   GET /api/reviews/order/:orderId
 */
export const getOrderReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({ success: false, message: "Order ID is required." });
      return;
    }

    const query: any = {
      order_id: new mongoose.Types.ObjectId(orderId),
      feedback_type: "REVIEW",
    };

    if (customerId) {
      query.user_id = new mongoose.Types.ObjectId(customerId);
    }

    const reviews = await Feedback.find(query)
      .populate("stall_id", "name image_url rating")
      .lean();

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error("Get Order Reviews Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch order reviews.",
    });
  }
};

/**
 * @desc    Get all public reviews and average rating for a stall
 * @route   GET /api/reviews/stall/:stallId
 */
export const getStallReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stallId } = req.params;

    if (!stallId) {
      res.status(400).json({ success: false, message: "Stall ID is required." });
      return;
    }

    const stall = await Stall.findById(stallId).lean();
    if (!stall) {
      res.status(404).json({ success: false, message: "Stall not found." });
      return;
    }

    const reviews = await Feedback.find({
      stall_id: stall._id,
      feedback_type: "REVIEW",
      rating: { $gte: 1, $lte: 5 },
    })
      .populate("user_id", "name")
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews) * 10
          ) / 10
        : (stall.rating || 0);

    // Distribution breakdown
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
      distribution[star] = (distribution[star] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        stallId: stall._id,
        stallName: stall.name,
        averageRating,
        totalReviews,
        distribution,
        reviews: reviews.map((r: any) => ({
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          userName: r.user_id?.name || "Verified Customer",
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get Stall Reviews Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch stall reviews.",
    });
  }
};

/**
 * @desc    Submit a complaint / report an issue for an order
 * @route   POST /api/reviews/complaint
 */
export const submitCustomerComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      res.status(401).json({
        success: false,
        message: "Customer authentication is required to submit a complaint.",
      });
      return;
    }

    const { order_id, stall_id, issue_type, comment } = req.body;

    if (!comment || !String(comment).trim()) {
      res.status(400).json({
        success: false,
        message: "Please describe the problem or issue you encountered.",
      });
      return;
    }

    const validIssueTypes = ["FOOD_QUALITY", "LATE_DELIVERY", "WRONG_ITEM", "RIDER_BEHAVIOR", "OTHER"];
    const normalizedIssue = validIssueTypes.includes(issue_type) ? issue_type : "OTHER";

    let targetOrderId = null;
    let targetStallId = null;

    if (order_id) {
      const orderDoc = await Order.findById(order_id);
      if (orderDoc) {
        targetOrderId = orderDoc._id;
        targetStallId = stall_id ? new mongoose.Types.ObjectId(stall_id) : (orderDoc.cluster_id || null);
      }
    }

    if (!targetStallId && stall_id) {
      targetStallId = new mongoose.Types.ObjectId(stall_id);
    }

    const complaintDoc = await Feedback.create({
      user_id: new mongoose.Types.ObjectId(customerId),
      order_id: targetOrderId,
      stall_id: targetStallId,
      feedback_type: "COMPLAINT",
      issue_type: normalizedIssue,
      comment: String(comment).trim(),
      status: "OPEN",
    });

    // Notify customer
    await createNotification({
      user_id: new mongoose.Types.ObjectId(customerId),
      type: "SYSTEM",
      title: "Complaint Ticket Raised",
      message: `Your complaint has been logged (Ticket #TKT-${complaintDoc._id.toString().slice(-6).toUpperCase()}). Our support team will investigate and follow up shortly.`,
      data: { ticket_id: complaintDoc._id, order_id: targetOrderId },
    });

    res.status(201).json({
      success: true,
      message: `Support ticket #TKT-${complaintDoc._id.toString().slice(-6).toUpperCase()} created successfully. Our team will resolve it soon.`,
      data: {
        ticketId: `TKT-${complaintDoc._id.toString().slice(-6).toUpperCase()}`,
        _id: complaintDoc._id,
        status: complaintDoc.status,
        issueType: complaintDoc.issue_type,
        comment: complaintDoc.comment,
        createdAt: complaintDoc.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Submit Customer Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to submit complaint.",
    });
  }
};

