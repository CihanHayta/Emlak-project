// server/tests/postgres/automation.postgres.test.js — tests/automation.service.test.js'in
// AŞAMA 11 karşılığı. automation.service.js artık customers/leads/conversations/
// automation_events için Postgres repository'lerini kullanıyor (bkz. o
// dosyanın kendi yorumu) — bu yüzden orijinal test artık npm test'te
// (Firestore mock) çalışamıyor, buraya taşındı.
//
// AŞAMA (File Store kaldırma): tenant fixture'ları da artık Postgres
// (tenant.postgres.repository.js) — tenants domain'i Firestore'dan taşındı,
// tenant config + iş verisi (customers/leads/conversations) hepsi Postgres'te.
import { jest } from "@jest/globals";
import dayjs from "dayjs";
import { toIstanbul } from "../../src/utils/date.js"; // side effect: dayjs utc/timezone eklentilerini kaydeder
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");
const { createDefaultConversation } = await import("../../src/models/conversation.model.js");
const { createDefaultLead } = await import("../../src/models/lead.model.js");
const { encryptToken } = await import("../../src/utils/crypto.util.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { customerPostgresRepository: customerRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { conversationPostgresRepository: conversationRepository } = await import("../../src/repositories/conversation.postgres.repository.js");
const { automationEventPostgresRepository: automationEventRepository } = await import(
  "../../src/repositories/automationEvent.postgres.repository.js"
);
const { leadPostgresRepository: leadRepository } = await import("../../src/repositories/lead.postgres.repository.js");
const { propertyPostgresRepository } = await import("../../src/repositories/property.postgres.repository.js");
const {
  notifyMatchingCustomersForListing,
  checkOffHoursAndReply,
  submitWhatsappTemplate,
  checkClosingWindows,
  notifyNewLead,
  checkLeadResponseAlerts,
} = await import("../../src/services/automation.service.js");

void toIstanbul;

const FAKE_WHATSAPP = { phoneNumberId: "pn-1", wabaId: "waba-1", accessToken: encryptToken("fake-access-token"), displayPhoneNumber: "+905550000000" };

async function makeTenant(automationsOverride = {}, whatsapp = FAKE_WHATSAPP) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, ...automationsOverride };
  await tenantRepo.updateTenant(tenant.id, { whatsapp, automations });
  return { ...tenant, whatsapp, automations };
}

function baseProperty(overrides) {
  return { category: "satilik", type: "Daire", title: "Test İlan", listingNo: "123456", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda", ...overrides };
}

beforeAll(() => getTestPool());
afterAll(() => closeTestPool());

describe("automation.service (Postgres) — notifyMatchingCustomersForListing", () => {
  let fetchSpy;

  beforeEach(async () => {
    await truncateAll();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => fetchSpy.mockRestore());

  it("listingMatch devre dışıyken hiç event oluşturmaz", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const property = await propertyPostgresRepository.create(context, baseProperty({}));

    await notifyMatchingCustomersForListing(context, property);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("enabled ama şablon henüz onaylı değilse pending_manual event + wa.me linki hazırlar (Business API'yi HİÇ çağırmaz)", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const property = await propertyPostgresRepository.create(context, baseProperty({ title: "Kadıköy'de 3+1" }));

    await notifyMatchingCustomersForListing(context, property);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("pending_manual");
    expect(events[0].waLink).toMatch(/^https:\/\/wa\.me\/905551234567\?text=/);
    expect(fetchSpy).not.toHaveBeenCalled();

    const updatedCustomer = await customerRepository.findById(context, customer.id);
    const lastEntry = updatedCustomer.timeline.at(-1);
    expect(lastEntry.label).toBe("Otomasyon: Yeni İlan Eşleşmesi hazırlandı, gönderim bekliyor.");
  });

  it("şablon onaylıysa GERÇEKTEN WhatsApp API'sini çağırıp 'sent' event oluşturur", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: true, templateStatus: "approved", templateName: "listing_match_notification", templateMetaId: "meta-1" } });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const property = await propertyPostgresRepository.create(context, baseProperty({ title: "Kadıköy'de 3+1" }));

    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "wamid.123" }] }) });

    await notifyMatchingCustomersForListing(context, property);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("pn-1/messages");
    const body = JSON.parse(options.body);
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("listing_match_notification");

    const updatedCustomer = await customerRepository.findById(context, customer.id);
    expect(updatedCustomer.timeline.at(-1).label).toBe("Otomasyon: Yeni İlan Eşleşmesi gönderildi.");

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("sent");
  });

  it("geçersiz/eksik telefonlu müşteri için hiç event oluşturulmaz, akış çökmez", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerRepository.create(context, createDefaultCustomer({ name: "Telefonsuz", phone: "", interests: ["Daire"] }));
    const property = await propertyPostgresRepository.create(context, baseProperty({}));

    await notifyMatchingCustomersForListing(context, property);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});

describe("automation.service (Postgres) — checkOffHoursAndReply", () => {
  let fetchSpy;

  beforeEach(async () => {
    await truncateAll();
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.restoreAllMocks();
  });

  const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();
  const WEDNESDAY_LATE_NIGHT_ISTANBUL = dayjs.tz("2026-08-12 22:00", "Europe/Istanbul").valueOf();

  async function makeConversation(context) {
    return conversationRepository.create(context, createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567" }));
  }

  it("otomasyon kapalıyken hiç yanıt göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: false, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mesai SAATİ İÇİNDEYSE yanıt göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mesai DIŞINDAYSA ve otomasyon açıksa yanıt gönderir, lastAutoReplyAt'i günceller", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız, mesai saatinde döneriz." } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const updated = await conversationRepository.findById(context, conversation.id);
    expect(updated.lastAutoReplyAt).toBe(WEDNESDAY_LATE_NIGHT_ISTANBUL);
  });

  it("son otomatik yanıttan (cooldown içinde) az zaman geçtiyse TEKRAR göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    let conversation = await makeConversation(context);
    conversation = await conversationRepository.update(context, conversation.id, { lastAutoReplyAt: WEDNESDAY_LATE_NIGHT_ISTANBUL - 60 * 60 * 1000 });

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("automation.service (Postgres) — submitWhatsappTemplate", () => {
  let fetchSpy;

  beforeEach(async () => {
    await truncateAll();
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ id: "meta-template-1", status: "PENDING" }) });
  });

  afterEach(() => fetchSpy.mockRestore());

  it("özel metin YAZILMAMIŞSA varsayılan metinle, _v1 adıyla gönderir", async () => {
    const tenant = await makeTenant();
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    const result = await submitWhatsappTemplate(context, "listingMatch");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.name).toBe("listing_match_notification_v1");
    expect(result.listingMatch.templateName).toBe("listing_match_notification_v1");
    expect(result.listingMatch.templateVersion).toBe(1);
  });

  it("İKİNCİ kez gönderince versiyon artar, Meta'ya YENİ bir isim gider", async () => {
    const tenant = await makeTenant();
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    await submitWhatsappTemplate(context, "listingMatch");
    const second = await submitWhatsappTemplate(context, "listingMatch");

    expect(second.listingMatch.templateVersion).toBe(2);
    expect(second.listingMatch.templateName).toBe("listing_match_notification_v2");
  });

  it("WhatsApp bağlı değilse anlamlı bir hata fırlatır, Meta'ya hiç istek atmaz", async () => {
    const tenant = await makeTenant({}, null);
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    await expect(submitWhatsappTemplate(context, "listingMatch")).rejects.toThrow(/WhatsApp/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("automation.service (Postgres) — checkClosingWindows", () => {
  const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();

  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(() => jest.restoreAllMocks());

  async function makeConversation(context, overrides = {}) {
    const conversation = await conversationRepository.create(context, createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567", participantName: "Ahmet" }));
    return conversationRepository.update(context, conversation.id, overrides);
  }

  it("cevaplanmamış (inbound) VE penceresi yakında kapanacak bir sohbet için uyarı oluşturur, sohbeti işaretler", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    const conversation = await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkClosingWindows(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("windowClosing");
    expect(events[0].conversationId).toBe(conversation.id);
    expect(events[0].message).toContain("Ahmet");

    const updated = await conversationRepository.findById(context, conversation.id);
    expect(updated.windowAlertSentAt).toBe(WEDNESDAY_NOON_ISTANBUL);
  });

  it("AYNI pencere için İKİNCİ kez çalıştırılınca tekrar uyarmaz (idempotency)", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkClosingWindows(context, tenant);
    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("SİZ zaten cevapladıysanız (lastMessageDirection=outbound) uyarmaz", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await makeConversation(context, { lastMessageDirection: "outbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});

describe("automation.service (Postgres) — notifyNewLead", () => {
  let fetchSpy;

  beforeEach(async () => {
    await truncateAll();
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "wamid.123" }] }) });
  });

  afterEach(() => fetchSpy.mockRestore());

  it("newLeadWelcome kapalıyken null döner, hiçbir şey oluşturmaz", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43" });

    const result = await notifyNewLead(context, lead);

    expect(result).toBeNull();
    expect(await customerRepository.findAll(context)).toHaveLength(0);
    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("açıkken müşteri oluşturur, içsel 'yeni lead' bildirimi + karşılama event'i (pending_manual) düşer", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43", message: "3+1 daire arıyorum", context: "Instagram Reklam" });

    const customer = await notifyNewLead(context, lead);

    expect(customer).not.toBeNull();
    expect(customer.source).toBe("Instagram");
    expect(customer.notes).toBe("3+1 daire arıyorum");

    const customers = await customerRepository.findAll(context);
    expect(customers).toHaveLength(1);

    const updatedCustomer = await customerRepository.findById(context, customer.id);
    expect(updatedCustomer.timeline).toHaveLength(2);
    expect(updatedCustomer.timeline[1].label).toBe("Otomasyon: Yeni Lead Karşılama hazırlandı, gönderim bekliyor.");

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(2);
    const alertEvent = events.find((e) => e.type === "newLeadAlert");
    const welcomeEvent = events.find((e) => e.type === "newLeadWelcome");
    expect(alertEvent.status).toBe("sent");
    expect(welcomeEvent.status).toBe("pending_manual");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("şablon onaylıysa karşılama mesajını GERÇEKTEN gönderir", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "approved", templateName: "new_lead_welcome_v1", templateMetaId: "meta-1" } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43" });

    await notifyNewLead(context, lead);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const events = await automationEventRepository.findAll(context);
    expect(events.find((e) => e.type === "newLeadWelcome").status).toBe("sent");
  });
});

describe("automation.service (Postgres) — checkLeadResponseAlerts", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(() => jest.restoreAllMocks());

  async function makeLead(context, minutesAgo, overrides = {}) {
    const lead = await leadRepository.create(context, createDefaultLead({ name: "Ahmet", phone: "0555 123 45 67" }));
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
    return leadRepository.update(context, lead.id, { createdAt, ...overrides });
  }

  async function makeCustomer(context, minutesAgo, overrides = {}) {
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Zeynep", phone: "0555 123 45 67" }));
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
    return customerRepository.update(context, customer.id, { createdAt, ...overrides });
  }

  it("eşiği geçmiş, hâlâ 'Yeni' durumdaki başvuru için uyarı oluşturur, responseAlertSentAt işaretler", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lead = await makeLead(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].leadId).toBe(lead.id);

    const updated = await leadRepository.findById(context, lead.id);
    expect(updated.responseAlertSentAt).not.toBeNull();
  });

  it("zaten bir müşteri kartına dönüşmüş (status: 'Müşteri Oldu') başvuruyu atlar", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15, { status: "Müşteri Oldu" });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("son uyarıdan bu yana repeatMinutes geçtiyse ve durum HÂLÂ 'Yeni'yse TEKRAR uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10, repeatMinutes: 20 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lastAlertAt = Date.now() - 25 * 60 * 1000;
    const lead = await makeLead(context, 60, { responseAlertSentAt: lastAlertAt });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
    const updated = await leadRepository.findById(context, lead.id);
    expect(updated.responseAlertSentAt).toBeGreaterThan(lastAlertAt);
  });

  it("müşteri kartı ZATEN oluşmuş ama hâlâ 'Yeni' durumundaysa da uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const customer = await makeCustomer(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].customerId).toBe(customer.id);
  });

  it("hem bekleyen bir lead hem de 'Yeni'de kalmış bir müşteri varsa ikisi için de ayrı ayrı uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15);
    await makeCustomer(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(2);
  });
});
