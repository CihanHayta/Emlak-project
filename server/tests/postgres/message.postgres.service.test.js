// server/tests/postgres/message.postgres.service.test.js — tests/message.service.test.js ile paralel.
// SADECE kanal-bağımsız kısımlar test ediliyor (createInboundMessage, listMessages) —
// dispatchOutbound (Instagram/WhatsApp gönderimi) bu migrasyonun kapsamı dışında.
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createInboundMessage, listMessages } = await import("../../src/services/message.postgres.service.js");
const { findOrCreateConversation, getConversation } = await import("../../src/services/conversation.postgres.service.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const systemContext = { tenantId: "test-tenant", userId: null, role: null };

async function makeConversation(externalUserId = "ig-1") {
  return findOrCreateConversation(context, { channel: "instagram", externalUserId, fetchProfile: null });
}

describe("message.postgres.service — createInboundMessage", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

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

    const updated = await getConversation(context, conversation.id);
    expect(updated.unreadCount).toBe(2);
  });

  it("uzun mesaj metni önizlemede 120 karakterle kısaltılır", async () => {
    const conversation = await makeConversation();
    const longText = "a".repeat(200);
    await createInboundMessage(systemContext, conversation.id, { text: longText, attachments: [], senderId: "ig-1" });

    const updated = await getConversation(context, conversation.id);
    expect(updated.lastMessagePreview).toHaveLength(120);
  });
});

describe("message.postgres.service — listMessages sıralaması", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

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
