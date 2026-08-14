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

// Giden mesaj isteklerinde önceden HİÇ timeout yoktu — Meta API'si yanıt
// vermezse (nadir ama olası: bakım, ağ sorunu) istek native fetch'in kendi
// varsayılanına (dakikalarca) kalıyor, admin panelinde "Gönderiliyor…"
// süresiz asılı kalıyordu (2026-08-13'te QA'da bulundu). 15sn, Meta'nın
// normal yanıt süresinin (genelde <1sn) kat kat üzerinde — bunun üstü
// gerçekten bir upstream sorunu demek.
const SEND_TIMEOUT_MS = 15000;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw ApiError.upstream("WhatsApp mesajı gönderilemedi — sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.");
    }
    throw ApiError.upstream("WhatsApp mesajı gönderilemedi — bağlantı hatası. Lütfen tekrar deneyin.");
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "WhatsApp mesajı gönderilemedi.");
  }
  return body;
}

/**
 * Meta'ya YENİ bir mesaj şablonu gönderir (inceleme/onay için) —
 * `POST /{wabaId}/message_templates`. Sadece Otomasyonlar sayfasından,
 * owner "Şablonu Meta'ya Gönder"e basınca çağrılır. `bodyText` `{{1}}`,
 * `{{2}}` gibi yer tutucular içerir; `exampleValues` Meta'nın incelemesi
 * için her yer tutucuya bir örnek değer verir (zorunlu, yoksa Meta
 * şablonu reddediyor). `category: "UTILITY"` bilerek sabit — bildirim/
 * hatırlatma amaçlı mesajlar için en hızlı onay kategorisi, "MARKETING"
 * çok daha sıkı inceleniyor ve bizim kullanım amacımıza da uymuyor.
 */
export async function submitMessageTemplate(wabaId, accessToken, { name, language, bodyText, exampleValues }) {
  if (!accessToken) throw ApiError.upstream("Bu ofis için WhatsApp hattı bağlı değil.");
  const url = `${GRAPH_BASE}/${wabaId}/message_templates`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name,
        language,
        category: "UTILITY",
        components: [{ type: "BODY", text: bodyText, example: { body_text: [exampleValues] } }],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw ApiError.upstream("Şablon gönderilemedi — Meta zamanında yanıt vermedi. Lütfen tekrar deneyin.");
    throw ApiError.upstream("Şablon gönderilemedi — bağlantı hatası. Lütfen tekrar deneyin.");
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "Şablon gönderilemedi.");
  }
  return body; // { id, status: "PENDING", category }
}

/**
 * Bir şablonun Meta'daki güncel onay durumunu çeker —
 * `GET /{wabaId}/message_templates?name=...`. `name` benzersiz olduğu
 * için (Meta bunu zorunlu kılıyor) tek sonuç bekleniyor.
 */
export async function getTemplateStatus(wabaId, accessToken, name) {
  if (!accessToken) throw ApiError.upstream("Bu ofis için WhatsApp hattı bağlı değil.");
  const url = `${GRAPH_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw ApiError.upstream("Şablon durumu alınamadı — Meta zamanında yanıt vermedi.");
    throw ApiError.upstream("Şablon durumu alınamadı — bağlantı hatası.");
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw ApiError.upstream(body?.error?.message || "Şablon durumu alınamadı.");
  return body?.data?.[0] ?? null; // { id, name, status: "APPROVED"|"PENDING"|"REJECTED", category }
}

/**
 * Onaylı bir ŞABLONLA mesaj gönderir — `sendWhatsappMessage`'ın aksine
 * 24 saatlik pencereye TABİ DEĞİL (Meta'nın proaktif/işletme-başlatan
 * mesajlar için izin verdiği tek yol budur). `parameters` şablondaki
 * `{{1}}`, `{{2}}`... yer tutucularının SIRAYLA karşılıklarıdır.
 */
export async function sendWhatsappTemplateMessage(phoneNumberId, to, templateName, languageCode, parameters, accessToken) {
  if (!accessToken) throw ApiError.upstream("Bu ofis için WhatsApp hattı bağlı değil.");
  const url = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{ type: "body", parameters: parameters.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw ApiError.upstream("WhatsApp şablon mesajı gönderilemedi — sunucu zamanında yanıt vermedi.");
    throw ApiError.upstream("WhatsApp şablon mesajı gönderilemedi — bağlantı hatası.");
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "WhatsApp şablon mesajı gönderilemedi.");
  }
  return body;
}
