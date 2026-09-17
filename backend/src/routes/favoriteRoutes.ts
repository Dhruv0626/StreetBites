import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

// Middleware that tries JWT protect first, but allows request through if userId is provided in query/body
const optionalAuth = (req: any, res: any, next: any) => {
  if (req.cookies?.accessToken || req.headers?.authorization) {
    return protect(req, res, next);
  }
  next();
};

/**
 * @route   GET /api/favorites
 * @desc    Get all favorite food stalls for current user
 */
router.get("/", optionalAuth, getFavorites);

/**
 * @route   POST /api/favorites or POST /api/favorites/:stallId
 * @desc    Add a food stall to favorites
 */
router.post("/", optionalAuth, addFavorite);
router.post("/:stallId", optionalAuth, addFavorite);

/**
 * @route   DELETE /api/favorites/:stallId or DELETE /api/favorites
 * @desc    Remove a food stall from favorites
 */
router.delete("/:stallId", optionalAuth, removeFavorite);
router.delete("/", optionalAuth, removeFavorite);

export default router;
