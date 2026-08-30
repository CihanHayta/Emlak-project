// server/src/routes/lead.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as leadController from "../controllers/lead.controller.js";

export const leadRouter = Router();
leadRouter.use(authMiddleware, tenantMiddleware);

leadRouter.get("/", authorize("leads:read"), leadController.listLeadsController);
leadRouter.patch("/:id/status", authorize("leads:write"), leadController.updateLeadStatusController);
leadRouter.delete("/:id", authorize("leads:write"), leadController.deleteLeadController);
