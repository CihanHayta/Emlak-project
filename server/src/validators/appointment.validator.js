// server/src/validators/appointment.validator.js
import { body } from "express-validator";

/**
 * appointment.model.js her alan için varsayılan tanımlıyor, AMA
 * appointment.service.js#createAppointment çakışma kontrolünü
 * (assertNoConflict) modelin varsayılanları uygulanmadan ÖNCE, ham
 * `data.dateTime` ile yapıyor — eksik bırakılırsa `undefined` üzerinde
 * tarih matematiği NaN üretip Firestore sorgusunu çökertiyordu (canlıda
 * 2026-08-13'te yakalandı). `serviceType` admin tarafından Ayarlar'dan
 * özelleştirilebilen bir liste olduğu için (bkz. admin/data/constants.js
 * SERVICES) burada sabit bir enum'a KİLİTLENMİYOR, sadece boş olmadığı
 * doğrulanıyor.
 */
const APPOINTMENT_STATUSES = ["Beklemede", "Onaylandı", "Tamamlandı", "İptal Edildi"];

function isValidTimestamp(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export const createAppointmentValidator = [
  body("dateTime").custom(isValidTimestamp).withMessage("Geçerli bir randevu tarihi/saati zorunlu."),
  body("serviceType").optional().isString().trim().notEmpty().withMessage("Hizmet türü boş olamaz."),
  body("status").optional().isString().trim().isIn(APPOINTMENT_STATUSES).withMessage("Geçersiz durum değeri."),
  body("note").optional({ values: "falsy" }).isString().isLength({ max: 2000 }).withMessage("Not en fazla 2000 karakter olabilir."),
];

export const updateAppointmentValidator = [
  body("dateTime").optional().custom(isValidTimestamp).withMessage("Geçerli bir randevu tarihi/saati olmalı."),
  body("serviceType").optional().isString().trim().notEmpty().withMessage("Hizmet türü boş olamaz."),
  body("status").optional().isString().trim().isIn(APPOINTMENT_STATUSES).withMessage("Geçersiz durum değeri."),
  body("note").optional({ values: "falsy" }).isString().isLength({ max: 2000 }).withMessage("Not en fazla 2000 karakter olabilir."),
];
