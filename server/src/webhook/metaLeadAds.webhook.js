// server/src/webhook/metaLeadAds.webhook.js
//
// instagram.webhook.js ile aynı güvenlik/response deseni (imza doğrulama —
// AYNI paylaşılan Meta App secret'ı, yeni env değişkeni gerekmiyor —, hemen
// 200, işleme arka planda). Payload şekli WhatsApp'takine benzer
// (`entry[].changes[].value`, `field: "leadgen"`) ama `value` sadece bir
// `leadgen_id` taşır — asıl form verisi (ad/telefon) AYRI bir Graph API
// çağrısıyla çekilir (bkz. services/metaLeadAds.service.js#fetchLeadData).
import { Router } from "express";
import express from "express";
import { verifyWebhookChallenge, verifyWebhookSignature } from "../services/instagram.service.js";
import { getTenantByFacebookPageId } from "../services/tenant.service.js";
import { fetchLeadData } from "../services/metaLeadAds.service.js";
import { createLead } from "../services/lead.service.js";
import { decryptToken } from "../utils/crypto.util.js";
import { normalizeTrPhone, formatTrPhoneForDisplay } from "../utils/phone.js";
import { logger } from "../config/logger.js";

export const metaLeadAdsWebhookRouter = Router();

/** Meta'nın webhook'u Dashboard'da kaydederken yaptığı tek seferlik doğrulama el sıkışması — bkz. instagram.webhook.js, aynı desen/aynı paylaşılan verify token. */
metaLeadAdsWebhookRouter.get("/", (req, res) => {
  const challenge = verifyWebhookChallenge(req.query);
  if (challenge) return res.status(200).send(challenge);
  res.sendStatus(403);
});

metaLeadAdsWebhookRouter.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-Hub-Signature-256");
  if (!verifyWebhookSignature(req.body, signature)) {
    logger.warn("Meta Lead Ads webhook: geçersiz imza, istek reddedildi.");
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    logger.error("Meta Lead Ads webhook: gövde JSON olarak ayrıştırılamadı — " + error.message);
    return;
  }

  try {
    for (const entry of payload.entry ?? []) {
      // eslint-disable-next-line no-await-in-loop -- entry'ler sırayla işleniyor.
      await processEntry(entry);
    }
  } catch (error) {
    logger.error("Meta Lead Ads webhook işleme hatası: " + error.message);
  }
});

/** `entry.id`: leadgen olayını gönderen Facebook Sayfası'nın id'si — bkz. tenant.repository.js#findTenantByFacebookPageId. */
async function processEntry(entry) {
  const tenant = await getTenantByFacebookPageId(entry.id);
  if (!tenant) {
    logger.warn(`Meta Lead Ads webhook: Sayfa id=${entry.id} için bağlı bir tenant bulunamadı, olay atlandı.`);
    return;
  }
  const pageAccessToken = decryptToken(tenant.facebookPage.pageAccessToken);
  const context = { tenantId: tenant.id, userId: null, role: "system" };

  for (const change of entry.changes ?? []) {
    if (change.field !== "leadgen" || !change.value?.leadgen_id) continue;

    // eslint-disable-next-line no-await-in-loop -- entry başına genelde tek olay gelir, sıralı işlemek yeterli.
    const leadData = await fetchLeadData(change.value.leadgen_id, pageAccessToken);
    const normalizedPhone = formatTrPhoneForDisplay(normalizeTrPhone(leadData.phone));

    // eslint-disable-next-line no-await-in-loop
    await createLead(context, {
      name: leadData.name,
      phone: normalizedPhone,
      message: leadData.message,
      context: "Instagram Reklam",
      funnelId: null,
    });
    logger.info(`Meta Lead Ads webhook: yeni başvuru kaydedildi (tenant=${tenant.id}).`);
  }
}
