// server/tests/postgres/conversation.postgres.service.test.js — tests/conversation.service.test.js ile paralel.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { findOrCreateConversation, getConversation, linkConversationToCustomer, markConversationRead, deleteConversation } =
  await import("../../src/services/conversation.postgres.service.js");
const { customerPostgresRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("conversation.postgres.service — findOrCreateConversation", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

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

  it("silinen (soft-delete) bir sohbetten sonra tekrar yazılırsa YENİ bir sohbet açılır", async () => {
    const first = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-3", fetchProfile: null });
    await deleteConversation(context, first.id);
    const second = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-3", fetchProfile: null });
    expect(second.id).not.toBe(first.id);
  });
});

describe("conversation.postgres.service — profil resmi R2 mock'a indiriliyor", () => {
  let fetchSpy;

  beforeAll(() => getTestPool());
  beforeEach(() => {
    truncateAll();
    fetchSpy = jest.spyOn(global, "fetch");
  });
  afterEach(() => fetchSpy.mockRestore());
  afterAll(() => closeTestPool());

  it("profile_pic başarıyla indirilirse Instagram'ın URL'i DEĞİL, kendi R2 (mock) URL'imiz kaydedilir", async () => {
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
    expect(conversation.participantAvatarUrl).toContain("mock-r2/avatars/");
  });

  it("indirme başarısız olursa sohbet YİNE DE oluşur, avatar sadece null olur", async () => {
    fetchSpy.mockResolvedValue({ ok: false });

    const conversation = await findOrCreateConversation(context, {
      channel: "instagram",
      externalUserId: "ig-avatar-2",
      fetchProfile: async () => ({ name: "Mehmet", username: "mehmet1", profile_pic: "https://scontent.cdninstagram.com/dolmus.jpg" }),
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.participantAvatarUrl).toBeNull();
  });
});

describe("conversation.postgres.service — diğer işlemler", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("olmayan bir sohbeti getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getConversation(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("bir müşteriye bağlama customerId'yi günceller", async () => {
    // conversations.customer_id artık gerçek bir FOREIGN KEY (Firestore'da yoktu).
    const customer = await customerPostgresRepository.create(context, createDefaultCustomer({ name: "Ayşe", phone: "0555" }));
    const conversation = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-4", fetchProfile: null });
    const linked = await linkConversationToCustomer(context, conversation.id, customer.id);
    expect(linked.customerId).toBe(customer.id);
  });

  it("okundu işaretleme unreadCount'u sıfırlar", async () => {
    const conversation = await findOrCreateConversation(context, { channel: "instagram", externalUserId: "ig-5", fetchProfile: null });
    const marked = await markConversationRead(context, conversation.id);
    expect(marked.unreadCount).toBe(0);
  });
});
