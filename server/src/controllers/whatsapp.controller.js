// server/src/controllers/whatsapp.controller.js
import { exchangeCodeForConnection } from "../services/whatsappOAuth.service.js";
import { connectTenantWhatsapp, disconnectTenantWhatsapp, getTenantById } from "../services/tenant.service.js";
import { encryptToken } from "../utils/crypto.util.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Instagram'daki gibi bir tarayıcı yönlendirmesi YOK — Embedded Signup
 * popup'ı (bkz. admin/lib/whatsappEmbeddedSignup.js) `code`'u ve popup'ın
 * kendi `message` event'inden yakalanan `wabaId`/`phoneNumberId`'yi
 * doğrudan bu endpoint'e POST eder, admin zaten oturum açmış durumda.
 */
export async function connectController(req, res) {
  const { code, wabaId, phoneNumberId } = req.body;
  if (!code || !wabaId || !phoneNumberId) {
    throw ApiError.validation("code, wabaId ve phoneNumberId zorunlu.");
  }

  const connection = await exchangeCodeForConnection({ code, wabaId, phoneNumberId });
  await connectTenantWhatsapp(req.context.tenantId, {
    wabaId: connection.wabaId,
    phoneNumberId: connection.phoneNumberId,
    displayPhoneNumber: connection.displayPhoneNumber,
    accessToken: encryptToken(connection.accessToken),
    tokenExpiresAt: Date.now() + connection.expiresInSeconds * 1000,
    connectedAt: Date.now(),
    connectedByUserId: req.context.userId,
  });
  sendSuccess(res, { data: { connected: true, displayPhoneNumber: connection.displayPhoneNumber }, status: 201 });
}

export async function disconnectController(req, res) {
  await disconnectTenantWhatsapp(req.context.tenantId);
  sendSuccess(res, { data: { connected: false } });
}

export async function statusController(req, res) {
  const tenant = await getTenantById(req.context.tenantId);
  const whatsapp = tenant.whatsapp;
  sendSuccess(res, {
    data: whatsapp
      ? { connected: true, displayPhoneNumber: whatsapp.displayPhoneNumber, tokenExpiresAt: whatsapp.tokenExpiresAt }
      : { connected: false },
  });
}
