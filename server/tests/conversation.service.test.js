// server/tests/conversation.service.test.js
import { jest } from "@jest/globals";
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

describe("conversation.service — profil resmi kendi Storage'ımıza indiriliyor (2026-08-09 fix)", () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockFirestore();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("profile_pic başarıyla indirilirse Instagram'ın URL'i DEĞİL, kendi Storage URL'imiz kaydedilir", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new TextEncoder().encode("sahte-resim-verisi").buffer,
    });

    const conversation = await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-avatar-1",
      fetchProfile: async () => ({ name: "Ayşe", username: "ayse123", profile_pic: "https://scontent.cdninstagram.com/foto.jpg" }),
    });

    expect(conversation.participantAvatarUrl).not.toBe("https://scontent.cdninstagram.com/foto.jpg");
    expect(conversation.participantAvatarUrl).toContain("mock-uploads/tenants/test-tenant/avatars/");
  });

  it("indirme başarısız olursa (ör. URL süresi dolmuş) sohbet YİNE DE oluşur, avatar sadece null olur", async () => {
    fetchSpy.mockResolvedValue({ ok: false });

    const conversation = await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-avatar-2",
      fetchProfile: async () => ({ name: "Mehmet", username: "mehmet1", profile_pic: "https://scontent.cdninstagram.com/dolmus.jpg" }),
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.participantName).toBe("Mehmet");
    expect(conversation.participantAvatarUrl).toBeNull();
  });

  it("ağ hatası (fetch reddi) fırlatsa bile sohbet oluşturma çökmüyor", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));

    const conversation = await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-avatar-3",
      fetchProfile: async () => ({ name: "Zeynep", username: "zeynep1", profile_pic: "https://scontent.cdninstagram.com/x.jpg" }),
    });

    expect(conversation.participantAvatarUrl).toBeNull();
  });

  it("profile_pic hiç yoksa fetch hiç çağrılmaz", async () => {
    await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-avatar-4",
      fetchProfile: async () => ({ name: "Ali", username: "ali1", profile_pic: null }),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
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
