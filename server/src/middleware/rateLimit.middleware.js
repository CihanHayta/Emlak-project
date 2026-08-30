// server/src/middleware/rateLimit.middleware.js
import rateLimit from "express-rate-limit";
import { RATE_LIMITS, ERROR_CODES } from "../config/constants.js";

// Not: varsayılan bellek-içi (MemoryStore) depo kullanılıyor — tek process
// için yeterli. Yatay ölçeklenen (birden fazla instance) bir dağıtıma
// geçildiğinde paylaşımlı bir depo (örn. Redis) eklenmesi gerekir, aksi
// halde limit fiilen instance sayısıyla çarpılmış olur.
function makeLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: "Çok fazla istek gönderildi, lütfen biraz sonra tekrar deneyin.",
          requestId: req.requestId,
        },
      });
    },
  });
}

export const globalRateLimit = makeLimiter(RATE_LIMITS.GLOBAL);
export const authRateLimit = makeLimiter(RATE_LIMITS.AUTH);
export const webhookRateLimit = makeLimiter(RATE_LIMITS.WEBHOOK);
