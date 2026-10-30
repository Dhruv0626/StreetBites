import { Router } from "express";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController.ts";
import { protect } from "../middlewares/authMiddleware.ts";

const router = Router();

/**
 * @route   GET /api/addresses
 * @desc    Get all saved addresses for current customer (IDOR protected)
 */
router.get("/", protect, getAddresses);

/**
 * @route   POST /api/addresses
 * @desc    Create a new delivery address
 */
router.post("/", protect, createAddress);

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update an existing delivery address
 */
router.put("/:id", protect, updateAddress);

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete a delivery address
 */
router.delete("/:id", protect, deleteAddress);

export default router;
