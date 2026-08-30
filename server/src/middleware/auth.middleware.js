// server/src/middleware/auth.middleware.js
import { verifySessionToken } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * `POST /auth/login`'de üretilen httpOnly oturum çerezini doğrular,
 * `sessions` tablosundaki canlı satırdan `req.user`'ı doldurur. tenantId/
 * role HER ZAMAN buradan gelir — body/query'den asla okunmaz.
 */
export async function authMiddleware(req, _res, next) {
  const token = req.cookies?.[env.session.cookieName];
  if (!token) return next(ApiError.unauthenticated());

  try {
    req.user = await verifySessionToken(token);
    next();
  } catch {
    next(ApiError.unauthenticated("Oturum geçersiz veya süresi dolmuş."));
  }
}
