import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Cart } from "../models/Cart.ts";
import { Stall } from "../models/Stall.ts";
import { Cluster } from "../models/Cluster.ts";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Helper to safely resolve customer ID from token, headers, query, body, or cookies
 */
const getCustomerId = (req: AuthenticatedRequest): string | null => {
  const id =
    req.user?.id ||
    (req.headers["x-user-id"] as string) ||
    (req.headers["x-customer-id"] as string) ||
    (req.query.userId as string) ||
    (req.body?.userId as string) ||
    (req.cookies?.customerId as string) ||
    null;

  return id && String(id).trim() ? String(id).trim() : null;
};

/**
 * Helper to format cart response from the single consolidated Cart document
 */
const formatCartResponse = async (customerId: string) => {
  const query: any = {
    $or: [
      { customer_id: String(customerId) },
      ...(mongoose.Types.ObjectId.isValid(customerId)
        ? [{ customer_id: new mongoose.Types.ObjectId(customerId) }]
        : []),
    ],
  };

  const cart = await Cart.findOne(query)
    .populate({
      path: "items.stall_id",
      select: "name stall_category image_url is_accepting_orders status",
    })
    .populate({
      path: "cluster_id",
      select: "name city coordinates",
    });

  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      items: [],
      khauGalli: null,
      stallsCount: 0,
      totalItems: 0,
      subtotal: 0,
      deliveryFee: 0,
      taxes: 0,
      total: 0,
    };
  }

  const clusterObj: any = cart.cluster_id;
  const khauGalli = {
    id: String(clusterObj?._id || clusterObj || cart.cluster_id || ""),
    name: clusterObj?.name || cart.khau_galli_name || "Khau Galli",
    city: clusterObj?.city || "Ahmedabad",
    coordinates: clusterObj?.coordinates?.coordinates || [72.5873, 23.0248], // [lng, lat]
  };

  const items = cart.items.map((item: any) => {
    const stallObj: any = item.stall_id;
    const stallIdStr = String(stallObj?._id || stallObj || item.stall_id || "");
    const stallNameStr = stallObj?.name || item.stall_name || "Stall";
    const stallCategoryStr = stallObj?.stall_category || "Street Food";

    return {
      id: item.item_id,
      _id: String(item._id || item.item_id),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
      stallId: stallIdStr,
      stallName: stallNameStr,
      vendorId: stallIdStr,
      vendorName: stallNameStr,
      vendorCategory: stallCategoryStr,
      khauGalliId: String(clusterObj?._id || clusterObj || cart.cluster_id || ""),
      khauGalliName: cart.khau_galli_name || clusterObj?.name || "Khau Galli",
    };
  });

  const distinctStalls = new Set(items.map((i) => i.stallId));
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + (i.price || 0) * i.quantity, 0);
  const deliveryFee = subtotal > 0 ? 30 : 0; // Flat single delivery fee for all stalls in this Khau Galli
  const taxes = Math.round(subtotal * 0.05 * 10) / 10;
  const total = Math.round((subtotal + deliveryFee + taxes) * 10) / 10;

  return {
    items,
    khauGalli,
    stallsCount: distinctStalls.size,
    totalItems,
    subtotal,
    deliveryFee,
    taxes,
    total,
  };
};

/**
 * @desc    Get current user's unified cart
 * @route   GET /api/cart
 */
export const getCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Valid Customer/User ID is required.",
      });
      return;
    }

    const data = await formatCartResponse(customerId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Get Cart Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch cart.",
    });
  }
};

/**
 * @desc    Add item to unified cart with strict single Khau Galli restriction
 * @route   POST /api/cart/add
 */
export const addToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const {
      stallId,
      itemId,
      name,
      price,
      image,
      stallName,
      vendorName,
      khauGalliId,
      khauGalliName,
      quantity = 1,
      replaceCart = false,
    } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Valid Customer/User ID is required.",
      });
      return;
    }

    if (!stallId) {
      res.status(400).json({
        success: false,
        message: "Valid Stall ID is required.",
      });
      return;
    }

    if (!itemId) {
      res.status(400).json({
        success: false,
        message: "Menu Item ID is required.",
      });
      return;
    }

    // 1. Resolve stall and its assigned Khau Galli (cluster_id)
    let incomingClusterId = khauGalliId || "";
    let incomingClusterName = khauGalliName || "Khau Galli";
    let resolvedStallName = stallName || vendorName || "Stall";

    if (stallId && mongoose.Types.ObjectId.isValid(stallId)) {
      const stall = await Stall.findById(stallId).populate("cluster_id");
      if (stall) {
        resolvedStallName = stall.name || resolvedStallName;
        const incomingCluster: any = stall.cluster_id;
        incomingClusterId = String(incomingCluster?._id || incomingCluster || incomingClusterId);
        incomingClusterName = incomingCluster?.name || incomingClusterName;
      }
    }

    const customerQuery: any = {
      $or: [
        { customer_id: String(customerId) },
        ...(mongoose.Types.ObjectId.isValid(customerId)
          ? [{ customer_id: new mongoose.Types.ObjectId(customerId) }]
          : []),
      ],
    };

    // 2. Fetch customer's single unified Cart document
    let cart = await Cart.findOne(customerQuery);

    if (cart && cart.items && cart.items.length > 0) {
      const currentClusterId = String(cart.cluster_id?._id || cart.cluster_id || "");
      const currentClusterName = cart.khau_galli_name || "Current Khau Galli";

      // 3. STRICT RULE ENFORCEMENT: Cannot mix stalls from different Khau Gallis
      if (incomingClusterId && currentClusterId && currentClusterId !== incomingClusterId) {
        if (!replaceCart) {
          // Return 409 Conflict so the UI can prompt the user
          res.status(409).json({
            success: false,
            code: "KHAU_GALLI_CONFLICT",
            message: `Your cart already contains food from ${currentClusterName}. A single order can only be placed from stalls in the same Khau Galli.`,
            currentKhauGalli: {
              id: currentClusterId,
              name: currentClusterName,
            },
            newKhauGalli: {
              id: incomingClusterId,
              name: incomingClusterName,
            },
          });
          return;
        }

        // User explicitly consented to discard and start a new cart for this Khau Galli
        cart.cluster_id = incomingClusterId;
        cart.khau_galli_name = incomingClusterName;
        cart.items = [];
      }
    }

    // If no cart exists yet for this customer, initialize a new single Cart document
    if (!cart) {
      cart = new Cart({
        customer_id: String(customerId),
        cluster_id: incomingClusterId,
        khau_galli_name: incomingClusterName,
        items: [],
      });
    }

    if (!cart.cluster_id && incomingClusterId) {
      cart.cluster_id = incomingClusterId;
      cart.khau_galli_name = incomingClusterName;
    }

    // 4. Look for the item in cart.items array
    const itemIndex = cart.items.findIndex(
      (i) => String(i.stall_id) === String(stallId) && String(i.item_id) === String(itemId)
    );

    const addQty = Number(quantity) || 1;

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += addQty;
      if (image) cart.items[itemIndex].image = image;
      if (name) cart.items[itemIndex].name = name;
      if (price) cart.items[itemIndex].price = Number(price);
    } else {
      cart.items.push({
        stall_id: stallId,
        stall_name: resolvedStallName,
        item_id: String(itemId),
        name: name || "Dish",
        price: Number(price) || 0,
        image: image || "",
        quantity: addQty,
      });
    }

    try {
      await cart.save();
    } catch (saveErr: any) {
      if (saveErr.code === 11000) {
        // E11000 duplicate key error, drop legacy index and merge into existing cart
        try {
          await mongoose.connection.collection("carts").dropIndex("customer_id_1_stall_id_1_item_id_1");
        } catch {}

        const existingCart = await Cart.findOne(customerQuery);
        if (existingCart) {
          if (!existingCart.cluster_id && incomingClusterId) {
            existingCart.cluster_id = incomingClusterId;
            existingCart.khau_galli_name = incomingClusterName;
          }
          const existIdx = existingCart.items.findIndex(
            (i) => String(i.stall_id) === String(stallId) && String(i.item_id) === String(itemId)
          );
          if (existIdx > -1) {
            existingCart.items[existIdx].quantity += addQty;
            if (price) existingCart.items[existIdx].price = Number(price);
            if (name) existingCart.items[existIdx].name = name;
          } else {
            existingCart.items.push({
              stall_id: stallId,
              stall_name: resolvedStallName,
              item_id: String(itemId),
              name: name || "Dish",
              price: Number(price) || 0,
              image: image || "",
              quantity: addQty,
            });
          }
          await existingCart.save();
        }
      } else {
        throw saveErr;
      }
    }

    // 5. Return freshly calculated cart
    const data = await formatCartResponse(customerId);
    res.status(200).json({
      success: true,
      message: "Item added to cart successfully.",
      data,
    });
  } catch (error: any) {
    console.error("Add To Cart Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to add item to cart.",
    });
  }
};

/**
 * @desc    Update quantity of an item in the unified cart
 * @route   PUT /api/cart/item
 */
export const updateCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { stallId, itemId, quantity } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Valid Customer/User ID is required.",
      });
      return;
    }

    if (!stallId || !itemId) {
      res.status(400).json({
        success: false,
        message: "Stall ID and Item ID are required.",
      });
      return;
    }

    const customerQuery: any = {
      $or: [
        { customer_id: String(customerId) },
        ...(mongoose.Types.ObjectId.isValid(customerId)
          ? [{ customer_id: new mongoose.Types.ObjectId(customerId) }]
          : []),
      ],
    };

    const cart = await Cart.findOne(customerQuery);
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (i) => String(i.stall_id) === String(stallId) && String(i.item_id) === String(itemId)
    );

    if (itemIndex > -1) {
      const newQty = Number(quantity);
      if (newQty <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = newQty;
      }

      if (cart.items.length === 0) {
        await Cart.deleteOne({ _id: cart._id });
      } else {
        await cart.save();
      }
    }

    const data = await formatCartResponse(customerId);
    res.status(200).json({
      success: true,
      message: "Cart item updated successfully.",
      data,
    });
  } catch (error: any) {
    console.error("Update Cart Item Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update cart item.",
    });
  }
};

/**
 * @desc    Remove an item from unified cart (or decrement by 1)
 * @route   DELETE /api/cart/item/:stallId/:itemId
 */
export const removeCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { stallId, itemId } = req.params;
    const { removeAll } = req.query;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Valid Customer/User ID is required.",
      });
      return;
    }

    if (!stallId || !itemId) {
      res.status(400).json({
        success: false,
        message: "Stall ID and Item ID are required.",
      });
      return;
    }

    const customerQuery: any = {
      $or: [
        { customer_id: String(customerId) },
        ...(mongoose.Types.ObjectId.isValid(customerId)
          ? [{ customer_id: new mongoose.Types.ObjectId(customerId) }]
          : []),
      ],
    };

    const cart = await Cart.findOne(customerQuery);
    if (cart) {
      const itemIndex = cart.items.findIndex(
        (i) => String(i.stall_id) === String(stallId) && String(i.item_id) === String(itemId)
      );

      if (itemIndex > -1) {
        if (removeAll === "true" || cart.items[itemIndex].quantity <= 1) {
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity -= 1;
        }

        if (cart.items.length === 0) {
          await Cart.deleteOne({ _id: cart._id });
        } else {
          await cart.save();
        }
      }
    }

    const data = await formatCartResponse(customerId);
    res.status(200).json({
      success: true,
      message: "Cart item removed.",
      data,
    });
  } catch (error: any) {
    console.error("Remove Cart Item Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to remove item from cart.",
    });
  }
};

/**
 * @desc    Clear entire cart for user
 * @route   DELETE /api/cart/clear
 */
export const clearCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Valid Customer/User ID is required.",
      });
      return;
    }

    const customerQuery: any = {
      $or: [
        { customer_id: String(customerId) },
        ...(mongoose.Types.ObjectId.isValid(customerId)
          ? [{ customer_id: new mongoose.Types.ObjectId(customerId) }]
          : []),
      ],
    };

    await Cart.deleteOne(customerQuery);
    res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
      data: {
        items: [],
        khauGalli: null,
        stallsCount: 0,
        totalItems: 0,
        subtotal: 0,
        deliveryFee: 0,
        taxes: 0,
        total: 0,
      },
    });
  } catch (error: any) {
    console.error("Clear Cart Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to clear cart.",
    });
  }
};
