// server/src/services/message.postgres.service.js
// message.service.js'in (Firestore) PostgreSQL karşılığı.
//
// *** BİLEREK HÂLÂ FIREBASE'E BAĞLI OLAN KISIM ***: `getTenantById`
// (tenant.service.js) VE `sendInstagramMessage`/`sendWhatsappMessage`
// (instagram/whatsapp.service.js) BİLEREK DEĞİŞTİRİLMEDİ — bunlar Meta'nın
// GERÇEK API'sine giden dış entegrasyon çağrıları, bu migrasyonun kapsamı
// (Firestore/Storage → Postgres/R2 KALICILIK katmanı) DIŞINDA. tenant.service.js
// kendisi de henüz Postgres'e geçmedi (tenants iş verisi, ayrı bir adım —
// bkz. Aşama 3 raporu). `decryptToken` zaten Firebase'e bağımlı değil
// (crypto.util.js, saf Node crypto).
import { messagePostgresRepository } from "../repositories/message.postgres.repository.js";
import { conversationPostgresRepository } from "../repositories/conversation.postgres.repository.js";
import { createDefaultMessage } from "../models/message.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getConversation } from "./conversation.postgres.service.js";
import { getTenantById } from "./tenant.service.js";
import { sendInstagramMessage } from "./instagram.service.js";
import { sendWhatsappMessage } from "./whatsapp.service.js";
import { decryptToken } from "../utils/crypto.util.js";
import { ApiError } from "../utils/ApiError.js";

// Postgres'te created_at HER ZAMAN gerçek bir Date nesnesi olarak döner
// (pg driver'ın timestamptz→Date dönüşümü) — Firestore Timestamp'in
// `.toMillis()` özel durumuna burada hiç gerek yok, ama message.service.js
// ile aynı fonksiyon adını/şeklini koruyoruz (davranış paralelliği kolay
// karşılaştırılsın diye).
function toMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

export async function listMessages(context, conversationId) {
  const messages = await messagePostgresRepository.findByConversation(context, conversationId);
  return messages.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
}

export async function createInboundMessage(context, conversationId, { text, attachments, externalMessageId, senderId }) {
  const message = await messagePostgresRepository.create(
    context,
    createDefaultMessage({ conversationId, direction: "inbound", text, attachments, externalMessageId, senderId }),
  );

  const conversation = await getConversation(context, conversationId);
  const now = Date.now();
  await conversationPostgresRepository.update(
    context,
    conversationId,
    withUpdateFields({
      lastMessageAt: now,
      lastMessagePreview: (text || "").slice(0, 120),
      lastMessageDirection: "inbound",
      unreadCount: (conversation.unreadCount ?? 0) + 1,
      windowExpiresAt: now + 24 * 60 * 60 * 1000,
      windowAlertSentAt: null,
    }),
  );

  return message;
}

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

export async function sendOutboundMessage(context, conversationId, text) {
  const conversation = await getConversation(context, conversationId);

  if (conversation.windowExpiresAt && Date.now() > conversation.windowExpiresAt) {
    throw ApiError.forbidden(
      "24 saatlik mesajlaşma penceresi kapandı — kullanıcı tekrar yazana kadar bu sohbete mesaj gönderilemez (Meta'nın kuralı).",
    );
  }

  await dispatchOutbound(context.tenantId, conversation.channel, conversation.externalUserId, text);

  const message = await messagePostgresRepository.create(
    context,
    createDefaultMessage({ conversationId, direction: "outbound", text, senderId: context.userId }),
  );

  await conversationPostgresRepository.update(
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
