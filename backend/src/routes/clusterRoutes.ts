import { Router } from "express";
import {
  getClusters,
  getClusterById,
  createCluster,
  updateCluster,
  deleteCluster,
} from "../controllers/clusterController.ts";
import { protect, authorize } from "../middlewares/authMiddleware.ts";

const router = Router();

// Public cluster discovery endpoints
router.get("/", getClusters);
router.get("/:id", getClusterById);

// Admin-only cluster management endpoints
router.post("/", protect, authorize("ADMIN"), createCluster);
router.put("/:id", protect, authorize("ADMIN"), updateCluster);
router.delete("/:id", protect, authorize("ADMIN"), deleteCluster);

export default router;
