// server/src/validators/property.validator.js
import { body } from "express-validator";

/**
 * property.model.js#createDefaultProperty'de varsayılanı OLMAYAN alanlar
 * (category, type, title, price, district, neighborhood) — eksik
 * bırakılırsa Firestore'a `undefined` yazılmaya çalışılıp 500 hatası
 * fırlatıyordu (canlıda 2026-08-13'te yakalandı). lead.validator.js'teki
 * AYNI desen — validate.middleware.js üzerinden geçiyor.
 */
const PROPERTY_CATEGORIES = ["satilik", "kiralik"];
const PROPERTY_TYPES = ["Daire", "Müstakil", "Arsa"];
const PROPERTY_STATUSES = ["published", "unpublished"];

export const createPropertyValidator = [
  body("category").isString().trim().isIn(PROPERTY_CATEGORIES).withMessage('Kategori "satilik" veya "kiralik" olmalı.'),
  body("type").isString().trim().isIn(PROPERTY_TYPES).withMessage('Tip "Daire", "Müstakil" veya "Arsa" olmalı.'),
  body("title").isString().trim().isLength({ min: 2, max: 200 }).withMessage("Başlık 2-200 karakter olmalı."),
  body("price").isString().trim().notEmpty().withMessage("Fiyat zorunlu."),
  body("district").isString().trim().notEmpty().withMessage("İlçe zorunlu."),
  body("neighborhood").isString().trim().notEmpty().withMessage("Mahalle zorunlu."),
  body("status").optional().isString().trim().isIn(PROPERTY_STATUSES).withMessage('Durum "published" veya "unpublished" olmalı.'),
  body("description").optional({ values: "falsy" }).isString().isLength({ max: 5000 }).withMessage("Açıklama en fazla 5000 karakter olabilir."),
];

export const updatePropertyValidator = [
  body("category").optional().isString().trim().isIn(PROPERTY_CATEGORIES).withMessage('Kategori "satilik" veya "kiralik" olmalı.'),
  body("type").optional().isString().trim().isIn(PROPERTY_TYPES).withMessage('Tip "Daire", "Müstakil" veya "Arsa" olmalı.'),
  body("title").optional().isString().trim().isLength({ min: 2, max: 200 }).withMessage("Başlık 2-200 karakter olmalı."),
  body("price").optional().isString().trim().notEmpty().withMessage("Fiyat boş olamaz."),
  body("district").optional().isString().trim().notEmpty().withMessage("İlçe boş olamaz."),
  body("neighborhood").optional().isString().trim().notEmpty().withMessage("Mahalle boş olamaz."),
  body("status").optional().isString().trim().isIn(PROPERTY_STATUSES).withMessage('Durum "published" veya "unpublished" olmalı.'),
  body("description").optional({ values: "falsy" }).isString().isLength({ max: 5000 }).withMessage("Açıklama en fazla 5000 karakter olabilir."),
];
