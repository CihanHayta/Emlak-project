/**
 * Real admin authentication, backed by Firebase Authentication + the
 * backend's httpOnly session cookie (see server/src/services/auth.service.js).
 *
 * Firebase Auth's own state check is asynchronous (it has to read/restore
 * the persisted session before it knows anything), so — unlike the old
 * localStorage-only mock this replaced — `isLoggedIn()`/`getSession()` can
 * be stale for a brief moment on first load. Anything that needs to *react*
 * to the real state (RequireAuth.jsx) should use `subscribeToAuthState`
 * instead of polling these getters.
 */
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../../firebase/auth";

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

// Backend'in httpOnly cookie'si tarayıcı kapansa da kalıcıdır (bkz.
// SESSION_COOKIE_EXPIRY_DAYS) — bu yüzden gerçek kaynak her zaman
// `/auth/me`'dir; Firebase'in kendi oturum durumu sadece "en azından bir
// idToken üretebiliyor muyum" sinyali olarak kullanılır.
onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
  if (!firebaseUser) {
    setSession(null);
    return;
  }
  const me = await fetchMe();
  if (!me) {
    setSession(null);
    return;
  }
  setSession({
    uid: me.user.id,
    email: me.user.email,
    name: me.user.displayName || me.user.email,
    role: me.user.role,
    tenantId: me.tenant?.id ?? null,
    tenantName: me.tenant?.name ?? null,
  });
});

/** Anlık durumu bilmek yeterliyse bunu kullanın; değişiklikleri dinlemek için subscribeToAuthState. */
export function getSession() {
  return currentSession;
}

export function isLoggedIn() {
  return currentSession !== null;
}

/** Firebase'in ilk oturum kontrolü tamamlandı mı — RequireAuth bu bitene kadar bir yükleniyor ekranı gösterir. */
export function isAuthInitialized() {
  return initialized;
}

/** callback'i hemen mevcut durumla, sonra her değişiklikte çağırır. Unsubscribe fonksiyonu döner. */
export function subscribeToAuthState(callback) {
  listeners.add(callback);
  callback(currentSession);
  return () => listeners.delete(callback);
}

/** POST /auth/session + /auth/me, sonucu currentSession'a yazar. */
async function establishSession(idToken, rememberMe) {
  const response = await fetch(`${API_URL}/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken, rememberMe }),
  });

  if (!response.ok) {
    await signOut(firebaseAuth);
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Giriş başarısız oldu.");
  }

  const me = await fetchMe();
  if (!me) throw new Error("Oturum oluşturuldu ama kullanıcı bilgisi alınamadı.");
  setSession({
    uid: me.user.id,
    email: me.user.email,
    name: me.user.displayName || me.user.email,
    role: me.user.role,
    tenantId: me.tenant?.id ?? null,
    tenantName: me.tenant?.name ?? null,
  });
  return currentSession;
}

/**
 * Başarısızlıkta fırlatır (mesajı Login.jsx'in göstereceği hata) — eski
 * sürümün "null dönerse hata" sözleşmesinden farklı, çünkü artık neden
 * başarısız olduğunu (yanlış şifre mi, ofise bağlı değil mi) ayırt etmemiz
 * gerekiyor.
 *
 * `rememberMe`: false ise backend session cookie'yi tarayıcı-oturumluk
 * (maxAge'siz) kurar — tarayıcı tamamen kapanınca oturum biter. true ise
 * izin verilen tavan (14 gün) boyunca kalıcı kalır (bkz. Login.jsx'teki
 * "Beni Hatırla" kutusu).
 */
export async function login(email, password, rememberMe = false) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const idToken = await credential.user.getIdToken();
  return establishSession(idToken, rememberMe);
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  await signOut(firebaseAuth);
  setSession(null);
}
