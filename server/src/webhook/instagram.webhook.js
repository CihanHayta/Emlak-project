// server/src/webhook/instagram.webhook.js
//
// Kimlik doğrulaması YOK (olamaz da — Meta bize Firebase idToken'ı
// göndermiyor) — güvenlik burada `X-Hub-Signature-256` imza doğrulaması
// ile sağlanıyor (bkz. services/instagram.service.js#verifyWebhookSignature).
// BİLEREK app.js'te `express.json()`'dan ÖNCE bağlanır, çünkü imza ham
// (henüz parse edilmemiş) body üzerinden hesaplanıyor — bu route kendi
// `express.raw()` gövde ayrıştırıcısını kullanır.
import { Router } from "express";
import express from "express";
import { verifyWebhookChallenge, verifyWebhookSignature, fetchInstagramProfile } from "../services/instagram.service.js";
import { getSingleTenant } from "../services/tenant.service.js";
import { findOrCreateConversation } from "../services/conversation.service.js";
import { createInboundMessage } from "../services/message.service.js";
import { logger } from "../config/logger.js";

export const instagramWebhookRouter = Router();

/** Meta'nın webhook'u Dashboard'da kaydederken yaptığı tek seferlik doğrulama el sıkışması. */
instagramWebhookRouter.get("/", (req, res) => {
  const challenge = verifyWebhookChallenge(req.query);
  if (challenge) return res.status(200).send(challenge);
  res.sendStatus(403);
});

/**
 * Gerçek DM olayları buraya düşer. Meta, 20 saniye içinde 200 dönmezsek
 * webhook'u "başarısız" sayıp tekrar dener (ve tekrarlanan denemeler
 * sonunda abonelik askıya alınabilir) — bu yüzden imza doğrulanır
 * doğrulanmaz HEMEN 200 dönülür, asıl işleme (Firestore'a yazma, profil
 * çekme) o yanıttan SONRA, arka planda devam eder.
 */
instagramWebhookRouter.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-Hub-Signature-256");
  if (!verifyWebhookSignature(req.body, signature)) {
    logger.warn("Instagram webhook: geçersiz imza, istek reddedildi.");
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    logger.error("Instagram webhook: gövde JSON olarak ayrıştırılamadı — " + error.message);
    return;
  }

  try {
    const tenant = await getSingleTenant();
    const context = { tenantId: tenant.id, userId: null, role: "system" };

    for (const entry of payload.entry ?? []) {
      // eslint-disable-next-line no-await-in-loop -- her olay bir öncekinin sohbet/mesaj kaydına bağımlı olabilir, sıralı işleniyor.
      await processEntry(context, entry);
    }
  } catch (error) {
    logger.error("Instagram webhook işleme hatası: " + error.message);
  }
});

async function processEntry(context, entry) {
  for (const event of entry.messaging ?? []) {
    // `is_echo`: kendi gönderdiğimiz mesajın Meta tarafından bize geri
    // yansıtılmış hali — tekrar kaydetmemek için atlanır.
    if (!event.message || event.message.is_echo) continue;

    const senderId = event.sender?.id;
    if (!senderId) continue;

    // eslint-disable-next-line no-await-in-loop -- ayrıntı: entry başına genelde tek bir olay gelir, sıralı işlemek yeterli.
    const profile = await fetchInstagramProfile(senderId);
    // eslint-disable-next-line no-await-in-loop
    const conversation = await findOrCreateConversation(context, { channel: "instagram", externalUserId: senderId, profile });

    // eslint-disable-next-line no-await-in-loop
    await createInboundMessage(context, conversation.id, {
      text: event.message.text ?? "",
      attachments: (event.message.attachments ?? []).map((attachment) => ({
        type: attachment.type,
        url: attachment.payload?.url ?? null,
      })),
      externalMessageId: event.message.mid ?? null,
      senderId,
    });
  }
}
