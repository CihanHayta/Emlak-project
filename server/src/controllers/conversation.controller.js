// server/src/controllers/conversation.controller.js
import * as conversationService from "../services/conversation.service.js";
import * as messageService from "../services/message.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export async function listConversationsController(req, res) {
  const conversations = await conversationService.listConversations(req.context);
  sendSuccess(res, { data: conversations });
}

export async function getConversationController(req, res) {
  const conversation = await conversationService.getConversation(req.context, req.params.id);
  sendSuccess(res, { data: conversation });
}

export async function linkConversationCustomerController(req, res) {
  const { customerId } = req.body;
  if (!customerId) throw ApiError.validation("customerId zorunlu.");
  const conversation = await conversationService.linkConversationToCustomer(req.context, req.params.id, customerId);
  sendSuccess(res, { data: conversation });
}

export async function markConversationReadController(req, res) {
  const conversation = await conversationService.markConversationRead(req.context, req.params.id);
  sendSuccess(res, { data: conversation });
}

export async function deleteConversationController(req, res) {
  await conversationService.deleteConversation(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}

export async function listMessagesController(req, res) {
  const messages = await messageService.listMessages(req.context, req.params.conversationId);
  sendSuccess(res, { data: messages });
}

export async function sendMessageController(req, res) {
  const { text } = req.body;
  if (!text || !text.trim()) throw ApiError.validation("Mesaj metni zorunlu.");
  const message = await messageService.sendOutboundMessage(req.context, req.params.conversationId, text.trim());
  sendSuccess(res, { data: message, status: 201 });
}
