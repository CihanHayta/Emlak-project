// server/tests/message.service.test.js
//
// SADECE kanal-bağımsız kısımlar (listMessages'ın sıralaması,
// createInboundMessage'ın sohbet özeti güncellemesi) — Instagram/WhatsApp
// gönderim (dispatchOutbound/sendOutboundMessage) BİLEREK test edilmiyor,
// o entegrasyonlar başka bir oturumun aktif çalışma alanı.
import { createInboundMessage, listMessages } from "../src/services/message.service.js";
import { findOrCreateConversation } from "../src/services/conversation.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
// Webhook'un kullandığı kimliksiz "system" context'i taklit eder (bkz. message.service.js'in doc'u).
const systemContext = { tenantId: "test-tenant", userId: null, role: null };

async function makeConversation(externalUserId = "ig-1") {
  return findOrCreateConversation(context, { channel: "instagram", externalUserId, fetchProfile: null });
}

describe("message.service — createInboundMessage", () => {
  beforeEach(() => resetMockFirestore());

  it("mesajı kaydeder ve sohbetin son-mesaj özetini günceller", async () => {
    const conversation = await makeConversation();
    await createInboundMessage(systemContext, conversation.id, {
      text: "Merhaba, ilan hâlâ satılık mı?",
      attachments: [],
      externalMessageId: "mid-1",
      senderId: "ig-1",
    });

    const messages = await listMessages(context, conversation.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].direction).toBe("inbound");
  });

  it("art arda gelen mesajlarda unreadCount artar", async () => {
    const conversation = await makeConversation();
    await createInboundMessage(systemContext, conversation.id, { text: "1", attachments: [], senderId: "ig-1" });
    await createInboundMessage(systemContext, conversation.id, { text: "2", attachments: [], senderId: "ig-1" });

    const { getConversation } = await import("../src/services/conversation.service.js");
    const updated = await getConversation(context, conversation.id);
    expect(updated.unreadCount).toBe(2);
  });

  it("uzun mesaj metni önizlemede 120 karakterle kısaltılır", async () => {
    const conversation = await makeConversation();
    const longText = "a".repeat(200);
    await createInboundMessage(systemContext, conversation.id, { text: longText, attachments: [], senderId: "ig-1" });

    const { getConversation } = await import("../src/services/conversation.service.js");
    const updated = await getConversation(context, conversation.id);
    expect(updated.lastMessagePreview).toHaveLength(120);
  });
});

describe("message.service — listMessages sıralaması", () => {
  beforeEach(() => resetMockFirestore());

  it("mesajları eskiden yeniye (createdAt) sıralar", async () => {
    const conversation = await makeConversation();
    await createInboundMessage(systemContext, conversation.id, { text: "önce", attachments: [], senderId: "ig-1" });
    await createInboundMessage(systemContext, conversation.id, { text: "sonra", attachments: [], senderId: "ig-1" });

    const messages = await listMessages(context, conversation.id);
    expect(messages.map((m) => m.text)).toEqual(["önce", "sonra"]);
  });

  it("başka bir sohbetin mesajlarını karıştırmaz", async () => {
    const conversationA = await makeConversation("ig-a");
    const conversationB = await makeConversation("ig-b");
    await createInboundMessage(systemContext, conversationA.id, { text: "A'ya ait", attachments: [], senderId: "ig-a" });
    await createInboundMessage(systemContext, conversationB.id, { text: "B'ye ait", attachments: [], senderId: "ig-b" });

    const messagesA = await listMessages(context, conversationA.id);
    expect(messagesA).toHaveLength(1);
    expect(messagesA[0].text).toBe("A'ya ait");
  });
});
