// server/src/controllers/automation.controller.js
import { getTenantAutomations, setTenantAutomations } from "../services/tenant.service.js";
import { submitWhatsappTemplate, refreshTemplateStatus, listAutomationEvents, markAutomationEventSent } from "../services/automation.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const VALID_TYPES = new Set(["listingMatch", "appointmentReminder", "newLeadWelcome"]);

function assertValidType(type) {
  if (!VALID_TYPES.has(type)) throw ApiError.validation(`Bilinmeyen otomasyon türü: ${type}`);
}

export async function getAutomationSettingsController(req, res) {
  const automations = await getTenantAutomations(req.context.tenantId);
  sendSuccess(res, { data: automations });
}

export async function updateAutomationSettingsController(req, res) {
  const automations = await setTenantAutomations(req.context.tenantId, req.body);
  sendSuccess(res, { data: automations });
}

export async function submitTemplateController(req, res) {
  assertValidType(req.params.type);
  const automations = await submitWhatsappTemplate(req.context, req.params.type);
  sendSuccess(res, { data: automations, status: 201 });
}

export async function getTemplateStatusController(req, res) {
  assertValidType(req.params.type);
  const automations = await refreshTemplateStatus(req.context, req.params.type);
  sendSuccess(res, { data: automations });
}

export async function listAutomationEventsController(req, res) {
  const events = await listAutomationEvents(req.context);
  sendSuccess(res, { data: events });
}

export async function markEventSentController(req, res) {
  const event = await markAutomationEventSent(req.context, req.params.id);
  sendSuccess(res, { data: event });
}
