// server/src/services/instagram.service.js
//
// Meta Graph API ile Instagram DM entegrasyonu. Tek tenant/tek Instagram
// hesabı varsayımıyla (bkz. docs/ARCHITECTURE.md) basit tutuldu — Page
// Access Token tek bir env değişkeninde (`INSTAGRAM_ACCESS_TOKEN`),
// kişi/tenant bazlı bir OAuth "hesabını bağla" akışı YOK (bilerek —
// tek kiracılı kurulumda gereksiz karmaşıklık).
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// "Instagram API with Instagram Login" token'ları (IGAA... ile başlar) SADECE
// graph.instagram.com üzerinde çalışır — graph.facebook.com'a atılan aynı
// istek "Cannot parse access token" hatası döner (canlı testte doğrulandı).
const GRAPH_BASE = `https://graph.instagram.com/${env.metaGraphApiVersion}`;

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
 * sadece Graph API çağrısının kendisinden sorumlu.
 */
export async function sendInstagramMessage(recipientId, text) {
  if (!env.instagram.accessToken) {
    throw ApiError.upstream("Instagram bağlantısı henüz yapılandırılmamış (INSTAGRAM_ACCESS_TOKEN eksik).");
  }
  const url = `${GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(env.instagram.accessToken)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "Instagram mesajı gönderilemedi.");
  }
  return body;
}

/** Gönderenin profil bilgisini (ad, kullanıcı adı, avatar) çeker — sohbet listesinde göstermek için. Başarısız olursa null döner, akışı durdurmaz. */
export async function fetchInstagramProfile(userId) {
  if (!env.instagram.accessToken) return null;
  try {
    const url = `${GRAPH_BASE}/${userId}?fields=name,username,profile_pic&access_token=${encodeURIComponent(env.instagram.accessToken)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
