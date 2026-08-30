// server/src/middleware/auth.middleware.js
import { verifySessionCookie } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * `POST /auth/session`'da üretilen httpOnly session cookie'sini doğrular,
 * içindeki custom claims'ten (tenantId, role) `req.user`'ı doldurur.
 * tenantId/role HER ZAMAN buradan gelir — body/query'den asla okunmaz.
 */
export async function authMiddleware(req, _res, next) {
  const cookie = req.cookies?.[env.session.cookieName];
  if (!cookie) return next(ApiError.unauthenticated());

  try {
    req.user = await verifySessionCookie(cookie);
    next();
  } catch {
    next(ApiError.unauthenticated("Oturum geçersiz veya süresi dolmuş."));
  }
}
