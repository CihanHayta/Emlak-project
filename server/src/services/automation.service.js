// server/src/services/automation.service.js
//
// Otomasyonlar sayfasının iş mantığı — bkz. tenant.model.js#automations
// için genel tasarım notu. Üç otomasyon:
//  1) notifyMatchingCustomersForListing — yeni ilan girildiğinde eşleşen
//     müşterilere haber (PROAKTİF — template gerekir).
//  2) sendAppointmentReminders — randevudan önce müşteriye hatırlatma
//     (PROAKTİF — template gerekir).
//  3) checkOffHoursAndReply — mesai dışı gelen mesaja otomatik yanıt
//     (REAKTİF — 24 saatlik pencere zaten açık, template GEREKMEZ).
//
// 1 ve 2 için: template onaylıysa GERÇEKTEN gönderilir; onaylı değilse
// (ya da hiç gönderilmediyse/reddedildiyse) mesaj hazırlanır, bir
// automationEvents kaydı "pending_manual" olarak düşer, admin panelinde
// "Gönder" butonuyla (wa.me linki — agent'ın KENDİ WhatsApp'ından, Business
// API'yi hiç kullanmadan) elle gönderilebilir. Asla onaysız otomatik
// gönderim denenmez (Meta hesabın askıya alınması riski).
import { getTenantById, setTenantAutomations } from "./tenant.service.js";
import { getMatchingCustomers } from "./matching.service.js";
import { sendWhatsappMessage, sendWhatsappTemplateMessage, submitMessageTemplate, getTemplateStatus } from "./whatsapp.service.js";
import { sendInstagramMessage } from "./instagram.service.js";
import { automationEventRepository } from "../repositories/automationEvent.repository.js";
import { conversationRepository } from "../repositories/conversation.repository.js";
import { customerRepository } from "../repositories/customer.repository.js";
import { createDefaultAutomationEvent } from "../models/automationEvent.model.js";
import { normalizeTrPhone } from "../utils/phone.js";
import { decryptToken } from "../utils/crypto.util.js";
import { toIstanbul } from "../utils/date.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

const TEMPLATE_LANGUAGE = "tr";

// Sabit şablon metinleri — MVP'de özelleştirilemez, sadece gönder/onayla.
// Bir ilan/randevu bağlantısı (URL) BİLEREK yok — tenant'ların kendi
// public site domaini backend'de bilinmiyor (her tenant kendi Vercel
// projesinde, tenant.model.js'te bir "site URL" alanı yok) — bunu eklemek
// bu otomasyonun kapsamı dışında, ileride bir geliştirme olabilir.
export const AUTOMATION_TEMPLATES = {
  listingMatch: {
    name: "listing_match_notification",
    bodyText: "Merhaba {{1}}, aradığınız kriterlere uygun yeni bir ilan bulduk: {{2}}.",
    exampleValues: ["Ahmet", "3+1 Kadıköy Moda'da satılık daire, 2.750.000 TL"],
    buildParameters: (customer, listing) => [customer.name || "Değerli müşterimiz", `${listing.title}, ${listing.price}`],
    buildFreeText: (customer, listing) => `Merhaba ${customer.name || "Değerli müşterimiz"}, aradığınız kriterlere uygun yeni bir ilan bulduk: ${listing.title}, ${listing.price}.`,
  },
  appointmentReminder: {
    name: "appointment_reminder",
    bodyText: "Merhaba {{1}}, {{2}} tarihindeki randevunuzu hatırlatmak isteriz.",
    exampleValues: ["Ahmet", "15 Ağustos Cumartesi 14:00"],
    buildParameters: (customer, appointment) => [customer.name || "Değerli müşterimiz", formatAppointmentDate(appointment.dateTime)],
    buildFreeText: (customer, appointment) => `Merhaba ${customer.name || "Değerli müşterimiz"}, ${formatAppointmentDate(appointment.dateTime)} tarihindeki randevunuzu hatırlatmak isteriz.`,
  },
};

function formatAppointmentDate(dateTimeMs) {
  return toIstanbul(dateTimeMs).format("D MMMM dddd HH:mm");
}

function buildWaLink(phoneE164, text) {
  const digits = phoneE164.replace("+", "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Bir müşteriye tek bir otomasyon mesajını "gönder ya da hazırla" —
 * template onaylıysa gerçekten gönderir, değilse pending_manual event
 * yazar. Her iki durumda da bir automationEvents kaydı döner. Tek bir
 * müşterinin başarısız olması (ör. telefon numarası yok/geçersiz)
 * çağıranı ETKİLEMEMELİ — bu yüzden hata fırlatmıyor, "failed" event'i
 * yazıp `null` dönüyor.
 */
async function dispatchOrPrepare(context, tenant, { type, customerId, listingId = null, appointmentId = null }, customer, subject) {
  const template = AUTOMATION_TEMPLATES[type];
  const phone = normalizeTrPhone(customer.phone);
  const freeText = template.buildFreeText(customer, subject);

  if (!phone) {
    logger.warn(`Otomasyon atlandı — geçersiz telefon: tenant=${context.tenantId} customer=${customerId} type=${type}`);
    return null;
  }

  const automationSettings = tenant.automations?.[type];
  const templateApproved = automationSettings?.templateStatus === "approved" && automationSettings?.templateName;

  if (templateApproved && tenant.whatsapp) {
    try {
      const accessToken = decryptToken(tenant.whatsapp.accessToken);
      const toNumber = phone.replace("+", "");
      await sendWhatsappTemplateMessage(
        tenant.whatsapp.phoneNumberId,
        toNumber,
        automationSettings.templateName,
        TEMPLATE_LANGUAGE,
        template.buildParameters(customer, subject),
        accessToken,
      );
      return automationEventRepository.create(
        context,
        createDefaultAutomationEvent({ type, customerId, listingId, appointmentId, status: "sent", message: freeText }),
      );
    } catch (error) {
      logger.error(`Otomasyon gönderim hatası: tenant=${context.tenantId} customer=${customerId} type=${type} — ${error.message}`);
      return automationEventRepository.create(
        context,
        createDefaultAutomationEvent({ type, customerId, listingId, appointmentId, status: "failed", message: freeText, errorMessage: error.message }),
      );
    }
  }

  // Şablon henüz onaylı değil (ya da WhatsApp hiç bağlı değil) — mesajı
  // hazırla, agent'ın tek tıkla kendi WhatsApp'ından göndermesi için
  // bekleyen bir event bırak.
  return automationEventRepository.create(
    context,
    createDefaultAutomationEvent({ type, customerId, listingId, appointmentId, status: "pending_manual", message: freeText, waLink: buildWaLink(phone, freeText) }),
  );
}

/** property.service.js#createProperty / vehicle.service.js#createVehicle'dan, response bloklanmadan (floating promise) çağrılır. */
export async function notifyMatchingCustomersForListing(context, listing) {
  const tenant = await getTenantById(context.tenantId);
  if (!tenant?.automations?.listingMatch?.enabled) return;

  const matches = await getMatchingCustomers(context, listing);
  for (const customer of matches) {
    // eslint-disable-next-line no-await-in-loop -- müşteri başına bağımsız gönderim; bir ilan için genelde birkaç düzine müşteriyi geçmez, paralelleştirmeye değmez.
    await dispatchOrPrepare(context, tenant, { type: "listingMatch", customerId: customer.id, listingId: listing.id }, customer, listing);
  }
}

/** jobs/appointmentReminders.job.js'ten çağrılır — `appointments` bu tenant'ın hatırlatma penceresine düşen randevuları. */
export async function sendAppointmentReminders(context, tenant, appointments) {
  for (const appointment of appointments) {
    if (!appointment.customerId) continue; // müşteriye bağlanmamış bir randevu (customerId: null) — kime gönderileceği belli değil.
    // eslint-disable-next-line no-await-in-loop -- randevu başına bağımsız gönderim, job zaten periyodik çalışıyor.
    const customer = await customerRepository.findById(context, appointment.customerId);
    if (!customer) continue;
    // eslint-disable-next-line no-await-in-loop
    await dispatchOrPrepare(context, tenant, { type: "appointmentReminder", customerId: customer.id, appointmentId: appointment.id }, customer, appointment);
  }
}

/** businessHours objesine göre `now` mesai içi mi? */
function isWithinBusinessHours(businessHours, now) {
  const day = now.day(); // dayjs: 0=Pazar...6=Cumartesi, JS Date ile aynı
  if (!businessHours.days.includes(day)) return false;
  const hour = now.hour();
  return hour >= businessHours.startHour && hour < businessHours.endHour;
}

// Mesai dışı bir sohbette İKİNCİ bir otomatik yanıtın en az bu kadar süre
// sonra tekrar gönderilmesine izin verilir — müşteri arka arkaya birkaç
// mesaj yazarsa her birine ayrı bir "kapalıyız" botu yanıtı gitmesin diye.
const AUTO_REPLY_COOLDOWN_MS = 4 * 60 * 60 * 1000;

/**
 * Webhook'ların `createInboundMessage`'dan HEMEN sonra çağırdığı hook —
 * mesai dışıysa VE son otomatik yanıttan (varsa) yeterince zaman geçtiyse
 * müşterinin AZ ÖNCE açtığı 24 saatlik pencerede doğrudan (template
 * GEREKMEDEN) bir "kapalıyız" yanıtı gönderir. Çağıran (webhook) kendi
 * try/catch'i içinde çağırmalı — burada bilerek hata YUTULMUYOR, webhook
 * zaten kendi genel try/catch'ine sahip ve bir otomasyon hatası ana
 * mesaj-kaydetme akışını asla etkilememeli.
 */
export async function checkOffHoursAndReply(context, conversation, tenant) {
  const settings = tenant.automations?.offHoursReply;
  if (!settings?.enabled) return;

  const now = toIstanbul(Date.now());
  if (isWithinBusinessHours(settings.businessHours, now)) return;

  const lastReply = conversation.lastAutoReplyAt;
  if (lastReply && Date.now() - lastReply < AUTO_REPLY_COOLDOWN_MS) return;

  if (conversation.channel === "whatsapp") {
    if (!tenant.whatsapp) return;
    const accessToken = decryptToken(tenant.whatsapp.accessToken);
    await sendWhatsappMessage(tenant.whatsapp.phoneNumberId, conversation.externalUserId, settings.replyText, accessToken);
  } else if (conversation.channel === "instagram") {
    if (!tenant.instagram) return;
    const accessToken = decryptToken(tenant.instagram.accessToken);
    await sendInstagramMessage(conversation.externalUserId, settings.replyText, accessToken);
  } else {
    return;
  }

  await conversationRepository.update(context, conversation.id, { lastAutoReplyAt: Date.now() });
}

/**
 * Owner "Şablonu Meta'ya Gönder"e basınca çağrılır — `type` "listingMatch"
 * ya da "appointmentReminder". WhatsApp bağlı değilse ya da zaten
 * gönderilmiş/onaylanmışsa anlamlı bir hatayla reddeder.
 */
export async function submitWhatsappTemplate(context, type) {
  const template = AUTOMATION_TEMPLATES[type];
  if (!template) throw ApiError.validation(`Bilinmeyen otomasyon türü: ${type}`);

  const tenant = await getTenantById(context.tenantId);
  if (!tenant.whatsapp) throw ApiError.upstream("Önce WhatsApp hattınızı bağlamalısınız.");

  const currentStatus = tenant.automations?.[type]?.templateStatus;
  if (currentStatus === "approved" || currentStatus === "pending") {
    throw ApiError.validation("Bu şablon zaten gönderilmiş.");
  }

  const accessToken = decryptToken(tenant.whatsapp.accessToken);
  const result = await submitMessageTemplate(tenant.whatsapp.wabaId, accessToken, {
    name: template.name,
    language: TEMPLATE_LANGUAGE,
    bodyText: template.bodyText,
    exampleValues: template.exampleValues,
  });

  return setTenantAutomations(context.tenantId, {
    [type]: { ...tenant.automations[type], templateStatus: "pending", templateName: template.name, templateMetaId: result.id },
  });
}

/** Otomasyonlar sayfası açıldığında/yenilendiğinde Meta'daki güncel onay durumunu çeker. */
export async function refreshTemplateStatus(context, type) {
  const tenant = await getTenantById(context.tenantId);
  const current = tenant.automations?.[type];
  if (!current?.templateName) throw ApiError.validation("Bu otomasyon için henüz gönderilmiş bir şablon yok.");
  if (!tenant.whatsapp) throw ApiError.upstream("WhatsApp hattı bağlı değil.");

  const accessToken = decryptToken(tenant.whatsapp.accessToken);
  const metaTemplate = await getTemplateStatus(tenant.whatsapp.wabaId, accessToken, current.templateName);
  const newStatus = metaTemplate?.status?.toLowerCase() ?? current.templateStatus;

  return setTenantAutomations(context.tenantId, {
    [type]: { ...current, templateStatus: newStatus },
  });
}

export async function listAutomationEvents(context) {
  const events = await automationEventRepository.findAll(context, { limit: 100 });
  return events.sort((a, b) => (b.createdAt?.getTime?.() ?? b.createdAt ?? 0) - (a.createdAt?.getTime?.() ?? a.createdAt ?? 0));
}

/** Agent "Gönderdim" butonuna basınca (wa.me linkini kendi WhatsApp'ından açıp elle gönderdikten sonra) çağrılır — sadece kayıt/takip amaçlı. */
export async function markAutomationEventSent(context, id) {
  return automationEventRepository.update(context, id, { status: "manual_sent", sentAt: Date.now() });
}
