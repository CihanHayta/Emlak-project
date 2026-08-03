// server/src/services/message.service.js
import { messageRepository } from "../repositories/message.repository.js";
import { conversationRepository } from "../repositories/conversation.repository.js";
import { createDefaultMessage } from "../models/message.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getConversation } from "./conversation.service.js";
import { getTenantById } from "./tenant.service.js";
import { sendInstagramMessage } from "./instagram.service.js";
import { sendWhatsappMessage } from "./whatsapp.service.js";
import { decryptToken } from "../utils/crypto.util.js";
import { ApiError } from "../utils/ApiError.js";

export async function listMessages(context, conversationId) {
  const messages = await messageRepository.findByConversation(context, conversationId);
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Webhook'tan çağrılır (kimliksiz "system" context — bkz. webhook/instagram.webhook.js).
 * Mesajı kaydeder VE sohbetin özet alanlarını (son mesaj, okunmamış sayısı,
 * 24 saatlik pencere) günceller.
 */
export async function createInboundMessage(context, conversationId, { text, attachments, externalMessageId, senderId }) {
  const message = await messageRepository.create(
    context,
    createDefaultMessage({ conversationId, direction: "inbound", text, attachments, externalMessageId, senderId }),
  );

  const conversation = await getConversation(context, conversationId);
  const now = Date.now();
  await conversationRepository.update(
    context,
    conversationId,
    withUpdateFields({
      lastMessageAt: now,
      lastMessagePreview: (text || "").slice(0, 120),
      lastMessageDirection: "inbound",
      unreadCount: (conversation.unreadCount ?? 0) + 1,
      windowExpiresAt: now + 24 * 60 * 60 * 1000,
    }),
  );

  return message;
}

/** Kanal-bazlı gönderim dağıtımı — conversation/message modeli ve Mesajlar sayfası kanal-agnostik, buraya yeni bir `case` eklemek yeterli. */
async function dispatchOutbound(tenantId, channel, externalUserId, text) {
  switch (channel) {
    case "instagram": {
      const tenant = await getTenantById(tenantId);
      if (!tenant.instagram) throw ApiError.upstream("Bu ofis için Instagram hesabı bağlı değil.");
      return sendInstagramMessage(externalUserId, text, decryptToken(tenant.instagram.accessToken));
    }
    case "whatsapp": {
      const tenant = await getTenantById(tenantId);
      if (!tenant.whatsapp) throw ApiError.upstream("Bu ofis için WhatsApp hattı bağlı değil.");
      return sendWhatsappMessage(tenant.whatsapp.phoneNumberId, externalUserId, text, decryptToken(tenant.whatsapp.accessToken));
    }
    default:
      throw ApiError.validation(`Bilinmeyen kanal: ${channel}`);
  }
}

/** Admin panelden (agent/personel) bir sohbete cevap yazınca çağrılır. */
export async function sendOutboundMessage(context, conversationId, text) {
  const conversation = await getConversation(context, conversationId);

  if (conversation.windowExpiresAt && Date.now() > conversation.windowExpiresAt) {
    throw ApiError.forbidden(
      "24 saatlik mesajlaşma penceresi kapandı — kullanıcı tekrar yazana kadar bu sohbete mesaj gönderilemez (Meta'nın kuralı).",
    );
  }

  await dispatchOutbound(context.tenantId, conversation.channel, conversation.externalUserId, text);

  const message = await messageRepository.create(
    context,
    createDefaultMessage({ conversationId, direction: "outbound", text, senderId: context.userId }),
  );

  await conversationRepository.update(
    context,
    conversationId,
    withUpdateFields({
      lastMessageAt: Date.now(),
      lastMessagePreview: text.slice(0, 120),
      lastMessageDirection: "outbound",
    }),
  );

  return message;
}
