// server/src/middleware/validate.middleware.js
import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Her validator zincirinin (bkz. src/validators/) sonuna eklenir. Toplanan
 * hataları tek bir VALIDATION_ERROR'a çevirir — controller hiçbir zaman
 * kendi validasyon hatası üretmez, sadece zaten-doğrulanmış veriyi görür.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((err) => ({
    field: err.type === "field" ? err.path : err.type,
    message: err.msg,
  }));
  next(ApiError.validation("Lütfen tüm alanları eksiksiz ve doğru şekilde doldurunuz.", details));
}
