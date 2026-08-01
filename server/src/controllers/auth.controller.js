// server/src/controllers/auth.controller.js
import { createSession, getMe, revokeSessions, registerTenant } from "../services/auth.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export async function registerTenantController(req, res) {
  const { idToken, companyName, phone } = req.body;
  if (!idToken) throw ApiError.validation("idToken zorunlu.");
  if (!companyName || !companyName.trim()) throw ApiError.validation("Şirket adı zorunlu.");

  const result = await registerTenant({ idToken, companyName: companyName.trim(), phone: phone?.trim() || null });
  sendSuccess(res, { data: result, status: 201 });
}

export async function createSessionController(req, res) {
  const { idToken } = req.body;
  if (!idToken) throw ApiError.validation("idToken zorunlu.");

  const { cookie, maxAgeMs } = await createSession(idToken);
  res.cookie(env.session.cookieName, cookie, {
    maxAge: maxAgeMs,
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
