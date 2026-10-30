import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.ts";
import { protectOptional } from "../middlewares/authMiddleware.ts";

const router = Router();

/**
 * @route   GET /api/cart
 * @desc    Get user's current multi-stall cart (populated with Khau Galli and stall details)
 */
router.get("/", protectOptional, getCart);

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart with single Khau Galli validation & conflict detection
 */
router.post("/add", protectOptional, addToCart);

/**
 * @route   PUT /api/cart/item
 * @desc    Update quantity of an item in cart
 */
router.put("/item", protectOptional, updateCartItem);

/**
 * @route   DELETE /api/cart/item/:stallId/:itemId
 * @desc    Remove or decrement an item from cart
 */
router.delete("/item/:stallId/:itemId", protectOptional, removeCartItem);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 */
router.delete("/clear", protectOptional, clearCart);

export default router;
