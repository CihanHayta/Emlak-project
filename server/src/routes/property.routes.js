// server/src/routes/property.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as propertyController from "../controllers/property.controller.js";

export const propertyRouter = Router();
propertyRouter.use(authMiddleware, tenantMiddleware);

propertyRouter.get("/", authorize("properties:read"), propertyController.listPropertiesController);
propertyRouter.post("/", authorize("properties:write"), propertyController.createPropertyController);
propertyRouter.get("/:id", authorize("properties:read"), propertyController.getPropertyController);
propertyRouter.patch("/:id", authorize("properties:write"), propertyController.updatePropertyController);
propertyRouter.delete("/:id", authorize("properties:write"), propertyController.deletePropertyController);
