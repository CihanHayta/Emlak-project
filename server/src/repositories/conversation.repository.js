// server/src/repositories/conversation.repository.js
import { BaseRepository } from "./base.repository.js";

class ConversationRepository extends BaseRepository {
  constructor() {
    super("conversations");
  }

  /** Webhook'tan gelen her olayda "bu Instagram kullanıcısıyla zaten bir sohbetimiz var mı" kontrolü için. */
  async findByExternalUser(context, channel, externalUserId) {
    const query = await this.scopedQuery(context);
    const snapshot = await query
      .where("channel", "==", channel)
      .where("externalUserId", "==", externalUserId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

export const conversationRepository = new ConversationRepository();
