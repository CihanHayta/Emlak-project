// server/src/controllers/whatsapp.controller.js
import { exchangeCodeForConnection, connectWithAccessToken } from "../services/whatsappOAuth.service.js";
import { connectTenantWhatsapp, disconnectTenantWhatsapp, getTenantById } from "../services/tenant.service.js";
import { encryptToken } from "../utils/crypto.util.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

async function storeConnection(tenantId, userId, connection) {
  await connectTenantWhatsapp(tenantId, {
    wabaId: connection.wabaId,
    phoneNumberId: connection.phoneNumberId,
    displayPhoneNumber: connection.displayPhoneNumber,
    accessToken: encryptToken(connection.accessToken),
    tokenExpiresAt: Date.now() + connection.expiresInSeconds * 1000,
    connectedAt: Date.now(),
    connectedByUserId: userId,
  });
}

/**
 * Instagram'daki gibi bir tarayıcı yönlendirmesi YOK — Embedded Signup
 * popup'ı (bkz. admin/lib/whatsappEmbeddedSignup.js) `code`'u ve popup'ın
 * kendi `message` event'inden yakalanan `wabaId`/`phoneNumberId`'yi
 * doğrudan bu endpoint'e POST eder, admin zaten oturum açmış durumda.
 * NOT: Business Verification tamamlanana kadar bu yol kullanılamıyor
 * (bkz. connectManualController) — henüz canlı test edilmedi.
 */
export async function connectController(req, res) {
  const { code, wabaId, phoneNumberId } = req.body;
  if (!code || !wabaId || !phoneNumberId) {
    throw ApiError.validation("code, wabaId ve phoneNumberId zorunlu.");
  }

  const connection = await exchangeCodeForConnection({ code, wabaId, phoneNumberId });
  await storeConnection(req.context.tenantId, req.context.userId, connection);
  sendSuccess(res, { data: { connected: true, displayPhoneNumber: connection.displayPhoneNumber }, status: 201 });
}

/**
 * Elle bağlama — her müşteri kendi Meta App'inde WhatsApp ürününü kurup
 * Access Token/WABA id/Phone Number id'sini admin panelden yapıştırır (bkz.
 * whatsappOAuth.service.js#connectWithAccessToken). Business Verification
 * tamamlanıp Embedded Signup çalışana kadar kullanılan asıl yol bu.
 */
export async function connectManualController(req, res) {
  const { accessToken, wabaId, phoneNumberId, displayPhoneNumber } = req.body;
  if (!accessToken || !wabaId || !phoneNumberId) {
    throw ApiError.validation("accessToken, wabaId ve phoneNumberId zorunlu.");
  }

  const connection = await connectWithAccessToken({ accessToken, wabaId, phoneNumberId, displayPhoneNumber });
  await storeConnection(req.context.tenantId, req.context.userId, connection);
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
