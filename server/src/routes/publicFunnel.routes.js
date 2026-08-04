// server/src/routes/publicFunnel.routes.js
//
// Kimlik doğrulaması YOK — Instagram reklamından/bio linkinden gelen
// ziyaretçi bu uç noktayı çağırır (bkz. src/pages/FunnelPage.jsx). Sadece
// status==="published" olan bir funnel döner (bkz. funnel.service.js).
import { Router } from "express";
import { getPublicFunnelController } from "../controllers/funnel.controller.js";

export const publicFunnelRouter = Router();
publicFunnelRouter.get("/:slug", getPublicFunnelController);
