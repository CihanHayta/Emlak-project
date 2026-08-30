// server/src/validators/funnel.validator.js
import { body } from "express-validator";

/**
 * `name` eksik bırakılırsa funnel.service.js#createFunnel içindeki
 * `slugify(data.slug || data.name)` çağrısı `slugify(undefined)`'a düşüyor
 * — slugify `String(undefined)` = "undefined" metnini geçerli (boş
 * OLMAYAN) bir slug sanıp `if (!slug)` kontrolünü atlatıyor, sonunda
 * Firestore'a `name: undefined` yazılmaya çalışılıp 500 hatası
 * fırlatıyordu (canlıda 2026-08-13'te yakalandı). `status` burada
 * BİLEREK yok — admin panelinde status değişimi ayrı bir "yayınla"
 * aksiyonu, create sırasında hep "draft" ile başlıyor (bkz.
 * funnel.model.js).
 */
export const createFunnelValidator = [
  body("name").isString().trim().isLength({ min: 2, max: 150 }).withMessage("Ad 2-150 karakter olmalı."),
  body("slug").optional({ values: "falsy" }).isString().trim().isLength({ max: 150 }),
  body("headline").optional({ values: "falsy" }).isString().isLength({ max: 200 }).withMessage("Başlık en fazla 200 karakter olabilir."),
  body("subheadline").optional({ values: "falsy" }).isString().isLength({ max: 300 }).withMessage("Alt başlık en fazla 300 karakter olabilir."),
];

export const updateFunnelValidator = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 150 }).withMessage("Ad 2-150 karakter olmalı."),
  body("slug").optional({ values: "falsy" }).isString().trim().isLength({ max: 150 }),
  body("status").optional().isString().trim().isIn(["draft", "published"]).withMessage('Durum "draft" veya "published" olmalı.'),
  body("headline").optional({ values: "falsy" }).isString().isLength({ max: 200 }).withMessage("Başlık en fazla 200 karakter olabilir."),
  body("subheadline").optional({ values: "falsy" }).isString().isLength({ max: 300 }).withMessage("Alt başlık en fazla 300 karakter olabilir."),
];
