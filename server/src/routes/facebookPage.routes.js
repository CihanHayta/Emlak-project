// server/src/routes/facebookPage.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as facebookPageController from "../controllers/facebookPage.controller.js";

export const facebookPageRouter = Router();
facebookPageRouter.use(authMiddleware, tenantMiddleware, authorize("tenant:manage"));

facebookPageRouter.post("/connect-manual", facebookPageController.connectController);
facebookPageRouter.post("/disconnect", facebookPageController.disconnectController);
facebookPageRouter.get("/status", facebookPageController.statusController);
