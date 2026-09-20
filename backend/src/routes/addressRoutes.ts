import { Router } from "express";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController.ts";
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
 * @route   GET /api/addresses
 * @desc    Get all saved addresses for current customer
 */
router.get("/", optionalAuth, getAddresses);

/**
 * @route   POST /api/addresses
 * @desc    Create a new delivery address
 */
router.post("/", optionalAuth, createAddress);

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update an existing delivery address
 */
router.put("/:id", optionalAuth, updateAddress);

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete a delivery address
 */
router.delete("/:id", optionalAuth, deleteAddress);

export default router;
