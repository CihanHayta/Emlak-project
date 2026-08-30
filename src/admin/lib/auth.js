/**
 * Real admin authentication, backed entirely by the backend's own
 * Postgres-native session (httpOnly cookie) — Firebase Authentication
 * kaldırıldı (bkz. server/src/services/auth.service.js). Bu dosya artık
 * hiçbir `firebase/*` import etmiyor, tek gerçek kaynak backend'dir.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

let currentSession = null;
let initialized = false;
const listeners = new Set();

function setSession(next) {
  currentSession = next;
  initialized = true;
  listeners.forEach((callback) => callback(currentSession));
}

async function fetchMe() {
  const response = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (!response.ok) return null;
  const body = await response.json();
  return body.data;
}

function toSession(me) {
  return {
    uid: me.user.id,
    email: me.user.email,
    name: me.user.displayName || me.user.email,
    role: me.user.role,
    tenantId: me.tenant?.id ?? null,
    tenantName: me.tenant?.name ?? null,
  };
}

// Sayfa ilk yüklendiğinde backend'in httpOnly çerezi hâlâ geçerli mi diye
// bir kere kontrol eder (bkz. isAuthInitialized/subscribeToAuthState).
fetchMe().then((me) => setSession(me ? toSession(me) : null));

/** Anlık durumu bilmek yeterliyse bunu kullanın; değişiklikleri dinlemek için subscribeToAuthState. */
export function getSession() {
  return currentSession;
}

export function isLoggedIn() {
  return currentSession !== null;
}

/** İlk oturum kontrolü tamamlandı mı — RequireAuth bu bitene kadar bir yükleniyor ekranı gösterir. */
export function isAuthInitialized() {
  return initialized;
}

/**
 * callback'i hemen mevcut durumla, sonra her değişiklikte çağırır — AMA
 * SADECE kontrol GERÇEKTEN sonuçlanmışsa (`initialized === true`) hemen
 * çağırır. Bileşen mount olduğunda ilk `/auth/me` kontrolü henüz
 * bitmemiş olabilir — bu durumda erken (yanlış "çıkış yapılmış" sanan)
 * bir çağrı yapılmaz, gerçek sonuç gelince TEK SEFERDE haber verilir.
 */
export function subscribeToAuthState(callback) {
  listeners.add(callback);
  if (initialized) callback(currentSession);
  return () => listeners.delete(callback);
}

/**
 * Başarısızlıkta fırlatır (mesajı Login.jsx'in göstereceği hata).
 *
 * `rememberMe`: false ise backend session cookie'yi tarayıcı-oturumluk
 * (maxAge'siz) kurar — tarayıcı tamamen kapanınca oturum biter. true ise
 * izin verilen tavan (varsayılan 14 gün) boyunca kalıcı kalır (bkz.
 * Login.jsx'teki "Beni Hatırla" kutusu).
 */
export async function login(email, password, rememberMe = false) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, rememberMe }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Giriş başarısız oldu.");
  }

  const me = await fetchMe();
  if (!me) throw new Error("Oturum oluşturuldu ama kullanıcı bilgisi alınamadı.");
  setSession(toSession(me));
  return currentSession;
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  setSession(null);
}
