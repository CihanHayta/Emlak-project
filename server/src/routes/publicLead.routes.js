// server/src/routes/publicLead.routes.js
//
// Kimlik doğrulaması YOK — public site'ın "Hayalinizdeki Evler İçin..."
// formu, hizmet talebi popup'ı ve İletişim formu buraya POST atar. Hangi
// tenant'a ait olduğunu bilmenin tek yolu (henüz alan adı->tenant eşlemesi
// kurulmadığı için) body'deki `tenantId` — frontend bunu build-time bir env
// değişkeninden (VITE_TENANT_ID) okuyup gönderir.
//
// app.js'teki global rate limit (300/15dk) zaten tüm /api/v1 altını
// kapsıyor; bu route'a özel ek bir sınır şimdilik yok.
import { Router } from "express";
import { createPublicLeadController } from "../controllers/lead.controller.js";

export const publicLeadRouter = Router();
publicLeadRouter.post("/", createPublicLeadController);
