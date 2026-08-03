// server/src/services/conversation.service.js
import { conversationRepository } from "../repositories/conversation.repository.js";
import { createDefaultConversation } from "../models/conversation.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function listConversations(context) {
  return conversationRepository.findAll(context);
}

export async function getConversation(context, id) {
  const conversation = await conversationRepository.findById(context, id);
  if (!conversation) throw ApiError.notFound("Sohbet bulunamadı.");
  return conversation;
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
  return conversationRepository.create(
    context,
    createDefaultConversation({
      channel,
      externalUserId,
      participantName: profile?.name ?? null,
      participantUsername: profile?.username ?? null,
      participantAvatarUrl: profile?.profile_pic ?? null,
    }),
  );
}

export async function linkConversationToCustomer(context, id, customerId) {
  return conversationRepository.update(context, id, withUpdateFields({ customerId }, { actorUserId: context.userId }));
}

export async function markConversationRead(context, id) {
  return conversationRepository.update(context, id, withUpdateFields({ unreadCount: 0 }, { actorUserId: context.userId }));
}
