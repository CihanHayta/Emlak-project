// server/src/validators/automation.validator.js
import { body } from "express-validator";

export const updateAutomationSettingsValidator = [
  body("listingMatch.enabled").optional().isBoolean().withMessage("listingMatch.enabled boolean olmalı."),
  body("appointmentReminder.enabled").optional().isBoolean().withMessage("appointmentReminder.enabled boolean olmalı."),
  body("appointmentReminder.hoursBefore").optional().isInt({ min: 1, max: 72 }).withMessage("Hatırlatma 1-72 saat önce arasında olmalı."),
  body("offHoursReply.enabled").optional().isBoolean().withMessage("offHoursReply.enabled boolean olmalı."),
  body("offHoursReply.replyText").optional().isString().trim().isLength({ min: 2, max: 1000 }).withMessage("Yanıt metni 2-1000 karakter olmalı."),
  body("offHoursReply.businessHours.startHour").optional().isInt({ min: 0, max: 23 }).withMessage("Başlangıç saati 0-23 arasında olmalı."),
  body("offHoursReply.businessHours.endHour").optional().isInt({ min: 0, max: 23 }).withMessage("Bitiş saati 0-23 arasında olmalı."),
  body("offHoursReply.businessHours.days").optional().isArray().withMessage("Çalışma günleri bir liste olmalı."),
  body("offHoursReply.businessHours.days.*").optional().isInt({ min: 0, max: 6 }).withMessage("Gün değeri 0 (Pazar) - 6 (Cumartesi) arasında olmalı."),
];
