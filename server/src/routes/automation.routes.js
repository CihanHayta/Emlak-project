// server/src/routes/automation.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateAutomationSettingsValidator } from "../validators/automation.validator.js";
import * as automationController from "../controllers/automation.controller.js";

// "automations:*" bilerek sadece owner/admin'in taban izin kümesinde ("*")
// var — Funnel/Ayarlar'la aynı gerekçe: proaktif müşteri mesajlaşması
// açma/kapama ve WhatsApp şablon onayı işletme sahibinin kararı.
export const automationRouter = Router();
automationRouter.use(authMiddleware, tenantMiddleware, authorize("automations:write"));

automationRouter.get("/settings", automationController.getAutomationSettingsController);
automationRouter.patch("/settings", updateAutomationSettingsValidator, validate, automationController.updateAutomationSettingsController);
automationRouter.post("/templates/:type/submit", automationController.submitTemplateController);
automationRouter.get("/templates/:type/status", automationController.getTemplateStatusController);
automationRouter.get("/events", automationController.listAutomationEventsController);
automationRouter.post("/events/:id/mark-sent", automationController.markEventSentController);
