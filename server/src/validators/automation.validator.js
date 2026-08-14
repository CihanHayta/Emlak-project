// server/src/validators/automation.validator.js
import { body } from "express-validator";

/**
 * automation.service.js#interpolate TAM OLARAK `{{1}}` (müşteri adı) ve
 * `{{2}}` (detay) bekliyor — owner metni serbestçe yeniden yazabilir ama
 * bu iki değişkeni SİLEMEZ/ÇOĞALTAMAZ, aksi halde Meta'ya giden parametre
 * sayısı (her zaman 2) ile şablonun kendi placeholder sayısı uyuşmaz,
 * gönderim reddedilir.
 */
function hasExactlyOneOccurrence(text, token) {
  return text.split(token).length === 2;
}

function validateTemplatePlaceholders(value) {
  if (!hasExactlyOneOccurrence(value, "{{1}}") || !hasExactlyOneOccurrence(value, "{{2}}")) {
    throw new Error("Mesaj metni tam olarak bir kere {{1}} (müşteri adı) ve bir kere {{2}} (detay) içermeli.");
  }
  if (value.includes("{{3}}")) {
    throw new Error("Bu şablonda sadece {{1}} ve {{2}} kullanılabilir.");
  }
  return true;
}

export const updateAutomationSettingsValidator = [
  body("listingMatch.enabled").optional().isBoolean().withMessage("listingMatch.enabled boolean olmalı."),
  body("listingMatch.templateBodyText").optional().isString().trim().isLength({ min: 10, max: 1000 }).withMessage("Mesaj metni 10-1000 karakter olmalı.").custom(validateTemplatePlaceholders),
  body("appointmentReminder.enabled").optional().isBoolean().withMessage("appointmentReminder.enabled boolean olmalı."),
  body("appointmentReminder.hoursBefore").optional().isInt({ min: 1, max: 72 }).withMessage("Hatırlatma 1-72 saat önce arasında olmalı."),
  body("appointmentReminder.templateBodyText").optional().isString().trim().isLength({ min: 10, max: 1000 }).withMessage("Mesaj metni 10-1000 karakter olmalı.").custom(validateTemplatePlaceholders),
  body("offHoursReply.enabled").optional().isBoolean().withMessage("offHoursReply.enabled boolean olmalı."),
  body("offHoursReply.replyText").optional().isString().trim().isLength({ min: 2, max: 1000 }).withMessage("Yanıt metni 2-1000 karakter olmalı."),
  body("offHoursReply.businessHours.startHour").optional().isInt({ min: 0, max: 23 }).withMessage("Başlangıç saati 0-23 arasında olmalı."),
  body("offHoursReply.businessHours.endHour").optional().isInt({ min: 0, max: 23 }).withMessage("Bitiş saati 0-23 arasında olmalı."),
  body("offHoursReply.businessHours.days").optional().isArray().withMessage("Çalışma günleri bir liste olmalı."),
  body("offHoursReply.businessHours.days.*").optional().isInt({ min: 0, max: 6 }).withMessage("Gün değeri 0 (Pazar) - 6 (Cumartesi) arasında olmalı."),
];
