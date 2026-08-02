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

/** Webhook'tan çağrılır: aynı kullanıcıyla zaten bir sohbet varsa onu döner, yoksa yenisini açar. */
export async function findOrCreateConversation(context, { channel, externalUserId, profile }) {
  const existing = await conversationRepository.findByExternalUser(context, channel, externalUserId);
  if (existing) return existing;

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
