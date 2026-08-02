// server/src/controllers/auth.controller.js
import { createSession, getMe, revokeSessions } from "../services/auth.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

// Frontend (Vercel) ve backend (Railway) farklı domain'lerde yaşıyor —
// tarayıcı için bu gerçek bir "cross-site" istek. SameSite=Lax cookie'ler
// cross-site fetch/XHR isteklerinde HİÇ gönderilmez (sadece üst düzey
// navigasyonda) — bu yüzden production'da None şart. None ise Secure
// (HTTPS) ister, o da zaten production'da true. Local dev'de ikisi de
// localhost olduğu için (farklı port olsa da) gerçek "same-site" sayılır,
// Lax orada zaten yeterli — ve Secure olmadan (http://localhost) None
// tarayıcı tarafından tamamen reddedilir, o yüzden dev'de Lax'ta kalıyoruz.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  path: "/",
};

export async function createSessionController(req, res) {
  const { idToken, rememberMe } = req.body;
  if (!idToken) throw ApiError.validation("idToken zorunlu.");

  const { cookie, maxAgeMs, persistent } = await createSession(idToken, { rememberMe: Boolean(rememberMe) });
  res.cookie(env.session.cookieName, cookie, {
    // maxAge verilmezse tarayıcı bunu bir "session cookie" sayar ve
    // tarayıcı tamamen kapanınca siler — "Beni Hatırla" işaretlenmediğinde
    // istenen davranış tam olarak bu.
    ...(persistent ? { maxAge: maxAgeMs } : {}),
    ...COOKIE_OPTIONS,
  });
  sendSuccess(res, { data: { ok: true } });
}

export async function getMeController(req, res) {
  const result = await getMe(req.context);
  sendSuccess(res, { data: result });
}

export async function logoutController(req, res) {
  if (req.user?.uid) await revokeSessions(req.user.uid);
  res.clearCookie(env.session.cookieName, COOKIE_OPTIONS);
  sendSuccess(res, { data: { ok: true } });
}
