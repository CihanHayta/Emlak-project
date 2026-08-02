// server/src/services/message.service.js
import { messageRepository } from "../repositories/message.repository.js";
import { conversationRepository } from "../repositories/conversation.repository.js";
import { createDefaultMessage } from "../models/message.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getConversation } from "./conversation.service.js";
import { sendInstagramMessage } from "./instagram.service.js";
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

/**
 * Kanal-bazlı gönderim dağıtımı — bugün sadece "instagram" gerçekten
 * bağlı. WhatsApp Business API entegrasyonu eklenince buraya sadece bir
 * `case "whatsapp":` eklenecek, ne conversation/message modeli ne de
 * frontend'in Mesajlar sayfası değişmesi gerekecek (ikisi de zaten
 * kanal-agnostik tasarlandı).
 */
async function dispatchOutbound(channel, externalUserId, text) {
  switch (channel) {
    case "instagram":
      return sendInstagramMessage(externalUserId, text);
    case "whatsapp":
      throw ApiError.upstream("WhatsApp entegrasyonu henüz bağlanmadı.");
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

  await dispatchOutbound(conversation.channel, conversation.externalUserId, text);

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
