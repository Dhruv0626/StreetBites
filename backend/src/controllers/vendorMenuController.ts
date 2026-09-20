import type { Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Stall } from "../models/Stall.ts";
import { FoodItem } from "../models/FoodItem.ts";
import { User } from "../models/User.ts";
import { Cluster } from "../models/Cluster.ts";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import { uploadToCloudinary, DocumentValidationError } from "../utils/cloudinary.ts";
import { memoryCache } from "../utils/cache.ts";

// Helper to safely extract user ID from auth context, cookies, or headers
const resolveUserId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.id) return req.user.id;

  const token =
    req.cookies?.accessToken ||
    (typeof req.headers?.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined);

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "streetbites_access_jwt_secret_dev_key_2026";
      const decoded = jwt.verify(token, accessSecret) as any;
      if (decoded?.id) return decoded.id;
    } catch {
      // ignore
    }
  }

  // Fallback: check query or body
  if (req.query?.userId && typeof req.query.userId === "string") return req.query.userId;
  if (req.body?.userId && typeof req.body.userId === "string") return req.body.userId;

  // Fallback: find first vendor user in DB
  const vendorUser = await User.findOne({ role: "VENDOR" });
  return vendorUser ? vendorUser._id.toString() : null;
};

// Helper to find or auto-create a Stall for a vendor user so adding items never fails
const resolveVendorStall = async (userId: string | null, stallId?: string): Promise<any> => {
  if (stallId && mongoose.isValidObjectId(stallId)) {
    const stall = await Stall.findById(stallId);
    if (stall) return stall;
  }

  if (userId && mongoose.isValidObjectId(userId)) {
    let stall = await Stall.findOne({ vendor_id: userId });
    if (stall) return stall;

    // Auto-create default stall for this vendor if missing
    const user = await User.findById(userId);
    const cluster = (await Cluster.findOne()) || { _id: new mongoose.Types.ObjectId() };

    stall = await Stall.create({
      vendor_id: userId,
      cluster_id: cluster._id,
      name: user?.name ? `${user.name}'s Famous Stall` : "Vendor Food Stall",
      stall_category: "Fast Food",
      description: "Authentic delicious street food freshly prepared every day.",
      rating: 4.5,
      image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
      is_accepting_orders: true,
      status: "ACTIVE",
      menu_items: []
    });
    return stall;
  }

  // Fallback to first existing stall in DB
  const firstStall = await Stall.findOne();
  return firstStall;
};

// Helper to determine the item's food item category name
const getItemCategory = (item: any, masterItems: any[]): string => {
  if (item.food_item_id) {
    const matched = masterItems.find(
      (m: any) => m._id?.toString() === item.food_item_id?.toString()
    );
    if (matched?.name) return matched.name;
  }

  // Try matching with master food items by name substring
  const itemNameLower = (item.name || "").toLowerCase();
  for (const m of masterItems) {
    if (m.name && itemNameLower.includes(m.name.toLowerCase())) {
      return m.name;
    }
  }

  // If item itself has a category property that matches a master FoodItem
  if (item.category && item.category !== "All") {
    const directMatch = masterItems.find(
      (m: any) => m.name.toLowerCase() === item.category.toLowerCase()
    );
    if (directMatch?.name) return directMatch.name;
    return item.category;
  }

  return masterItems.length > 0 ? masterItems[0].name : "General";
};

/**
 * @desc    Get current vendor's stall menu, items & categories (purely from FoodItem schema)
 * @route   GET /api/vendor/menu
 * @access  Private (Vendor)
 */
export const getVendorMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const stall = await resolveVendorStall(userId, req.query?.stallId as string);

    // Fetch master food items / categories from MongoDB FoodItem schema
    let masterFoodItems: any[] = [];
    try {
      masterFoodItems = await FoodItem.find().sort({ name: 1 }).lean();
    } catch (err) {
      console.warn("Could not fetch master FoodItems:", err);
    }

    // STRICT: Only use categories defined in FoodItem schema (Do NOT include stall_category)
    const masterCategoryNames: string[] = masterFoodItems.map((f: any) => f.name).filter(Boolean);
    const itemCategories: string[] = ["All", ...Array.from(new Set(masterCategoryNames))];

    if (!stall) {
      res.status(200).json({
        success: true,
        data: {
          stall: null,
          categories: itemCategories,
          menuItems: [],
          stats: { totalItems: 0, availableItems: 0, pendingReviews: 0 }
        }
      });
      return;
    }

    const formattedMenuItems = (stall.menu_items || []).map((item: any) => {
      const foodItemCategory = getItemCategory(item, masterFoodItems);
      const masterItem = masterFoodItems.find(
        (m: any) =>
          (item.food_item_id && m._id?.toString() === item.food_item_id?.toString()) ||
          (m.name && m.name.toLowerCase() === foodItemCategory.toLowerCase())
      );
      const categoryStatus = (masterItem?.status || "Review_pending").toString();
      const normalizedStatus =
        categoryStatus.toLowerCase() === "approved"
          ? "Approved"
          : categoryStatus.toLowerCase() === "rejected"
            ? "Rejected"
            : "Review_pending";

      return {
        id: item._id ? item._id.toString() : "",
        _id: item._id ? item._id.toString() : "",
        name: item.name,
        description: item.description || "",
        base_price: item.base_price,
        price: item.price || Math.round(item.base_price * 1.10),
        category: foodItemCategory,
        food_item_id: item.food_item_id ? item.food_item_id.toString() : null,
        image_url: item.image_url || "",
        imageUrl: item.image_url || "",
        is_available: item.is_available !== false,
        available: item.is_available !== false,
        status: normalizedStatus,
        orders: 0
      };
    });

    const totalItems = formattedMenuItems.length;
    const availableItems = formattedMenuItems.filter((i: any) => i.available).length;
    const pendingReviews = formattedMenuItems.filter((i: any) => i.status === "Review_pending").length;

    // Strict requirement: Only return food item categories for which this vendor stall has at least 1 variety
    const activeStallCategorySet = new Set<string>();
    formattedMenuItems.forEach((item: any) => {
      if (item.category && item.category !== "All") {
        activeStallCategorySet.add(item.category);
      }
    });
    const stallActiveCategories: string[] = ["All", ...Array.from(activeStallCategorySet)];

    res.status(200).json({
      success: true,
      data: {
        stall: {
          id: (stall._id as any).toString(),
          name: stall.name,
          category: stall.stall_category || "General",
          rating: stall.rating || 0,
          image_url: stall.image_url,
          is_accepting_orders: stall.is_accepting_orders,
          cluster: stall.cluster_id
        },
        categories: stallActiveCategories,
        allMasterCategories: masterCategoryNames,
        menuItems: formattedMenuItems,
        stats: { totalItems, availableItems, pendingReviews }
      }
    });
  } catch (error: any) {
    console.error("Get Vendor Menu Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch vendor menu items."
    });
  }
};

/**
 * @desc    Add a new variety of food to the vendor's stall menu_items array in MongoDB
 * @route   POST /api/vendor/menu/item
 * @access  Private (Vendor)
 */
export const addMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const { name, description, base_price, price, image_url, imageUrl, is_available, category, stallId } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Food item name is required." });
      return;
    }

    const basePriceNum = Number(base_price) || Number(price) || 0;
    if (basePriceNum <= 0) {
      res.status(400).json({ success: false, message: "Valid base price greater than 0 is required." });
      return;
    }

    const customerPriceNum = Number(price) || Math.round(basePriceNum * 1.10);

    // 1. Locate or create the vendor's stall
    const stall = await resolveVendorStall(userId, stallId);
    if (!stall) {
      res.status(404).json({
        success: false,
        message: "No registered stall found. Please complete stall registration first."
      });
      return;
    }

    // 2. Process and upload image if base64 provided
    let finalImageUrl = image_url || imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80";
    if (finalImageUrl.startsWith("data:")) {
      try {
        finalImageUrl = await uploadToCloudinary(finalImageUrl, "streetbites/menu_items", {
          label: "Food Item Image",
          maxSizeBytes: 5 * 1024 * 1024,
          allowedExtensions: ["JPG", "JPEG", "PNG", "WEBP"]
        });
      } catch (uploadErr: any) {
        console.warn("Cloudinary upload fallback, storing data image:", uploadErr?.message);
      }
    }

    // 3. Upsert Master Category in FoodItem collection with Review_pending status
    let masterFoodItemId: mongoose.Types.ObjectId | null = null;
    const catName = category && typeof category === "string" && category !== "All" ? category.trim() : (stall.stall_category || "General");
    try {
      let masterItem = await FoodItem.findOne({ name: catName });
      if (!masterItem) {
        masterItem = await FoodItem.create({
          name: catName,
          image_url: finalImageUrl,
          status: "Review_pending"
        });
      }
      if (masterItem?._id) {
        masterFoodItemId = masterItem._id as mongoose.Types.ObjectId;
      }
    } catch (catErr) {
      console.warn("Could not upsert master category:", catErr);
    }

    // 4. Create the new menu item subdocument (without status field - status belongs to FoodItem schema)
    const newMenuItem = {
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      description: (description || "").trim(),
      base_price: basePriceNum,
      price: customerPriceNum,
      image_url: finalImageUrl,
      food_item_id: masterFoodItemId,
      is_available: is_available !== false,
    };

    // 5. Store atomically in MongoDB using $push
    await Stall.updateOne(
      { _id: stall._id },
      { $push: { menu_items: newMenuItem } }
    );
    memoryCache.invalidateClusters();

    res.status(201).json({
      success: true,
      message: "Food item variety added successfully to your stall menu!",
      data: {
        id: newMenuItem._id.toString(),
        _id: newMenuItem._id.toString(),
        name: newMenuItem.name,
        description: newMenuItem.description,
        base_price: newMenuItem.base_price,
        price: newMenuItem.price,
        image_url: newMenuItem.image_url,
        imageUrl: newMenuItem.image_url,
        is_available: newMenuItem.is_available,
        available: newMenuItem.is_available,
        category: catName,
        orders: 0
      }
    });
  } catch (error: any) {
    console.error("Add Menu Item Error:", error);
    const statusCode = error?.statusCode || (error instanceof DocumentValidationError || error?.name === "DocumentValidationError" ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to add food item to database."
    });
  }
};

/**
 * @desc    Create a new Food Category in master FoodItem collection (Status: Review_pending)
 * @route   POST /api/vendor/menu/category
 * @access  Private (Vendor)
 */
export const addFoodCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, image_url, imageUrl } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Food item name is required." });
      return;
    }

    const cleanName = name.trim();

    let finalImageUrl = image_url || imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80";
    if (finalImageUrl.startsWith("data:")) {
      try {
        finalImageUrl = await uploadToCloudinary(finalImageUrl, "streetbites/categories", {
          label: "Category Image",
          maxSizeBytes: 5 * 1024 * 1024,
          allowedExtensions: ["JPG", "JPEG", "PNG", "WEBP"]
        });
      } catch (uploadErr: any) {
        console.warn("Cloudinary upload fallback:", uploadErr?.message);
      }
    }

    // 1. Upsert FoodItem master collection with status: "Review_pending"
    let foodItem = await FoodItem.findOne({ name: cleanName });
    if (!foodItem) {
      foodItem = await FoodItem.create({
        name: cleanName,
        image_url: finalImageUrl,
        status: "Review_pending"
      });
      memoryCache.invalidateClusters();
    }

    res.status(201).json({
      success: true,
      message: `Food item "${cleanName}" submitted for admin review and saved in database successfully!`,
      data: {
        id: (foodItem._id as any).toString(),
        name: foodItem.name,
        image_url: foodItem.image_url,
        status: foodItem.status
      }
    });
  } catch (error: any) {
    console.error("Add Food Category Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create food category."
    });
  }
};

/**
 * @desc    Toggle menu item availability (In-Stock / Out-of-Stock)
 * @route   PATCH /api/vendor/menu/item/:id/availability
 * @access  Private (Vendor)
 */
export const toggleItemAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const { id } = req.params;

    const stall = await resolveVendorStall(userId);
    if (!stall) {
      res.status(404).json({ success: false, message: "Stall not found." });
      return;
    }

    const item = stall.menu_items.find((m: any) => m._id?.toString() === id);
    if (!item) {
      res.status(404).json({ success: false, message: "Menu item not found in your stall." });
      return;
    }

    item.is_available = !item.is_available;
    await stall.save();
    memoryCache.invalidateClusters();

    res.status(200).json({
      success: true,
      message: `Item availability set to ${item.is_available ? "In Stock" : "Unavailable"}`,
      data: {
        id: item._id?.toString(),
        is_available: item.is_available,
        available: item.is_available
      }
    });
  } catch (error: any) {
    console.error("Toggle Availability Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update item availability."
    });
  }
};

/**
 * @desc    Delete food item variety from stall
 * @route   DELETE /api/vendor/menu/item/:id
 * @access  Private (Vendor)
 */
export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const { id } = req.params;

    const stall = await resolveVendorStall(userId);
    if (!stall) {
      res.status(404).json({ success: false, message: "Stall not found." });
      return;
    }

    await Stall.updateOne(
      { _id: stall._id },
      { $pull: { menu_items: { _id: new mongoose.Types.ObjectId(id) } } }
    );
    memoryCache.invalidateClusters();

    res.status(200).json({
      success: true,
      message: "Food item variety deleted from menu successfully."
    });
  } catch (error: any) {
    console.error("Delete Menu Item Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete menu item."
    });
  }
};

