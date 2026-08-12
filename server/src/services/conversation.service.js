// server/src/services/conversation.service.js
import { randomUUID } from "node:crypto";
import { conversationRepository } from "../repositories/conversation.repository.js";
import { createDefaultConversation } from "../models/conversation.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../firebase/storage.client.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export async function listConversations(context) {
  return conversationRepository.findAll(context);
}

export async function getConversation(context, id) {
  const conversation = await conversationRepository.findById(context, id);
  if (!conversation) throw ApiError.notFound("Sohbet bulunamadı.");
  return conversation;
}

/**
 * Instagram/WhatsApp'ın kendi CDN'indeki profil resmi URL'leri (ör.
 * `profile_pic`) genelde KISA ÖMÜRLÜ ve/veya tarayıcıdan doğrudan
 * `<img>` ile hotlink edilmeye karşı korumalı — bu yüzden panelde
 * "Instagram resimleri görünmüyor" sorununa yol açıyordu (canlıda
 * doğrulandı, 2026-08-09). Çözüm property/vehicle fotoğraflarındaki AYNI
 * desen: sunucu tarafında bir kere indirip KENDİ Storage'ımıza (tenant'a
 * özel, süresiz) kaydediyoruz, `participantAvatarUrl` olarak o zaman
 * kendi URL'imizi tutuyoruz. İndirme/yükleme başarısız olursa (ör. URL
 * zaten dolmuş) sessizce null'a düşer — sohbet avatarsız açılır, akış
 * durmaz.
 */
async function mirrorAvatarToOwnStorage(tenantId, avatarUrl) {
  if (!avatarUrl) return null;
  try {
    const response = await fetch(avatarUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : "jpg";
    const storagePath = `tenants/${tenantId}/avatars/${randomUUID()}.${extension}`;
    const storage = await getStorageClient(tenantId);
    const result = await storage.upload(buffer, storagePath, { contentType });
    return result.url;
  } catch (error) {
    logger.warn(`Profil resmi indirilemedi/kaydedilemedi (tenant=${tenantId}): ${error.message}`);
    return null;
  }
}

/**
 * Webhook'tan çağrılır: aynı kullanıcıyla zaten bir sohbet varsa onu döner,
 * yoksa yenisini açar. `fetchProfile` bir callback — SADECE gerçekten yeni
 * bir sohbet açılırken çağrılır (mevcut olanı bulunca hiç çağrılmaz). Bu
 * bilerek böyle: profil bilgisini önceden (çağıran tarafta) çekmek, devam
 * eden her sohbetteki HER mesajda gereksiz bir Meta API turu ekliyordu —
 * webhook'un Firestore'a yazması o kadar gecikiyordu (canlıda teşhis edildi,
 * "gelen mesaj yavaş" şikayetinin asıl sebebiydi).
 */
export async function findOrCreateConversation(context, { channel, externalUserId, fetchProfile }) {
  const existing = await conversationRepository.findByExternalUser(context, channel, externalUserId);
  if (existing) return existing;

  const profile = fetchProfile ? await fetchProfile() : null;
  const avatarUrl = await mirrorAvatarToOwnStorage(context.tenantId, profile?.profile_pic);
  return conversationRepository.create(
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
  return conversationRepository.update(context, id, withUpdateFields({ customerId }, { actorUserId: context.userId }));
}

export async function markConversationRead(context, id) {
  return conversationRepository.update(context, id, withUpdateFields({ unreadCount: 0 }, { actorUserId: context.userId }));
}

/**
 * Yumuşak silme — diğer koleksiyonlarla (customers, leads, ...) aynı geri
 * getirilebilir desen. Mesajlar ayrıca silinmiyor (zararsız, hiçbir yerde
 * gösterilmiyor); aynı kişi tekrar yazarsa `findByExternalUser` bu kaydı
 * (deletedAt dolu olduğu için) bulamaz ve sıfırdan yeni bir sohbet açılır.
 */
export async function deleteConversation(context, id) {
  await conversationRepository.softDelete(context, id);
}
