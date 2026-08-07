// server/tests/conversation.service.test.js
import {
  findOrCreateConversation,
  getConversation,
  linkConversationToCustomer,
  markConversationRead,
  deleteConversation,
} from "../src/services/conversation.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("conversation.service — findOrCreateConversation", () => {
  beforeEach(() => resetMockFirestore());

  it("aynı externalUserId+channel için ikinci kez çağrılınca YENİ sohbet açmaz", async () => {
    const first = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-123", fetchProfile: null });
    const second = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-123", fetchProfile: null });
    expect(second.id).toBe(first.id);
  });

  it("farklı kanaldaki aynı externalUserId AYRI bir sohbet sayılır", async () => {
    const ig = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "same-id", fetchProfile: null });
    const wa = await findOrCreateConversation(context, { channel: "whatsapp", externalUserId: "same-id", fetchProfile: null });
    expect(wa.id).not.toBe(ig.id);
  });

  it("mevcut bir sohbet bulunca fetchProfile ÇAĞRILMAZ (performans için)", async () => {
    await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-1", fetchProfile: null });
    let called = false;
    await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-1",
      fetchProfile: async () => {
        called = true;
        return { name: "x" };
      },
    });
    expect(called).toBe(false);
  });

  it("gerçekten yeni bir sohbette fetchProfile çağrılır ve sonucu kaydedilir", async () => {
    const conversation = await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-2",
      fetchProfile: async () => ({ name: "Ayşe", username: "ayse123", profile_pic: "http://x/y.jpg" }),
    });
    expect(conversation.participantName).toBe("Ayşe");
    expect(conversation.participantUsername).toBe("ayse123");
  });

  it("silinen (soft-delete) bir sohbetten sonra tekrar yazılırsa YENİ bir sohbet açılır", async () => {
    const first = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-3", fetchProfile: null });
    await deleteConversation(context, first.id);
    const second = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-3", fetchProfile: null });
    expect(second.id).not.toBe(first.id);
  });
});

describe("conversation.service — diğer işlemler", () => {
  beforeEach(() => resetMockFirestore());

  it("olmayan bir sohbeti getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getConversation(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("bir müşteriye bağlama customerId'yi günceller", async () => {
    const conversation = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-4", fetchProfile: null });
    const linked = await linkConversationToCustomer(context, conversation.id, "customer-1");
    expect(linked.customerId).toBe("customer-1");
  });

  it("okundu işaretleme unreadCount'u sıfırlar", async () => {
    const conversation = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-5", fetchProfile: null });
    const marked = await markConversationRead(context, conversation.id);
    expect(marked.unreadCount).toBe(0);
  });
});
