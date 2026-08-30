// server/src/middleware/notFound.middleware.js
import { ApiError } from "../utils/ApiError.js";

/** Hiçbir route eşleşmediğinde çalışır — routes/index.js'ten sonra, error.middleware'den önce bağlanır. */
export function notFoundMiddleware(req, _res, next) {
  next(ApiError.notFound(`Böyle bir yol yok: ${req.method} ${req.originalUrl}`));
}
