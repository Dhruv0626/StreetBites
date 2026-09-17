import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.ts";
import { Stall } from "../models/Stall.ts";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Helper to get User ID from auth token or query/body
 */
const getUserId = (req: AuthenticatedRequest): string | null => {
  return (
    req.user?.id ||
    (req.query.userId as string) ||
    (req.body?.userId as string) ||
    (req.headers["x-user-id"] as string) ||
    null
  );
};

/**
 * @desc    Get all favorite stalls for current user
 * @route   GET /api/favorites
 */
export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Valid User ID is required to fetch favorites.",
      });
      return;
    }

    const user = await User.findById(userId).populate({
      path: "favorite_stalls",
      populate: {
        path: "cluster_id",
        select: "name",
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const favoriteStalls = (user.favorite_stalls || [])
      .filter((s: any) => Boolean(s && s._id))
      .map((s: any) => {
        const clusterName = s.cluster_id?.name || s.cluster || "Food Cluster";
        return {
          id: String(s._id),
          _id: s._id,
          name: s.name,
          stall_category: s.stall_category,
          cluster: clusterName,
          cluster_id: s.cluster_id?._id || s.cluster_id,
          rating: Number(s.rating) || 0,
          open_till: s.open_till || "",
          since: s.since || "1998",
          description: s.description || "",
          image_url: s.image_url || "",
          is_accepting_orders: s.status !== "CLOSED" && Boolean(s.is_accepting_orders),
          status: s.status || "ACTIVE",
          menu_items: (s.menu_items || []).map((m: any) => ({
            id: String(m._id),
            name: m.name,
            price: m.price || m.base_price || 0,
            description: m.description || "",
            image_url: m.image_url || "",
            is_available: m.is_available !== false,
            status: m.status || "Approved",
          })),
        };
      });

    res.status(200).json({
      success: true,
      count: favoriteStalls.length,
      favorite_stall_ids: favoriteStalls.map((s) => s.id),
      data: favoriteStalls,
    });
  } catch (error: any) {
    console.error("Get Favorites Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch favorite stalls.",
    });
  }
};

/**
 * @desc    Add a stall to user's favorites
 * @route   POST /api/favorites or POST /api/favorites/:stallId
 */
export const addFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const stallId = req.params.stallId || req.body?.stallId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Valid User ID is required.",
      });
      return;
    }

    if (!stallId || !mongoose.Types.ObjectId.isValid(stallId)) {
      res.status(400).json({
        success: false,
        message: "Valid Stall ID is required.",
      });
      return;
    }

    // Verify the stall exists
    const stallExists = await Stall.findById(stallId);
    if (!stallExists) {
      res.status(404).json({
        success: false,
        message: "Stall not found.",
      });
      return;
    }

    // Add stall to favorite_stalls array if not already present
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favorite_stalls: stallId } },
      { new: true }
    ).select("favorite_stalls");

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Stall added to favorites successfully.",
      data: {
        stallId,
        favorite_stalls: updatedUser.favorite_stalls,
      },
    });
  } catch (error: any) {
    console.error("Add Favorite Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to add stall to favorites.",
    });
  }
};

/**
 * @desc    Remove a stall from user's favorites
 * @route   DELETE /api/favorites/:stallId or DELETE /api/favorites
 */
export const removeFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const stallId = req.params.stallId || req.body?.stallId || req.query?.stallId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Valid User ID is required.",
      });
      return;
    }

    if (!stallId || !mongoose.Types.ObjectId.isValid(String(stallId))) {
      res.status(400).json({
        success: false,
        message: "Valid Stall ID is required.",
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { favorite_stalls: stallId } },
      { new: true }
    ).select("favorite_stalls");

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Stall removed from favorites successfully.",
      data: {
        stallId,
        favorite_stalls: updatedUser.favorite_stalls,
      },
    });
  } catch (error: any) {
    console.error("Remove Favorite Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to remove stall from favorites.",
    });
  }
};
