import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.ts";
import { protectOptional } from "../middlewares/authMiddleware.ts";

const router = Router();

/**
 * @route   GET /api/favorites
 * @desc    Get all favorite food stalls for current user
 */
router.get("/", protectOptional, getFavorites);

/**
 * @route   POST /api/favorites or POST /api/favorites/:stallId
 * @desc    Add a food stall to favorites
 */
router.post("/", protectOptional, addFavorite);
router.post("/:stallId", protectOptional, addFavorite);

/**
 * @route   DELETE /api/favorites/:stallId or DELETE /api/favorites
 * @desc    Remove a food stall from favorites
 */
router.delete("/:stallId", protectOptional, removeFavorite);
router.delete("/", protectOptional, removeFavorite);

export default router;
