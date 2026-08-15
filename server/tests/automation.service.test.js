// server/tests/automation.service.test.js
import { jest } from "@jest/globals";
import dayjs from "dayjs";
import { toIstanbul } from "../src/utils/date.js"; // side effect: dayjs utc/timezone eklentilerini kaydeder
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createDefaultCustomer } from "../src/models/customer.model.js";
import { createDefaultProperty } from "../src/models/property.model.js";
import { createDefaultConversation } from "../src/models/conversation.model.js";
import { createDefaultLead } from "../src/models/lead.model.js";
import { encryptToken } from "../src/utils/crypto.util.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { customerRepository } from "../src/repositories/customer.repository.js";
import { conversationRepository } from "../src/repositories/conversation.repository.js";
import { automationEventRepository } from "../src/repositories/automationEvent.repository.js";
import { leadRepository } from "../src/repositories/lead.repository.js";
import {
  notifyMatchingCustomersForListing,
  checkOffHoursAndReply,
  submitWhatsappTemplate,
  checkClosingWindows,
  notifyNewLead,
  checkLeadResponseAlerts,
} from "../src/services/automation.service.js";

// toIstanbul kullanılmıyor gibi görünse de import satırı kasıtlı — dayjs'in
// utc/timezone eklentilerini bir kere, modül yüklenirken kaydeder (date.js
// ile aynı `dayjs` paylaşımlı prototipi kullanıyoruz).
void toIstanbul;

const FAKE_WHATSAPP = { phoneNumberId: "pn-1", wabaId: "waba-1", accessToken: encryptToken("fake-access-token"), displayPhoneNumber: "+905550000000" };

async function makeTenant(automationsOverride = {}, whatsapp = FAKE_WHATSAPP) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, ...automationsOverride };
  await tenantRepo.updateTenant(tenant.id, { whatsapp, automations });
  return { ...tenant, whatsapp, automations };
}

let context;

describe("automation.service — notifyMatchingCustomersForListing", () => {
  let fetchSpy;

  beforeEach(async () => {
    resetMockFirestore();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => fetchSpy.mockRestore());

  it("listingMatch devre dışıyken hiç event oluşturmaz", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const property = await import("../src/repositories/property.repository.js").then((m) =>
      m.propertyRepository.create(context, createDefaultProperty({ category: "satilik", type: "Daire", title: "Test İlan", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda" })),
    );

    await notifyMatchingCustomersForListing(context, property);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("enabled ama şablon henüz onaylı değilse pending_manual event + wa.me linki hazırlar (Business API'yi HİÇ çağırmaz)", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const { propertyRepository } = await import("../src/repositories/property.repository.js");
    const property = await propertyRepository.create(context, createDefaultProperty({ category: "satilik", type: "Daire", title: "Kadıköy'de 3+1", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda" }));

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
    context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const { propertyRepository } = await import("../src/repositories/property.repository.js");
    const property = await propertyRepository.create(context, createDefaultProperty({ category: "satilik", type: "Daire", title: "Kadıköy'de 3+1", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda" }));

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
    context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerRepository.create(context, createDefaultCustomer({ name: "Telefonsuz", phone: "", interests: ["Daire"] }));
    const { propertyRepository } = await import("../src/repositories/property.repository.js");
    const property = await propertyRepository.create(context, createDefaultProperty({ category: "satilik", type: "Daire", title: "Test", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda" }));

    await notifyMatchingCustomersForListing(context, property);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});

describe("automation.service — checkOffHoursAndReply", () => {
  let fetchSpy;

  beforeEach(async () => {
    resetMockFirestore();
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.restoreAllMocks();
  });

  // 2026-08-12 bir Çarşamba — businessHours.days varsayılanı [1,2,3,4,5] (Pzt-Cuma) içinde.
  const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();
  const WEDNESDAY_LATE_NIGHT_ISTANBUL = dayjs.tz("2026-08-12 22:00", "Europe/Istanbul").valueOf();

  async function makeConversation(context) {
    return conversationRepository.create(context, createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567" }));
  }

  it("otomasyon kapalıyken hiç yanıt göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: false, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mesai SAATİ İÇİNDEYSE yanıt göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mesai DIŞINDAYSA ve otomasyon açıksa yanıt gönderir, lastAutoReplyAt'i günceller", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız, mesai saatinde döneriz." } });
    context = { tenantId: tenant.id, userId: null, role: "system" };
    const conversation = await makeConversation(context);

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const updated = await conversationRepository.findById(context, conversation.id);
    expect(updated.lastAutoReplyAt).toBe(WEDNESDAY_LATE_NIGHT_ISTANBUL);
  });

  it("son otomatik yanıttan (cooldown içinde) az zaman geçtiyse TEKRAR göndermez", async () => {
    const tenant = await makeTenant({ offHoursReply: { enabled: true, businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, replyText: "Kapalıyız" } });
    context = { tenantId: tenant.id, userId: null, role: "system" };
    let conversation = await makeConversation(context);
    // 1 saat önce zaten bir otomatik yanıt gönderilmiş (cooldown 4 saat).
    conversation = await conversationRepository.update(context, conversation.id, { lastAutoReplyAt: WEDNESDAY_LATE_NIGHT_ISTANBUL - 60 * 60 * 1000 });

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await checkOffHoursAndReply(context, conversation, tenant);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("automation.service — submitWhatsappTemplate (düzenlenebilir metin + versiyonlu isim)", () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockFirestore();
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
    expect(body.components[0].text).toBe("Merhaba {{1}}, aradığınız kriterlere uygun yeni bir ilan bulduk: {{2}}.");
    expect(result.listingMatch.templateName).toBe("listing_match_notification_v1");
    expect(result.listingMatch.templateStatus).toBe("pending");
    expect(result.listingMatch.templateVersion).toBe(1);
  });

  it("owner'ın YAZDIĞI özel metni kullanır", async () => {
    const tenant = await makeTenant({
      appointmentReminder: { enabled: false, hoursBefore: 2, templateStatus: "not_submitted", templateName: null, templateMetaId: null, templateBodyText: "Selam {{1}}! {{2}} randevunuz yaklaştı, unutmayın.", templateVersion: 0 },
    });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    await submitWhatsappTemplate(context, "appointmentReminder");

    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.name).toBe("appointment_reminder_v1");
    expect(body.components[0].text).toBe("Selam {{1}}! {{2}} randevunuz yaklaştı, unutmayın.");
  });

  it("İKİNCİ kez gönderince (ör. metni düzeltip tekrar) versiyon artar, Meta'ya YENİ bir isim gider", async () => {
    const tenant = await makeTenant();
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    await submitWhatsappTemplate(context, "listingMatch");
    const second = await submitWhatsappTemplate(context, "listingMatch");

    expect(second.listingMatch.templateVersion).toBe(2);
    expect(second.listingMatch.templateName).toBe("listing_match_notification_v2");
    const [, secondOptions] = fetchSpy.mock.calls[1];
    expect(JSON.parse(secondOptions.body).name).toBe("listing_match_notification_v2");
  });

  it("WhatsApp bağlı değilse anlamlı bir hata fırlatır, Meta'ya hiç istek atmaz", async () => {
    const tenant = await makeTenant({}, null);
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };

    await expect(submitWhatsappTemplate(context, "listingMatch")).rejects.toThrow(/WhatsApp/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("automation.service — checkClosingWindows (24 Saat Penceresi Uyarısı)", () => {
  const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();
  const WEDNESDAY_LATE_NIGHT_ISTANBUL = dayjs.tz("2026-08-12 22:00", "Europe/Istanbul").valueOf();

  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.restoreAllMocks());

  async function makeConversation(context, overrides = {}) {
    const conversation = await conversationRepository.create(context, createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567", participantName: "Ahmet" }));
    return conversationRepository.update(context, conversation.id, overrides);
  }

  it("otomasyon kapalıyken hiç uyarı oluşturmaz", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: false, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: Date.now() + 60 * 60 * 1000 });

    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("mesai SAATİ DIŞINDAYSA uyarmaz (elinizden bir şey gelmez)", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_LATE_NIGHT_ISTANBUL);
    await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: WEDNESDAY_LATE_NIGHT_ISTANBUL + 60 * 60 * 1000 });

    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("cevaplanmamış (inbound) VE penceresi yakında kapanacak bir sohbet için uyarı oluşturur, sohbeti işaretler", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    const conversation = await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 }); // 1 saat sonra kapanacak, eşik 2 saat

    await checkClosingWindows(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("windowClosing");
    expect(events[0].conversationId).toBe(conversation.id);
    expect(events[0].message).toContain("Ahmet");

    const updated = await conversationRepository.findById(context, conversation.id);
    expect(updated.windowAlertSentAt).toBe(WEDNESDAY_NOON_ISTANBUL);
  });

  it("SİZ zaten cevapladıysanız (lastMessageDirection=outbound) uyarmaz", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await makeConversation(context, { lastMessageDirection: "outbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
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

  it("penceresi henüz uyarı eşiğinin dışındaysa (çok erken) uyarmaz", async () => {
    const tenant = await makeTenant({ windowClosingAlert: { enabled: true, hoursBefore: 2 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    await makeConversation(context, { lastMessageDirection: "inbound", windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 10 * 60 * 60 * 1000 }); // 10 saat sonra, eşik 2 saat

    await checkClosingWindows(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});

describe("automation.service — notifyNewLead (Yeni Lead Karşılama)", () => {
  let fetchSpy;

  beforeEach(() => {
    resetMockFirestore();
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

  it("telefon yoksa null döner", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Telefonsuz", phone: "" });

    const result = await notifyNewLead(context, lead);

    expect(result).toBeNull();
    expect(await customerRepository.findAll(context)).toHaveLength(0);
  });

  it("açıkken müşteri oluşturur, içsel 'yeni lead' bildirimi + karşılama event'i (pending_manual) düşer", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43", message: "3+1 daire arıyorum", context: "Instagram Reklam" });

    const customer = await notifyNewLead(context, lead);

    expect(customer).not.toBeNull();
    expect(customer.name).toBe("Ayşe Kaya");
    expect(customer.source).toBe("Instagram"); // resolveLeadSource: context "Instagram Reklam" içeriyor
    expect(customer.notes).toBe("3+1 daire arıyorum");
    expect(customer.timeline[0].label).toContain("otomasyon tarafından oluşturuldu");

    const customers = await customerRepository.findAll(context);
    expect(customers).toHaveLength(1);

    const updatedCustomer = await customerRepository.findById(context, customer.id);
    expect(updatedCustomer.timeline).toHaveLength(2); // [0] oluşturma notu, [1] dispatchOrPrepare'in bıraktığı iz
    expect(updatedCustomer.timeline[1].label).toBe("Otomasyon: Yeni Lead Karşılama hazırlandı, gönderim bekliyor.");

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(2);
    const alertEvent = events.find((e) => e.type === "newLeadAlert");
    const welcomeEvent = events.find((e) => e.type === "newLeadWelcome");
    expect(alertEvent.status).toBe("sent");
    expect(alertEvent.message).toContain("Ayşe Kaya");
    expect(welcomeEvent.status).toBe("pending_manual");
    expect(welcomeEvent.waLink).toMatch(/^https:\/\/wa\.me\//);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("funnelId doluysa kaynak 'Kampanya' olur", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43", funnelId: "funnel-1" });

    const customer = await notifyNewLead(context, lead);

    expect(customer.source).toBe("Kampanya");
  });

  it("şablon onaylıysa karşılama mesajını GERÇEKTEN gönderir", async () => {
    const tenant = await makeTenant({ newLeadWelcome: { enabled: true, templateStatus: "approved", templateName: "new_lead_welcome_v1", templateMetaId: "meta-1" } });
    const context = { tenantId: tenant.id, userId: null, role: "public" };
    const lead = createDefaultLead({ name: "Ayşe Kaya", phone: "0555 987 65 43" });

    await notifyNewLead(context, lead);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const events = await automationEventRepository.findAll(context);
    const welcomeEvent = events.find((e) => e.type === "newLeadWelcome");
    expect(welcomeEvent.status).toBe("sent");
  });
});

describe("automation.service — checkLeadResponseAlerts (Lead Yanıt Uyarısı)", () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.restoreAllMocks());

  async function makeLead(context, minutesAgo, overrides = {}) {
    const lead = await leadRepository.create(context, createDefaultLead({ name: "Ahmet", phone: "0555 123 45 67" }));
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
    // createDefaultLead status/responseAlertSentAt'i SABİT ("Yeni"/null) set
    // ediyor, bu yüzden override'lar (status, responseAlertSentAt) create'e
    // değil, update'e veriliyor — BaseRepository.update hiçbir alanı
    // zorlamıyor, gönderileni aynen yazıyor.
    return leadRepository.update(context, lead.id, { createdAt, ...overrides });
  }

  it("otomasyon kapalıyken hiç uyarı oluşturmaz", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: false, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 20);

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("eşiği geçmiş, hâlâ 'Yeni' durumdaki (müşteri kartına dönüşmemiş) başvuru için uyarı oluşturur, responseAlertSentAt işaretler", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lead = await makeLead(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("leadResponseAlert");
    expect(events[0].leadId).toBe(lead.id);
    expect(events[0].message).toContain("Ahmet");

    const updated = await leadRepository.findById(context, lead.id);
    expect(updated.responseAlertSentAt).not.toBeNull();
  });

  // Canlıda yakalanan regresyon: gerçek Firestore'da `createdAt` bir
  // Timestamp nesnesi (`.toDate()` var, `.getTime()` YOK) — mock Firestore
  // (yukarıdaki testler) düz bir JS Date kullandığı için bu ayrımı hiç test
  // etmiyordu. Burada Timestamp'i BİREBİR taklit eden sahte bir nesne
  // veriyoruz (sadece toDate() metodu var) — eski kod bunu yanlış yorumlayıp
  // "28 milyon dakika önce" gibi anlamsız bir mesaj üretiyordu.
  it("createdAt gerçek bir Firestore Timestamp'i (toDate() metodu, getTime() YOK) olsa bile doğru dakika hesaplar", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lead = await leadRepository.create(context, createDefaultLead({ name: "Ahmet", phone: "0555 123 45 67" }));
    const fakeTimestamp = { toDate: () => new Date(Date.now() - 15 * 60 * 1000) }; // .getTime() BİLEREK yok
    await leadRepository.update(context, lead.id, { createdAt: fakeTimestamp });

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].message).toMatch(/^Ahmet 1[4-6] dakika önce/); // ~15dk, KESİNLİKLE milyonlarca değil
  });

  it("Yeni Lead Karşılama KAPALIYKEN bile çalışır (leads'i doğrudan izler, newLeadWelcome'dan bağımsız)", async () => {
    const tenant = await makeTenant({
      leadResponseAlert: { enabled: true, minutesThreshold: 10 },
      newLeadWelcome: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null },
    });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("zaten bir müşteri kartına dönüşmüş (status: 'Müşteri Oldu') başvuruyu atlar", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15, { status: "Müşteri Oldu" });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("son uyarıdan bu yana repeatMinutes henüz geçmediyse tekrar uyarmaz", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10, repeatMinutes: 30 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15, { responseAlertSentAt: Date.now() - 5 * 60 * 1000 }); // 30dk'lık tekrar aralığının sadece 5dk'sı geçmiş

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("son uyarıdan bu yana repeatMinutes geçtiyse ve durum HÂLÂ 'Yeni'yse TEKRAR uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10, repeatMinutes: 20 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lastAlertAt = Date.now() - 25 * 60 * 1000; // 20dk'lık tekrar aralığı geçmiş
    const lead = await makeLead(context, 60, { responseAlertSentAt: lastAlertAt });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
    const updated = await leadRepository.findById(context, lead.id);
    expect(updated.responseAlertSentAt).toBeGreaterThan(lastAlertAt);
  });

  it("eşik henüz geçmemişse (çok yeni) uyarmaz", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 3);

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  async function makeCustomer(context, minutesAgo, overrides = {}) {
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Zeynep", phone: "0555 123 45 67" }));
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
    return customerRepository.update(context, customer.id, { createdAt, ...overrides });
  }

  it("müşteri kartı ZATEN oluşmuş ama hâlâ 'Yeni' durumundaysa (aranmadı) da uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const customer = await makeCustomer(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("leadResponseAlert");
    expect(events[0].customerId).toBe(customer.id);
    expect(events[0].message).toContain("Zeynep");

    const updated = await customerRepository.findById(context, customer.id);
    expect(updated.responseAlertSentAt).not.toBeNull();
  });

  it("durumu 'Yeni' dışına çıkmış (agent zaten aramış) müşteriyi atlar", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeCustomer(context, 15, { status: "Arandı" });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("müşteri hâlâ 'Yeni'de kalmışsa, agent durumu güncelleyene kadar TEKRAR TEKRAR uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10, repeatMinutes: 20 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lastAlertAt = Date.now() - 25 * 60 * 1000;
    const customer = await makeCustomer(context, 60, { responseAlertSentAt: lastAlertAt });

    await checkLeadResponseAlerts(context, tenant);

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
    const updated = await customerRepository.findById(context, customer.id);
    expect(updated.responseAlertSentAt).toBeGreaterThan(lastAlertAt);
  });

  it("hem bekleyen bir lead hem de 'Yeni'de kalmış bir müşteri varsa ikisi için de ayrı ayrı uyarır", async () => {
    const tenant = await makeTenant({ leadResponseAlert: { enabled: true, minutesThreshold: 10 } });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await makeLead(context, 15);
    await makeCustomer(context, 15);

    await checkLeadResponseAlerts(context, tenant);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(2);
  });
});
