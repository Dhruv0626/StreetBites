import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.ts";
import { protectOptional } from "../middlewares/authMiddleware.ts";

const router = Router();

router.get("/", protectOptional, getFavorites);
router.post("/", protectOptional, addFavorite);
router.post("/:stallId", protectOptional, addFavorite);
router.delete("/:stallId", protectOptional, removeFavorite);
router.delete("/", protectOptional, removeFavorite);

export default router;
