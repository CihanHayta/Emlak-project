// server/src/validators/vehicle.validator.js
import { body } from "express-validator";

/**
 * vehicle.model.js#createDefaultVehicle'de varsayılanı OLMAYAN alanlar
 * (category, brand, model, year, fuelType, transmission, title, price) —
 * eksik bırakılırsa Firestore'a `undefined` yazılmaya çalışılıp 500 hatası
 * fırlatıyordu (canlıda 2026-08-13'te yakalandı, aynı properties'teki
 * gibi). fuelType/transmission/status değerleri admin/pages/VehicleForm.jsx
 * ile BİREBİR aynı tutulmalı — orada değişirse burada da güncelle.
 */
const VEHICLE_CATEGORIES = ["satilik", "kiralik"];
const FUEL_TYPES = ["Benzin", "Dizel", "LPG", "Elektrik", "Hibrit"];
const TRANSMISSIONS = ["Manuel", "Otomatik"];
const VEHICLE_STATUSES = ["active", "reserved", "sold", "unpublished"];
const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 1;

function isValidYear(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR;
}

export const createVehicleValidator = [
  body("category").isString().trim().isIn(VEHICLE_CATEGORIES).withMessage('Kategori "satilik" veya "kiralik" olmalı.'),
  body("brand").isString().trim().notEmpty().withMessage("Marka zorunlu."),
  body("model").isString().trim().notEmpty().withMessage("Model zorunlu."),
  body("year").custom(isValidYear).withMessage(`Yıl ${MIN_YEAR}-${MAX_YEAR} arasında olmalı.`),
  body("fuelType").isString().trim().isIn(FUEL_TYPES).withMessage("Geçerli bir yakıt tipi seçin."),
  body("transmission").isString().trim().isIn(TRANSMISSIONS).withMessage("Geçerli bir vites tipi seçin."),
  body("title").isString().trim().isLength({ min: 2, max: 200 }).withMessage("Başlık 2-200 karakter olmalı."),
  body("price").isString().trim().notEmpty().withMessage("Fiyat zorunlu."),
  body("status").optional().isString().trim().isIn(VEHICLE_STATUSES).withMessage("Geçersiz durum değeri."),
  body("description").optional({ values: "falsy" }).isString().isLength({ max: 5000 }).withMessage("Açıklama en fazla 5000 karakter olabilir."),
];

export const updateVehicleValidator = [
  body("category").optional().isString().trim().isIn(VEHICLE_CATEGORIES).withMessage('Kategori "satilik" veya "kiralik" olmalı.'),
  body("brand").optional().isString().trim().notEmpty().withMessage("Marka boş olamaz."),
  body("model").optional().isString().trim().notEmpty().withMessage("Model boş olamaz."),
  body("year").optional().custom(isValidYear).withMessage(`Yıl ${MIN_YEAR}-${MAX_YEAR} arasında olmalı.`),
  body("fuelType").optional().isString().trim().isIn(FUEL_TYPES).withMessage("Geçerli bir yakıt tipi seçin."),
  body("transmission").optional().isString().trim().isIn(TRANSMISSIONS).withMessage("Geçerli bir vites tipi seçin."),
  body("title").optional().isString().trim().isLength({ min: 2, max: 200 }).withMessage("Başlık 2-200 karakter olmalı."),
  body("price").optional().isString().trim().notEmpty().withMessage("Fiyat boş olamaz."),
  body("status").optional().isString().trim().isIn(VEHICLE_STATUSES).withMessage("Geçersiz durum değeri."),
  body("description").optional({ values: "falsy" }).isString().isLength({ max: 5000 }).withMessage("Açıklama en fazla 5000 karakter olabilir."),
];
