// server/src/routes/instagram.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as instagramController from "../controllers/instagram.controller.js";

export const instagramRouter = Router();

// oauth/start: owner/admin'in ofisi adına Instagram'a bağlanma isteği — kimlik doğrulaması şart.
instagramRouter.get(
  "/oauth/start",
  authMiddleware,
  tenantMiddleware,
  authorize("tenant:manage"),
  instagramController.startOauthController,
);

// oauth/callback: Meta'nın tarayıcıyı geri gönderdiği adres — auth middleware'siz,
// tenant kimliği imzalı `state`'ten çözülüyor (bkz. instagram.controller.js).
instagramRouter.get("/oauth/callback", instagramController.oauthCallbackController);

instagramRouter.post("/disconnect", authMiddleware, tenantMiddleware, authorize("tenant:manage"), instagramController.disconnectController);
instagramRouter.get("/status", authMiddleware, tenantMiddleware, authorize("tenant:manage"), instagramController.statusController);
