// server/src/routes/tenantSettings.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as tenantSettingsController from "../controllers/tenantSettings.controller.js";

export const tenantSettingsRouter = Router();
// "tenant:manage" sadece owner/admin'in taban izin kümesinde ("*") var —
// bkz. facebookPage.routes.js'in aynı kapısı.
tenantSettingsRouter.use(authMiddleware, tenantMiddleware, authorize("tenant:manage"));

tenantSettingsRouter.get("/role-permissions", tenantSettingsController.getRolePermissionsController);
tenantSettingsRouter.patch("/role-permissions", tenantSettingsController.updateRolePermissionsController);
