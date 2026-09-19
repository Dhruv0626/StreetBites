import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Middleware that tries JWT protect first, but allows request through if userId is provided in headers/body/query
const optionalAuth = (req: any, res: any, next: any) => {
  if (req.cookies?.accessToken || req.headers?.authorization) {
    return protect(req, res, next);
  }
  next();
};

/**
 * @route   GET /api/cart
 * @desc    Get user's current multi-stall cart (populated with Khau Galli and stall details)
 */
router.get("/", optionalAuth, getCart);

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart with single Khau Galli validation & conflict detection
 */
router.post("/add", optionalAuth, addToCart);

/**
 * @route   PUT /api/cart/item
 * @desc    Update quantity of an item in cart
 */
router.put("/item", optionalAuth, updateCartItem);

/**
 * @route   DELETE /api/cart/item/:stallId/:itemId
 * @desc    Remove or decrement an item from cart
 */
router.delete("/item/:stallId/:itemId", optionalAuth, removeCartItem);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 */
router.delete("/clear", optionalAuth, clearCart);

export default router;
