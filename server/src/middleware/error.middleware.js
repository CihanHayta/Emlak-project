// server/src/middleware/error.middleware.js
import { ERROR_CODES } from "../config/constants.js";
import { logger } from "../config/logger.js";

/**
 * Tek merkezi hata yakalayıcı — app.js'te en son middleware olarak bağlanır.
 * `express-async-errors` sayesinde async controller/service'lerde fırlatılan
 * her hata (throw edilen ApiError dahil) buraya düşer; bunun dışında hiçbir
 * yerde try/catch ile "sessizce yutulmuş" hata olmamalı.
 */
// eslint-disable-next-line no-unused-vars -- Express, 4 parametreli imzadan error handler olduğunu anlar.
export function errorMiddleware(err, req, res, _next) {
  const isApiError = typeof err.code === "string" && err.code in ERROR_CODES;
  const status = isApiError ? err.status : typeof err.status === "number" ? err.status : 500;
  const code = isApiError ? err.code : ERROR_CODES.INTERNAL_ERROR;
  // 5xx hataların tam mesajını dışarı sızdırma — sadece loglara yaz, istemciye genel mesaj dön.
  const message = status < 500 ? err.message : "Sunucuda beklenmeyen bir hata oluştu.";

  logger.log(status >= 500 ? "error" : "warn", err.message, {
    requestId: req.requestId,
    status,
    code,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: isApiError ? err.details : undefined,
      requestId: req.requestId,
    },
  });
}
