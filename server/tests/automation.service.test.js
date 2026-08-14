// server/tests/automation.service.test.js
import { jest } from "@jest/globals";
import dayjs from "dayjs";
import { toIstanbul } from "../src/utils/date.js"; // side effect: dayjs utc/timezone eklentilerini kaydeder
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createDefaultCustomer } from "../src/models/customer.model.js";
import { createDefaultProperty } from "../src/models/property.model.js";
import { createDefaultConversation } from "../src/models/conversation.model.js";
import { encryptToken } from "../src/utils/crypto.util.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { customerRepository } from "../src/repositories/customer.repository.js";
import { conversationRepository } from "../src/repositories/conversation.repository.js";
import { automationEventRepository } from "../src/repositories/automationEvent.repository.js";
import { notifyMatchingCustomersForListing, checkOffHoursAndReply, submitWhatsappTemplate } from "../src/services/automation.service.js";

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
    await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const { propertyRepository } = await import("../src/repositories/property.repository.js");
    const property = await propertyRepository.create(context, createDefaultProperty({ category: "satilik", type: "Daire", title: "Kadıköy'de 3+1", price: "1.000.000 TL", district: "Kadıköy", neighborhood: "Moda" }));

    await notifyMatchingCustomersForListing(context, property);

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("pending_manual");
    expect(events[0].waLink).toMatch(/^https:\/\/wa\.me\/905551234567\?text=/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("şablon onaylıysa GERÇEKTEN WhatsApp API'sini çağırıp 'sent' event oluşturur", async () => {
    const tenant = await makeTenant({ listingMatch: { enabled: true, templateStatus: "approved", templateName: "listing_match_notification", templateMetaId: "meta-1" } });
    context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
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
