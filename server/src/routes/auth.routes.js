// server/src/routes/auth.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";
import { createSessionController, getMeController, logoutController, registerTenantController } from "../controllers/auth.controller.js";

export const authRouter = Router();
authRouter.use(authRateLimit);

authRouter.post("/register-tenant", registerTenantController);
authRouter.post("/session", createSessionController);
authRouter.get("/me", authMiddleware, tenantMiddleware, getMeController);
authRouter.post("/logout", authMiddleware, logoutController);
