// server/src/utils/ApiError.js
import createHttpError from "http-errors";
import { ERROR_CODES, ERROR_STATUS } from "../config/constants.js";

/**
 * Uygulama genelinde fırlatılan tüm beklenen hatalar bu sınıftan olmalı.
 * `error.middleware.js` bunu yakalayıp API'nin standart hata zarfına çevirir.
 *
 * `http-errors`'ın kendi `HttpError` sınıfını miras almak yerine onun
 * factory fonksiyonunu (`createHttpError(status, message)`) çağırıp doğru
 * `status`/`statusCode`/`expose` değerlerini oradan devralıyoruz — kütüphane
 * sınıf hiyerarşisini elle genişletmek yerine daha kırılgan olmayan bir yol.
 */
export class ApiError extends Error {
  constructor(code, message, details = undefined) {
    const status = ERROR_STATUS[code] ?? 500;
    const httpError = createHttpError(status, message);
    super(httpError.message);
    this.name = "ApiError";
    this.status = httpError.status;
    this.statusCode = httpError.statusCode;
    this.expose = httpError.expose;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, ApiError);
  }

  static validation(message, details) {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, message, details);
  }
  static unauthenticated(message = "Giriş yapmanız gerekiyor.") {
    return new ApiError(ERROR_CODES.UNAUTHENTICATED, message);
  }
  static forbidden(message = "Bu işlem için yetkiniz yok.") {
    return new ApiError(ERROR_CODES.FORBIDDEN, message);
  }
  static notFound(message = "Kayıt bulunamadı.") {
    return new ApiError(ERROR_CODES.NOT_FOUND, message);
  }
  static conflict(message) {
    return new ApiError(ERROR_CODES.CONFLICT, message);
  }
  static quotaExceeded(message = "Plan limitinize ulaştınız.") {
    return new ApiError(ERROR_CODES.TENANT_QUOTA_EXCEEDED, message);
  }
  static upstream(message = "Dış servisten hata alındı.") {
    return new ApiError(ERROR_CODES.UPSTREAM_ERROR, message);
  }
  static internal(message = "Beklenmeyen bir hata oluştu.") {
    return new ApiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
