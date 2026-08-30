// server/src/routes/propertyMedia.routes.js — vehicleMedia.routes.js ile birebir aynı desen.
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createUploadIntentValidator,
  confirmUploadValidator,
  reorderMediaValidator,
  setCoverMediaValidator,
} from "../validators/media.validator.js";
import * as mediaController from "../controllers/propertyMedia.controller.js";

export const propertyMediaRouter = Router();
propertyMediaRouter.use(authMiddleware, tenantMiddleware);

propertyMediaRouter.get("/:propertyId/media", authorize("properties:read"), mediaController.listPropertyMediaController);
propertyMediaRouter.post(
  "/:propertyId/media/upload-intent",
  authorize("uploads:write"),
  createUploadIntentValidator,
  validate,
  mediaController.createUploadIntentController,
);
propertyMediaRouter.post(
  "/:propertyId/media/confirm",
  authorize("uploads:write"),
  confirmUploadValidator,
  validate,
  mediaController.confirmUploadController,
);
propertyMediaRouter.post(
  "/:propertyId/media/cover",
  authorize("uploads:write"),
  setCoverMediaValidator,
  validate,
  mediaController.setCoverController,
);
propertyMediaRouter.post(
  "/:propertyId/media/reorder",
  authorize("uploads:write"),
  reorderMediaValidator,
  validate,
  mediaController.reorderController,
);
propertyMediaRouter.delete("/:propertyId/media/:mediaId", authorize("uploads:write"), mediaController.deleteMediaController);
