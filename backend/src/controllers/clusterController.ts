import type { Request, Response } from "express";
import { Cluster } from "../models/Cluster.ts";
import { Stall } from "../models/Stall.ts";
import { User } from "../models/User.ts";
import { FoodItem } from "../models/FoodItem.ts";
import { uploadToCloudinary, DocumentValidationError } from "../utils/cloudinary.ts";

/**
 * @desc    Get all clusters with their nested stalls & live counts from MongoDB
 * @route   GET /api/clusters
 */
export const getClusters = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clusters = await Cluster.find().sort({ createdAt: -1 }).lean();
    const approvedFoodItems = await FoodItem.find({
      status: { $in: ["Approved", "APPROVED", "approved"] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // Fetch stalls for each cluster and populate vendor user details safely
    const clustersWithStalls = await Promise.all(
      clusters.map(async (cluster) => {
        let stalls: any[] = [];
        try {
          stalls = await Stall.find({ cluster_id: cluster._id })
            .populate("vendor_id", "name email phone_number")
            .populate("menu_items.food_item_id", "name image_url status")
            .lean();
        } catch (stallErr) {
          console.error(`Error populating stalls for cluster ${cluster._id}:`, stallErr);
          stalls = await Stall.find({ cluster_id: cluster._id }).lean();
        }

        const formattedStalls = (stalls || []).map((stall: any) => ({
          _id: stall._id,
          id: stall._id ? stall._id.toString() : "",
          vendor_id: stall.vendor_id,
          cluster_id: stall.cluster_id,
          name: stall.name,
          stall_category: stall.stall_category,
          description: stall.description || "",
          since: stall.since || "1998",
          rating: stall.rating || 0,
          image_url: stall.image_url,
          open_till: stall.open_till || "",
          is_accepting_orders: Boolean(stall.is_accepting_orders),
          last_opened_at: stall.last_opened_at || null,
          status: stall.status || "ACTIVE",
          menu_items: (stall.menu_items || []).map((m: any) => ({
            _id: m._id,
            id: m._id ? m._id.toString() : "",
            name: m.name,
            description: m.description || "",
            base_price: m.base_price,
            price: m.price,
            image_url: m.image_url || "",
            is_available: m.is_available !== false,
            category: m.food_item_id?.name || stall.stall_category || "General",
            food_item_id: m.food_item_id?._id || m.food_item_id,
            status: m.food_item_id?.status || "Review_pending",
          })),
        }));

        return {
          _id: cluster._id,
          id: cluster._id ? cluster._id.toString() : "",
          name: cluster.name,
          city: cluster.city,
          coordinates: cluster.coordinates,
          image_url: cluster.image_url,
          is_active: cluster.is_active !== false,
          stalls: formattedStalls,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: clustersWithStalls,
      food_items: approvedFoodItems.map((f: any) => ({
        id: f._id ? f._id.toString() : "",
        _id: f._id ? f._id.toString() : "",
        name: f.name,
        image: f.image_url || "",
        image_url: f.image_url || "",
        status: "Approved",
      })),
    });
  } catch (error: any) {
    console.error("Get Clusters Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch clusters from database.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single cluster by ID with its stalls & menu
 * @route   GET /api/clusters/:id
 */
export const getClusterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cluster = await Cluster.findById(id).lean();

    if (!cluster) {
      res.status(404).json({
        success: false,
        message: "Cluster not found.",
      });
      return;
    }

    const stalls = await Stall.find({ cluster_id: cluster._id })
      .populate("vendor_id", "name email phone_number")
      .populate("menu_items.food_item_id", "name image_url status")
      .lean();

    const formattedStalls = (stalls || []).map((stall: any) => ({
      _id: stall._id,
      id: stall._id ? stall._id.toString() : "",
      vendor_id: stall.vendor_id,
      cluster_id: stall.cluster_id,
      name: stall.name,
      stall_category: stall.stall_category,
      description: stall.description || "",
      since: stall.since || "1998",
      rating: stall.rating || 0,
      image_url: stall.image_url,
      open_till: stall.open_till || "",
      is_accepting_orders: Boolean(stall.is_accepting_orders),
      last_opened_at: stall.last_opened_at || null,
      status: stall.status || "ACTIVE",
      menu_items: (stall.menu_items || []).map((m: any) => ({
        _id: m._id,
        id: m._id ? m._id.toString() : "",
        name: m.name,
        description: m.description || "",
        base_price: m.base_price,
        price: m.price,
        image_url: m.image_url || "",
        is_available: m.is_available !== false,
        category: m.food_item_id?.name || stall.stall_category || "General",
        food_item_id: m.food_item_id?._id || m.food_item_id,
        status: m.food_item_id?.status || "Review_pending",
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        ...cluster,
        stalls: formattedStalls,
      },
    });
  } catch (error: any) {
    console.error("Get Cluster By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cluster details.",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new Food Cluster (Admin)
 * @route   POST /api/clusters
 */
export const createCluster = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, city, imageUrl, coordinates } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Cluster name is required.",
      });
      return;
    }

    const clusterCity = (city && typeof city === "string" && city.trim()) ? city.trim() : "Ahmedabad";

    let lng = 72.5714;
    let lat = 23.0225;

    if (coordinates) {
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        lng = typeof coordinates[0] === "number" ? coordinates[0] : parseFloat(coordinates[0]) || 72.5714;
        lat = typeof coordinates[1] === "number" ? coordinates[1] : parseFloat(coordinates[1]) || 23.0225;
      } else if (typeof coordinates === "object") {
        lng = coordinates.lng !== undefined ? parseFloat(coordinates.lng) : coordinates.longitude !== undefined ? parseFloat(coordinates.longitude) : 72.5714;
        lat = coordinates.lat !== undefined ? parseFloat(coordinates.lat) : coordinates.latitude !== undefined ? parseFloat(coordinates.latitude) : 23.0225;
      }
    }

    let uploadedImageUrl = imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
    if (imageUrl && imageUrl.startsWith("data:")) {
      uploadedImageUrl = await uploadToCloudinary(imageUrl, "streetbites/clusters", {
        label: "Cluster Image",
        maxSizeBytes: 5 * 1024 * 1024,
        allowedExtensions: ["JPG", "JPEG", "PNG"],
      });
    }

    const newCluster = await Cluster.create({
      name: name.trim(),
      city: clusterCity,
      image_url: uploadedImageUrl,
      coordinates: {
        type: "Point",
        coordinates: [lng, lat],
      },
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: "Cluster created successfully in MongoDB.",
      data: {
        id: newCluster._id.toString(),
        name: newCluster.name,
        city: newCluster.city,
        revenue: "₹0",
        imageUrl: newCluster.image_url,
        is_active: newCluster.is_active,
        coordinates: {
          lng: newCluster.coordinates.coordinates[0],
          lat: newCluster.coordinates.coordinates[1],
        },
        stalls: [],
      },
    });
  } catch (error: any) {
    console.error("Create Cluster Error:", error);
    const statusCode = error?.statusCode || (error instanceof DocumentValidationError || error?.name === "DocumentValidationError" ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to create cluster in database.",
      error: error.message,
    });
  }
};

/**
 * @desc    Update Food Cluster (Admin)
 * @route   PUT /api/clusters/:id
 */
export const updateCluster = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, city, imageUrl, coordinates, is_active } = req.body;

    const cluster = await Cluster.findById(id);
    if (!cluster) {
      res.status(404).json({
        success: false,
        message: "Cluster not found.",
      });
      return;
    }

    if (name !== undefined && typeof name === "string") cluster.name = name.trim();
    if (city !== undefined && typeof city === "string") cluster.city = city.trim();
    if (imageUrl !== undefined && typeof imageUrl === "string") {
      if (imageUrl.startsWith("data:")) {
        cluster.image_url = await uploadToCloudinary(imageUrl, "streetbites/clusters", {
          label: "Cluster Image",
          maxSizeBytes: 5 * 1024 * 1024,
          allowedExtensions: ["JPG", "JPEG", "PNG"],
        });
      } else if (imageUrl.trim()) {
        cluster.image_url = imageUrl.trim();
      }
    }
    if (is_active !== undefined) cluster.is_active = is_active;
    if (coordinates) {
      let lng = cluster.coordinates.coordinates[0];
      let lat = cluster.coordinates.coordinates[1];
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        lng = typeof coordinates[0] === "number" ? coordinates[0] : parseFloat(coordinates[0]) || lng;
        lat = typeof coordinates[1] === "number" ? coordinates[1] : parseFloat(coordinates[1]) || lat;
      } else if (typeof coordinates === "object") {
        if (coordinates.lng !== undefined) lng = parseFloat(coordinates.lng) || lng;
        if (coordinates.lat !== undefined) lat = parseFloat(coordinates.lat) || lat;
      }
      cluster.coordinates = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    await cluster.save();

    res.status(200).json({
      success: true,
      message: "Cluster updated successfully in MongoDB.",
      data: {
        id: cluster._id.toString(),
        name: cluster.name,
        city: cluster.city,
        imageUrl: cluster.image_url,
        is_active: cluster.is_active,
        coordinates: {
          lng: cluster.coordinates.coordinates[0],
          lat: cluster.coordinates.coordinates[1],
        },
      },
    });
  } catch (error: any) {
    console.error("Update Cluster Error:", error);
    const statusCode = error?.statusCode || (error instanceof DocumentValidationError || error?.name === "DocumentValidationError" ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to update cluster.",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete Food Cluster (Admin)
 * @route   DELETE /api/clusters/:id
 */
export const deleteCluster = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cluster = await Cluster.findByIdAndDelete(id);

    if (!cluster) {
      res.status(404).json({
        success: false,
        message: "Cluster not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Cluster deleted successfully from database.",
    });
  } catch (error: any) {
    console.error("Delete Cluster Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete cluster.",
      error: error.message,
    });
  }
};
