// server/src/validators/lead.validator.js
import { body } from "express-validator";
import { isValidTrPhone } from "../utils/phone.js";

/**
 * POST /public/leads — internetten kimlik doğrulaması olmadan HERKESİN
 * gönderebildiği tek uç (bkz. routes/publicLead.routes.js). Öncesinde
 * controller sadece "ad/telefon boş mu" diye bakıyordu — bozuk/anlamsız
 * bir telefon (ya da 10.000 karakterlik bir mesaj) doğrudan Firestore'a
 * yazılıyordu. Artık `validate.middleware.js` üzerinden geçiyor.
 */
export const createPublicLeadValidator = [
  body("tenantId").isString().trim().notEmpty().withMessage("tenantId zorunlu."),
  body("name").isString().trim().isLength({ min: 2, max: 100 }).withMessage("Ad 2-100 karakter olmalı."),
  body("phone")
    .isString()
    .custom((value) => isValidTrPhone(value))
    .withMessage("Geçerli bir telefon numarası girin (örn. 0555 123 45 67)."),
  body("message").optional({ values: "falsy" }).isString().trim().isLength({ max: 1000 }).withMessage("Mesaj en fazla 1000 karakter olabilir."),
  body("context").optional({ values: "falsy" }).isString().trim().isLength({ max: 200 }),
  body("funnelId").optional({ values: "falsy" }).isString().trim(),
];
