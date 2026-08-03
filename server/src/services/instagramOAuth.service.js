// server/src/services/instagramOAuth.service.js
//
// "Instagram API with Instagram Login" akışı — Facebook Page bağlama YOK,
// kullanıcı doğrudan kendi Instagram Business/Creator hesabıyla giriş yapıp
// TEK bir Meta App'imize (INSTAGRAM_APP_ID/APP_SECRET) yetki veriyor. Her
// tenant kendi token'ını alır, instagram.service.js#sendInstagramMessage vb.
// bu token'ı parametre olarak kullanır (artık global bir token yok).
//
// NOT: Aşağıdaki endpoint/scope isimleri (instagram.com/oauth/authorize,
// api.instagram.com/oauth/access_token, graph.instagram.com'daki
// ig_exchange_token/ig_refresh_token) Meta'nın "Instagram API with
// Instagram Login" dokümantasyonundaki güncel haliyle canlıya almadan ÖNCE
// teyit edilmeli — Meta bunları zaman zaman değiştiriyor.
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const SHORT_LIVED_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = `https://graph.instagram.com/${env.metaGraphApiVersion}`;

// DM okuma/gönderme için gereken minimum kapsam. `instagram_business_basic`
// profil bilgisi (kullanıcı adı, id) için, `instagram_business_manage_messages`
// DM'leri okuyup göndermek için gerekiyor.
const OAUTH_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"];

const STATE_TTL_MS = 15 * 60 * 1000; // OAuth el sıkışması birkaç dakikada tamamlanır — 15dk cömert bir üst sınır.

function assertConfigured() {
  if (!env.instagram.appId || !env.instagram.appSecret || !env.publicBackendUrl) {
    throw ApiError.upstream("Instagram OAuth henüz yapılandırılmamış (INSTAGRAM_APP_ID/APP_SECRET/PUBLIC_BACKEND_URL eksik).");
  }
}

function redirectUri() {
  return `${env.publicBackendUrl}/api/v1/instagram/oauth/callback`;
}

/**
 * `state` parametresi: CSRF koruması + "bu callback hangi tenant için"
 * bilgisini oturum/cookie'ye güvenmeden taşımak için — Meta'nın
 * instagram.com üzerinden yaptığı yönlendirme bazı tarayıcılarda first-party
 * cookie context'ini garantilemeyebilir, bu yüzden tenantId cookie'den değil
 * imzalı state'ten okunuyor.
 */
function signState(tenantId) {
  const payload = `${tenantId}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", env.instagram.appSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

function verifyState(state) {
  let decoded;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw ApiError.validation("Geçersiz state parametresi.");
  }

  const lastDot = decoded.lastIndexOf(".");
  const payload = decoded.slice(0, lastDot);
  const signature = decoded.slice(lastDot + 1);
  const [tenantId, issuedAtRaw] = payload.split(".");
  const issuedAt = Number(issuedAtRaw);

  const expected = crypto.createHmac("sha256", env.instagram.appSecret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);
  const validSignature = expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);

  if (!tenantId || !Number.isFinite(issuedAt) || !validSignature) {
    throw ApiError.validation("Geçersiz veya bozulmuş state parametresi.");
  }
  if (Date.now() - issuedAt > STATE_TTL_MS) {
    throw ApiError.validation("Instagram bağlantı isteğinin süresi doldu, lütfen tekrar deneyin.");
  }
  return tenantId;
}

/** Ayarlar sayfasındaki "Instagram Hesabını Bağla" butonunun gittiği URL. */
export function buildAuthorizeUrl(tenantId) {
  assertConfigured();
  const params = new URLSearchParams({
    client_id: env.instagram.appId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: OAUTH_SCOPES.join(","),
    state: signState(tenantId),
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * OAuth callback'te çağrılır: `code`'u önce kısa ömürlü, sonra uzun ömürlü
 * (~60 gün) token'a çevirir, hesap bilgisini çeker. Döner: tenantId + tenant
 * doc'una yazılacak `instagram` alanı (henüz şifrelenmemiş access token ile —
 * şifreleme çağıran katmanda, controller'da yapılır, bu servis kripto
 * bilmez).
 */
export async function exchangeCodeForConnection(code, state) {
  assertConfigured();
  const tenantId = verifyState(state);

  const shortLivedRes = await fetch(SHORT_LIVED_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.instagram.appId,
      client_secret: env.instagram.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      code,
    }),
  });
  const shortLivedBody = await shortLivedRes.json().catch(() => null);
  if (!shortLivedRes.ok || !shortLivedBody?.access_token) {
    throw ApiError.upstream(shortLivedBody?.error_message || "Instagram yetkilendirme kodu değiştirilemedi.");
  }

  const exchangeUrl = `${GRAPH_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env.instagram.appSecret)}&access_token=${encodeURIComponent(shortLivedBody.access_token)}`;
  const longLivedRes = await fetch(exchangeUrl);
  const longLivedBody = await longLivedRes.json().catch(() => null);
  if (!longLivedRes.ok || !longLivedBody?.access_token) {
    throw ApiError.upstream(longLivedBody?.error?.message || "Uzun ömürlü Instagram token'ı alınamadı.");
  }

  const profileRes = await fetch(`${GRAPH_BASE}/me?fields=user_id,username&access_token=${encodeURIComponent(longLivedBody.access_token)}`);
  const profileBody = await profileRes.json().catch(() => null);
  if (!profileRes.ok || !profileBody?.user_id) {
    throw ApiError.upstream(profileBody?.error?.message || "Instagram hesap bilgisi alınamadı.");
  }

  return {
    tenantId,
    accessToken: longLivedBody.access_token,
    expiresInSeconds: longLivedBody.expires_in,
    accountId: String(profileBody.user_id),
    username: profileBody.username ?? null,
  };
}

/** Token yenileme işi (bkz. jobs/instagramTokenRefresh.job.js) tarafından çağrılır. */
export async function refreshLongLivedToken(accessToken) {
  const url = `${GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) {
    throw ApiError.upstream(body?.error?.message || "Instagram token'ı yenilenemedi.");
  }
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}
