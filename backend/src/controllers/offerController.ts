import type { Request, Response } from "express";
import { Offer } from "../models/Offer.ts";

/**
 * @desc    Get All Offers / Promotions (with optional search and audience filtering)
 * @route   GET /api/offers
 */
export const getOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { audience, active, search } = req.query;

    const filter: any = {};
    const conditions: any[] = [];

    if (audience && audience !== "All") {
      conditions.push({ target_audience: audience });
    }

    if (active !== undefined && active !== "") {
      filter.is_active = active === "true" || active === true;
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      conditions.push({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
        ],
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    let offers = await Offer.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error: any) {
    console.error("Get Offers Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch offers.",
    });
  }
};

/**
 * @desc    Get Single Offer by ID
 * @route   GET /api/offers/:id
 */
export const getOfferById = async (req: Request, res: Response): Promise<void> => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found." });
      return;
    }
    res.status(200).json({ success: true, data: offer });
  } catch (error: any) {
    console.error("Get Offer Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch offer." });
  }
};

/**
 * @desc    Create New Promotion / Offer
 * @route   POST /api/offers
 */
export const createOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      discount_percentage = 0,
      flat_discount_amount = 0,
      min_order_amount = 0,
      max_cap_amount = 0,
      target_audience = "ALL",
      is_active = true,
      stall_id = null,
    } = req.body || {};

    if (!title || !description) {
      res.status(400).json({ success: false, message: "Title and description are required." });
      return;
    }

    const offer = await Offer.create({
      title: String(title).trim(),
      description: String(description).trim(),
      discount_percentage: Number(discount_percentage) || 0,
      flat_discount_amount: Number(flat_discount_amount) || 0,
      min_order_amount: Number(min_order_amount) || 0,
      max_cap_amount: Number(max_cap_amount) || 0,
      target_audience: ["ALL", "NEW_USERS", "CLUSTER_SPECIFIC"].includes(target_audience)
        ? target_audience
        : "ALL",
      is_active: is_active ?? true,
      stall_id: stall_id || null,
    });

    res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      data: offer,
    });
  } catch (error: any) {
    console.error("Create Offer Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create offer.",
    });
  }
};

/**
 * @desc    Update Existing Offer
 * @route   PUT /api/offers/:id
 */
export const updateOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      discount_percentage,
      flat_discount_amount,
      min_order_amount,
      max_cap_amount,
      target_audience,
      is_active,
      stall_id,
    } = req.body || {};

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found." });
      return;
    }

    if (title !== undefined) offer.title = String(title).trim();
    if (description !== undefined) offer.description = String(description).trim();
    if (discount_percentage !== undefined) offer.discount_percentage = Number(discount_percentage) || 0;
    if (flat_discount_amount !== undefined) offer.flat_discount_amount = Number(flat_discount_amount) || 0;
    if (min_order_amount !== undefined) offer.min_order_amount = Number(min_order_amount) || 0;
    if (max_cap_amount !== undefined) offer.max_cap_amount = Number(max_cap_amount) || 0;
    if (target_audience !== undefined && ["ALL", "NEW_USERS", "CLUSTER_SPECIFIC"].includes(target_audience)) {
      offer.target_audience = target_audience;
    }
    if (is_active !== undefined) offer.is_active = Boolean(is_active);
    if (stall_id !== undefined) offer.stall_id = stall_id || null;

    await offer.save();

    res.status(200).json({
      success: true,
      message: "Offer updated successfully.",
      data: offer,
    });
  } catch (error: any) {
    console.error("Update Offer Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update offer.",
    });
  }
};

/**
 * @desc    Toggle Offer Active Status
 * @route   PUT /api/offers/:id/toggle
 */
export const toggleOfferStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found." });
      return;
    }

    offer.is_active = !offer.is_active;
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer ${offer.is_active ? "activated" : "deactivated"} successfully.`,
      data: offer,
    });
  } catch (error: any) {
    console.error("Toggle Offer Error:", error);
    res.status(500).json({ success: false, message: "Failed to toggle offer status." });
  }
};

/**
 * @desc    Delete Offer
 * @route   DELETE /api/offers/:id
 */
export const deleteOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully.",
      data: { id: req.params.id },
    });
  } catch (error: any) {
    console.error("Delete Offer Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete offer.",
    });
  }
};
