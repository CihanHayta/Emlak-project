// server/src/services/whatsapp.service.js
//
// Meta WhatsApp Cloud API ile mesajlaşma. instagram.service.js ile aynı
// desen: her tenant kendi WhatsApp hattını Embedded Signup ile bağlar (bkz.
// whatsappOAuth.service.js) — bu yüzden gönderim fonksiyonu `accessToken`'ı
// PARAMETRE olarak alır, global bir env token'ına bakmaz. İmza doğrulama ve
// webhook handshake (WHATSAPP_APP_SECRET/WHATSAPP_VERIFY_TOKEN) ise TEK bir
// Meta App'e ait, platform-seviyesinde paylaşılan sırlar (Instagram'daki
// INSTAGRAM_APP_SECRET ile aynı mantık).
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_BASE = `https://graph.facebook.com/${env.metaGraphApiVersion}`;

/** `GET /webhooks/whatsapp` doğrulama el sıkışması — bkz. instagram.service.js#verifyWebhookChallenge, aynı desen. */
export function verifyWebhookChallenge(query) {
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === env.whatsapp.verifyToken) {
    return query["hub.challenge"];
  }
  return null;
}

/** `X-Hub-Signature-256` doğrulaması — bkz. instagram.service.js#verifyWebhookSignature, aynı desen, ayrı App Secret. */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !env.whatsapp.appSecret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", env.whatsapp.appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Bir telefon numarasına metin mesajı gönderir. "24 saatlik müşteri hizmeti
 * penceresi" kuralı burada DEĞİL, çağıran katmanda kontrol edilir (bkz.
 * message.service.js#sendOutboundMessage) — Instagram'la aynı kural, aynı yer.
 * `accessToken`: tenant'ın Embedded Signup ile bağladığı hattın token'ı.
 */
export async function sendWhatsappMessage(phoneNumberId, to, text, accessToken) {
  if (!accessToken) {
    throw ApiError.upstream("Bu ofis için WhatsApp hattı bağlı değil.");
  }
  const url = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "WhatsApp mesajı gönderilemedi.");
  }
  return body;
}
