// server/src/routes/funnel.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as funnelController from "../controllers/funnel.controller.js";

// Kasıtlı olarak Danışman/Personel'in BASE_PERMISSIONS listesinde
// "funnels:*" yok (bkz. authorize.middleware.js) — kampanya sayfası
// oluşturma/yayınlama sadece owner'da (Ayarlar'la aynı mantık).
export const funnelRouter = Router();
funnelRouter.use(authMiddleware, tenantMiddleware);

funnelRouter.get("/", authorize("funnels:read"), funnelController.listFunnelsController);
funnelRouter.get("/:id", authorize("funnels:read"), funnelController.getFunnelController);
funnelRouter.post("/", authorize("funnels:write"), funnelController.createFunnelController);
funnelRouter.patch("/:id", authorize("funnels:write"), funnelController.updateFunnelController);
funnelRouter.delete("/:id", authorize("funnels:write"), funnelController.deleteFunnelController);
