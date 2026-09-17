import { Router } from "express";
import {
  getClusters,
  getClusterById,
  createCluster,
  updateCluster,
  deleteCluster,
} from "../controllers/clusterController.ts";

const router = Router();

router.get("/", getClusters);
router.get("/:id", getClusterById);
router.post("/", createCluster);
router.put("/:id", updateCluster);
router.delete("/:id", deleteCluster);

export default router;
