// server/src/controllers/instagram.controller.js
import { env } from "../config/env.js";
import { buildAuthorizeUrl, exchangeCodeForConnection } from "../services/instagramOAuth.service.js";
import { connectTenantInstagram, disconnectTenantInstagram, getTenantById } from "../services/tenant.service.js";
import { encryptToken } from "../utils/crypto.util.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { logger } from "../config/logger.js";

/** "Instagram Hesabını Bağla" butonu — tarayıcıyı doğrudan Meta'nın yetkilendirme sayfasına yönlendirir. */
export async function startOauthController(req, res) {
  const url = buildAuthorizeUrl(req.context.tenantId);
  res.redirect(url);
}

/**
 * Meta'nın kullanıcıyı geri gönderdiği adres — `authMiddleware` ZORUNLU
 * DEĞİL (Meta'nın yönlendirdiği tarayıcı isteğinde session cookie'si
 * garantili gelmeyebilir); tenant kimliği imzalı `state` parametresinden
 * çözülüyor (bkz. instagramOAuth.service.js#verifyState).
 */
export async function oauthCallbackController(req, res) {
  const { code, state, error: oauthError } = req.query;
  const settingsUrl = `${env.frontendUrl}/admin/ayarlar`;

  if (oauthError || !code || !state) {
    return res.redirect(`${settingsUrl}?instagram=error`);
  }

  try {
    const connection = await exchangeCodeForConnection(code, state);
    await connectTenantInstagram(connection.tenantId, {
      accountId: connection.accountId,
      username: connection.username,
      accessToken: encryptToken(connection.accessToken),
      tokenExpiresAt: Date.now() + connection.expiresInSeconds * 1000,
      connectedAt: Date.now(),
      connectedByUserId: null, // state, oturumdan değil imzadan çözüldüğü için burada kullanıcı id'si yok — istenirse state payload'ına eklenebilir.
    });
    res.redirect(`${settingsUrl}?instagram=connected`);
  } catch (error) {
    logger.error("Instagram OAuth callback hatası: " + error.message);
    res.redirect(`${settingsUrl}?instagram=error`);
  }
}

export async function disconnectController(req, res) {
  await disconnectTenantInstagram(req.context.tenantId);
  sendSuccess(res, { data: { connected: false } });
}

export async function statusController(req, res) {
  const tenant = await getTenantById(req.context.tenantId);
  const instagram = tenant.instagram;
  sendSuccess(res, {
    data: instagram
      ? { connected: true, username: instagram.username, accountId: instagram.accountId, tokenExpiresAt: instagram.tokenExpiresAt }
      : { connected: false },
  });
}
