// server/src/routes/whatsapp.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as whatsappController from "../controllers/whatsapp.controller.js";

export const whatsappRouter = Router();
whatsappRouter.use(authMiddleware, tenantMiddleware, authorize("tenant:manage"));

whatsappRouter.post("/connect", whatsappController.connectController);
whatsappRouter.post("/disconnect", whatsappController.disconnectController);
whatsappRouter.get("/status", whatsappController.statusController);
