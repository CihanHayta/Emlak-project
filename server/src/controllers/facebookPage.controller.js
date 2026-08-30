// server/src/controllers/facebookPage.controller.js
import { subscribePageToLeadgen } from "../services/metaLeadAds.service.js";
import { connectTenantFacebookPage, disconnectTenantFacebookPage, getTenantById } from "../services/tenant.service.js";
import { encryptToken } from "../utils/crypto.util.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Elle bağlama — WhatsApp'taki connectManualController ile aynı desen:
 * admin, Meta Graph API Explorer'dan aldığı Page Access Token'ı ve Page
 * ID'sini panelden yapıştırır (bkz. instagramOAuth.service.js'in aksine
 * burada bir OAuth code exchange yok — token zaten hazır, biz sadece
 * webhook'a abone edip şifreleyip saklıyoruz).
 */
export async function connectController(req, res) {
  const { pageId, pageAccessToken, pageName } = req.body;
  if (!pageId || !pageAccessToken) {
    throw ApiError.validation("pageId ve pageAccessToken zorunlu.");
  }

  await subscribePageToLeadgen(pageId, pageAccessToken);
  await connectTenantFacebookPage(req.context.tenantId, {
    pageId,
    pageName: pageName || null,
    pageAccessToken: encryptToken(pageAccessToken),
    connectedAt: Date.now(),
    connectedByUserId: req.context.userId,
  });
  sendSuccess(res, { data: { connected: true, pageName: pageName || null }, status: 201 });
}

export async function disconnectController(req, res) {
  await disconnectTenantFacebookPage(req.context.tenantId);
  sendSuccess(res, { data: { connected: false } });
}

export async function statusController(req, res) {
  const tenant = await getTenantById(req.context.tenantId);
  const facebookPage = tenant.facebookPage;
  sendSuccess(res, {
    data: facebookPage ? { connected: true, pageName: facebookPage.pageName, pageId: facebookPage.pageId } : { connected: false },
  });
}
