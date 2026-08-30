// server/src/services/instagram.service.js
//
// Meta Graph API ile Instagram DM entegrasyonu. Her tenant kendi Instagram
// hesabını OAuth ile bağlar (bkz. instagramOAuth.service.js) — bu yüzden
// gönderim/profil çekme fonksiyonları `accessToken`'ı PARAMETRE olarak
// alır, global bir env token'ına bakmaz. Çağıran katman (message.service.js,
// webhook) tenant'ın kayıtlı (şifrelenmiş) token'ını çözüp buraya geçirir.
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// "Instagram API with Instagram Login" token'ları (IGAA... ile başlar) SADECE
// graph.instagram.com üzerinde çalışır — graph.facebook.com'a atılan aynı
// istek "Cannot parse access token" hatası döner (canlı testte doğrulandı).
const GRAPH_BASE = `https://graph.instagram.com/${env.metaGraphApiVersion}`;

// whatsapp.service.js#SEND_TIMEOUT_MS ile aynı gerekçe — giden istekte
// önceden hiç timeout yoktu, Meta API'si yanıt vermezse "Gönderiliyor…"
// süresiz asılı kalabiliyordu (2026-08-13'te QA'da bulundu).
const SEND_TIMEOUT_MS = 15000;

/**
 * `GET /webhooks/instagram` doğrulama el sıkışması — Meta, webhook'u App
 * Dashboard'da kaydederken bunu çağırır. `hub.verify_token` bizim
 * belirlediğimiz (Dashboard'a da girilen) gizli bir metinle eşleşiyorsa
 * `hub.challenge`'ı olduğu gibi geri döneriz, Meta da webhook'u onaylar.
 */
export function verifyWebhookChallenge(query) {
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === env.instagram.verifyToken) {
    return query["hub.challenge"];
  }
  return null;
}

/**
 * `POST /webhooks/instagram` gövdesinin gerçekten Meta'dan geldiğini
 * doğrular — `X-Hub-Signature-256` header'ı, App Secret ile HAM (henüz
 * JSON'a parse edilmemiş) body üzerinden hesaplanan HMAC-SHA256 ile
 * eşleşmeli. Bu olmadan, webhook URL'ini bilen HERKES sahte "yeni mesaj"
 * olayları gönderip sahte veriler yazdırabilir.
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !env.instagram.appSecret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", env.instagram.appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Bir Instagram kullanıcısına (IGSID) metin mesajı gönderir. Meta'nın
 * "24 saatlik mesajlaşma penceresi" kuralı burada DEĞİL, çağıran katmanda
 * (message.service.js#sendOutboundMessage) kontrol edilir — bu fonksiyon
 * sadece Graph API çağrısının kendisinden sorumlu. `accessToken`: tenant'ın
 * kendi bağladığı Instagram hesabının token'ı (bkz. instagramOAuth.service.js).
 */
export async function sendInstagramMessage(recipientId, text, accessToken) {
  if (!accessToken) {
    throw ApiError.upstream("Bu ofis için Instagram hesabı bağlı değil.");
  }
  const url = `${GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(accessToken)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw ApiError.upstream("Instagram mesajı gönderilemedi — sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.");
    }
    throw ApiError.upstream("Instagram mesajı gönderilemedi — bağlantı hatası. Lütfen tekrar deneyin.");
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "Instagram mesajı gönderilemedi.");
  }
  return body;
}

/** Gönderenin profil bilgisini (ad, kullanıcı adı, avatar) çeker — sohbet listesinde göstermek için. Başarısız olursa null döner, akışı durdurmaz. */
export async function fetchInstagramProfile(userId, accessToken) {
  if (!accessToken) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const url = `${GRAPH_BASE}/${userId}?fields=name,username,profile_pic&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
