// server/src/services/conversation.postgres.service.js
// conversation.service.js'in (Firestore) PostgreSQL karşılığı — profil
// resmi mirror'lama mantığı BİREBİR aynı, storage hedefi property.postgres.service.js
// ile TUTARLI şekilde db/storage.client.js'e (R2/mock) taşındı. Instagram/
// WhatsApp webhook'larının KENDİSİ bu dosyanın kapsamı dışında — burası
// sadece conversation KALICILIĞINI (persistence) Postgres'e taşıyor.
import { randomUUID } from "node:crypto";
import { conversationPostgresRepository } from "../repositories/conversation.postgres.repository.js";
import { createDefaultConversation } from "../models/conversation.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../db/storage.client.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export async function listConversations(context) {
  return conversationPostgresRepository.findAll(context);
}

export async function getConversation(context, id) {
  const conversation = await conversationPostgresRepository.findById(context, id);
  if (!conversation) throw ApiError.notFound("Sohbet bulunamadı.");
  return conversation;
}

async function mirrorAvatarToOwnStorage(tenantId, avatarUrl) {
  if (!avatarUrl) return null;
  try {
    const response = await fetch(avatarUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : "jpg";
    const objectKey = `avatars/${randomUUID()}.${extension}`;
    const storage = await getStorageClient();
    const result = await storage.upload(buffer, objectKey, { contentType });
    return result.url;
  } catch (error) {
    logger.warn(`Profil resmi indirilemedi/kaydedilemedi (tenant=${tenantId}): ${error.message}`);
    return null;
  }
}

export async function findOrCreateConversation(context, { channel, externalUserId, fetchProfile }) {
  const existing = await conversationPostgresRepository.findByExternalUser(context, channel, externalUserId);
  if (existing) return existing;

  const profile = fetchProfile ? await fetchProfile() : null;
  const avatarUrl = await mirrorAvatarToOwnStorage(context.tenantId, profile?.profile_pic);
  return conversationPostgresRepository.create(
    context,
    createDefaultConversation({
      channel,
      externalUserId,
      participantName: profile?.name ?? null,
      participantUsername: profile?.username ?? null,
      participantAvatarUrl: avatarUrl,
    }),
  );
}

export async function linkConversationToCustomer(context, id, customerId) {
  return conversationPostgresRepository.update(context, id, withUpdateFields({ customerId }, { actorUserId: context.userId }));
}

export async function markConversationRead(context, id) {
  return conversationPostgresRepository.update(context, id, withUpdateFields({ unreadCount: 0 }, { actorUserId: context.userId }));
}

export async function deleteConversation(context, id) {
  await conversationPostgresRepository.softDelete(context, id);
}
