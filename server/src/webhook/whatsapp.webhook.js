// server/src/webhook/whatsapp.webhook.js
//
// instagram.webhook.js ile aynı güvenlik/response deseni (imza doğrulama,
// hemen 200, işleme arka planda) — ama payload ŞEKLİ FARKLI: WhatsApp Cloud
// API `entry[].messaging[]` değil `entry[].changes[].value.messages[]`
// kullanır, ve mesaj gönderenin adı/telefonu payload'ın içinde geldiği için
// (Instagram'daki gibi ayrı bir "profil çek" API çağrısına gerek yok).
//
// BİLİNEN SORUN (2026-08-03 teşhis edildi, çözülmedi): Meta'nın ücretsiz
// "test numarası" (Business Verification öncesi sandbox) ile gönderilen
// webhook'ların imzası, INSTAGRAM_APP_SECRET ile aynı olan WHATSAPP_APP_SECRET
// kullanılarak doğrulanamıyor — Instagram'da AYNI secret sorunsuz çalışıyor,
// yani kod/secret doğru, sorun muhtemelen test-numarası sandbox'ına özgü bir
// Meta davranışı. Gerçek bir numara Business Verification sonrası bağlanınca
// tekrar test edilmeli.
import { Router } from "express";
import express from "express";
import { verifyWebhookChallenge, verifyWebhookSignature } from "../services/whatsapp.service.js";
import { getTenantByWhatsappWabaId } from "../services/tenant.service.js";
import { findOrCreateConversation } from "../services/conversation.service.js";
import { createInboundMessage } from "../services/message.service.js";
import { logger } from "../config/logger.js";

export const whatsappWebhookRouter = Router();

/** Meta'nın webhook'u Dashboard'da kaydederken yaptığı tek seferlik doğrulama el sıkışması — bkz. instagram.webhook.js, aynı desen. */
whatsappWebhookRouter.get("/", (req, res) => {
  const challenge = verifyWebhookChallenge(req.query);
  if (challenge) return res.status(200).send(challenge);
  res.sendStatus(403);
});

whatsappWebhookRouter.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-Hub-Signature-256");
  if (!verifyWebhookSignature(req.body, signature)) {
    logger.warn("WhatsApp webhook: geçersiz imza, istek reddedildi.");
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    logger.error("WhatsApp webhook: gövde JSON olarak ayrıştırılamadı — " + error.message);
    return;
  }

  try {
    for (const entry of payload.entry ?? []) {
      // eslint-disable-next-line no-await-in-loop -- entry'ler sırayla işleniyor.
      await processEntry(entry);
    }
  } catch (error) {
    logger.error("WhatsApp webhook işleme hatası: " + error.message);
  }
});

/** `entry.id`: bu mesajı alan WhatsApp Business Account'un (WABA) id'si — bkz. tenant.repository.js#findTenantByWhatsappWabaId. */
async function processEntry(entry) {
  const tenant = await getTenantByWhatsappWabaId(entry.id);
  if (!tenant) {
    logger.warn(`WhatsApp webhook: WABA id=${entry.id} için bağlı bir tenant bulunamadı, olay atlandı.`);
    return;
  }
  const context = { tenantId: tenant.id, userId: null, role: "system" };

  for (const change of entry.changes ?? []) {
    // `value.statuses` (gönderdiğimiz mesajın sent/delivered/read durumu)
    // gibi mesaj-dışı değişiklikler bilerek atlanıyor — sadece gerçekten
    // gelen (`value.messages`) yeni mesajlar işleniyor.
    if (!change.value?.messages) continue;

    const contact = change.value.contacts?.[0];

    for (const message of change.value.messages) {
      const senderId = message.from;
      if (!senderId) continue;

      const profile = contact ? { name: contact.profile?.name ?? null, username: null, profile_pic: null } : null;
      // eslint-disable-next-line no-await-in-loop -- entry başına genelde tek mesaj gelir, sıralı işlemek yeterli.
      const conversation = await findOrCreateConversation(context, { channel: "whatsapp", externalUserId: senderId, profile });

      // Şimdilik sadece metin desteklenir — resim/ses/belge gibi medya
      // türlerinde WhatsApp URL'i doğrudan vermiyor, ayrı bir `GET
      // /{media-id}` çağrısıyla geçici bir indirme linki almak gerekiyor
      // (bkz. plan — v1 kapsamı dışı bırakıldı, sonraki adım).
      // eslint-disable-next-line no-await-in-loop
      await createInboundMessage(context, conversation.id, {
        text: message.type === "text" ? (message.text?.body ?? "") : "",
        attachments: [],
        externalMessageId: message.id ?? null,
        senderId,
      });
      logger.info(`WhatsApp webhook: yeni mesaj kaydedildi (tenant=${tenant.id}, conversation=${conversation.id}).`);
    }
  }
}
