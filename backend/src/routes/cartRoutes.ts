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

router.get("/", protectOptional, getCart);
router.post("/add", protectOptional, addToCart);
router.put("/item", protectOptional, updateCartItem);
router.delete("/item/:stallId/:itemId", protectOptional, removeCartItem);
router.delete("/clear", protectOptional, clearCart);

export default router;
