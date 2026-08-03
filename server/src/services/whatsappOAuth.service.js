// server/src/services/whatsappOAuth.service.js
//
// WhatsApp "Embedded Signup" akışı — Instagram'ın basit sunucu yönlendirmeli
// OAuth'undan farklı: tenant, admin panelde bir POPUP (Facebook JS SDK
// `FB.login()`, bkz. admin/lib/whatsappEmbeddedSignup.js) üzerinden kendi
// WhatsApp Business hesabını bağlar. Popup bize İKİ ayrı bilgi verir:
// - `code`: token'a çevrilecek yetkilendirme kodu (bu dosyanın işi).
// - `wabaId`/`phoneNumberId`: popup'ın `message` event'inden frontend'in
//   doğrudan yakaladığı kimlikler (biz üretmiyoruz, controller'a parametre
//   olarak geliyor).
//
// NOT: Aşağıdaki endpoint'ler ve token ömrü varsayımı, canlıya almadan ÖNCE
// Meta'nın güncel "WhatsApp Embedded Signup" dokümantasyonuyla teyit
// edilmeli — özellikle token'ın süresiz mi yoksa 60 günlük mü olduğu, tech
// provider/System User kurulumuna göre değişebiliyor.
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_BASE = `https://graph.facebook.com/${env.metaGraphApiVersion}`;

function assertConfigured() {
  if (!env.whatsapp.appId || !env.whatsapp.appSecret) {
    throw ApiError.upstream("WhatsApp bağlantısı henüz yapılandırılmamış (WHATSAPP_APP_ID/APP_SECRET eksik).");
  }
}

/**
 * Embedded Signup popup'ından dönen `code`'u access token'a çevirir, WABA'yı
 * bizim Meta App'imize abone eder (aksi halde webhook hiç gelmez — Instagram'da
 * bu OAuth scope'uyla otomatikti, WhatsApp'ta ayrı bir çağrı gerekiyor), ve
 * telefon numarası görünen adını çeker.
 */
export async function exchangeCodeForConnection({ code, wabaId, phoneNumberId }) {
  assertConfigured();

  const tokenUrl = `${GRAPH_BASE}/oauth/access_token?client_id=${encodeURIComponent(env.whatsapp.appId)}&client_secret=${encodeURIComponent(env.whatsapp.appSecret)}&code=${encodeURIComponent(code)}`;
  const tokenRes = await fetch(tokenUrl);
  const tokenBody = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenBody?.access_token) {
    throw ApiError.upstream(tokenBody?.error?.message || "WhatsApp yetkilendirme kodu değiştirilemedi.");
  }
  const accessToken = tokenBody.access_token;

  const subscribeRes = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!subscribeRes.ok) {
    const subscribeBody = await subscribeRes.json().catch(() => null);
    throw ApiError.upstream(subscribeBody?.error?.message || "WhatsApp hesabı webhook'lara abone edilemedi.");
  }

  const phoneRes = await fetch(`${GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number&access_token=${encodeURIComponent(accessToken)}`);
  const phoneBody = await phoneRes.json().catch(() => null);

  return {
    accessToken,
    wabaId,
    phoneNumberId,
    displayPhoneNumber: phoneBody?.display_phone_number ?? null,
    // Meta bu token için ayrı bir `expires_in` döndürmüyor (System User
    // token'ları genelde uzun ömürlü/süresiz) — 60 günlük temkinli bir
    // varsayım kullanıp yenileme işinin en azından süresi yaklaşanları
    // loglamasını sağlıyoruz (bkz. jobs/whatsappTokenRefresh.job.js).
    expiresInSeconds: 60 * 24 * 60 * 60,
  };
}
