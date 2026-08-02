// server/src/repositories/message.repository.js
import { BaseRepository } from "./base.repository.js";

class MessageRepository extends BaseRepository {
  constructor() {
    super("messages");
  }

  async findByConversation(context, conversationId) {
    const query = await this.scopedQuery(context);
    const snapshot = await query.where("conversationId", "==", conversationId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

export const messageRepository = new MessageRepository();
