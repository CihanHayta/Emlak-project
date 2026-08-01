// server/src/routes/customer.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as customerController from "../controllers/customer.controller.js";

export const customerRouter = Router();
customerRouter.use(authMiddleware, tenantMiddleware);

customerRouter.get("/", authorize("customers:read"), customerController.listCustomersController);
customerRouter.post("/", authorize("customers:write"), customerController.createCustomerController);
customerRouter.get("/:id", authorize("customers:read"), customerController.getCustomerController);
customerRouter.patch("/:id", authorize("customers:write"), customerController.updateCustomerController);
customerRouter.post("/:id/timeline", authorize("customers:write"), customerController.addTimelineEntryController);
customerRouter.delete("/:id", authorize("customers:write"), customerController.deleteCustomerController);
