// server/src/controllers/auth.controller.js
import { createSession, getMe, revokeSessions } from "../services/auth.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export async function createSessionController(req, res) {
  const { idToken, rememberMe } = req.body;
  if (!idToken) throw ApiError.validation("idToken zorunlu.");

  const { cookie, maxAgeMs, persistent } = await createSession(idToken, { rememberMe: Boolean(rememberMe) });
  res.cookie(env.session.cookieName, cookie, {
    // maxAge verilmezse tarayıcı bunu bir "session cookie" sayar ve
    // tarayıcı tamamen kapanınca siler — "Beni Hatırla" işaretlenmediğinde
    // istenen davranış tam olarak bu.
    ...(persistent ? { maxAge: maxAgeMs } : {}),
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
  });
  sendSuccess(res, { data: { ok: true } });
}

export async function getMeController(req, res) {
  const result = await getMe(req.context);
  sendSuccess(res, { data: result });
}

export async function logoutController(req, res) {
  if (req.user?.uid) await revokeSessions(req.user.uid);
  res.clearCookie(env.session.cookieName, { path: "/" });
  sendSuccess(res, { data: { ok: true } });
}
