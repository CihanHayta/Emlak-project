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

// Backend'in FIREBASE_MODE=mock'una karşılık gelen frontend anahtarı —
// gerçek bir Firebase projesi hiç kurulmadan (VITE_FIREBASE_* boş) uçtan
// uca test edebilmek için. Açık bir opt-in (varsayılan "live" davranış):
// yanlışlıkla boş bırakılan bir VITE_FIREBASE_API_KEY'in sessizce mock
// girişe düşmesini istemiyoruz — backend zaten kendi tarafında
// FIREBASE_MODE !== "mock" ise /auth/mock-token'ı reddediyor (bkz.
// auth.controller.js#createMockTokenController), bu sadece frontend'in
// hangi akışı DENEYECEĞİNİ seçiyor.
const isMockAuth = import.meta.env.VITE_AUTH_MODE === "mock";

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
// `/auth/me`'dir. Firebase'in kendi client-side oturum durumunu (`firebaseUser`)
// BİLEREK yok sayıyoruz: Firebase'in kendi persistence'ı (IndexedDB) her
// sayfa yenilemesinde güvenilir şekilde geri gelmeyebilir (ör. Safari
// gizli sekme, bazı tarayıcı ayarları, ya da sadece zamanlama) — eskiden
// `!firebaseUser` durumunda hiç `/auth/me` çağrılmadan direkt çıkış
// yapılıyordu, bu da backend cookie'si hâlâ geçerliyken (1-14 gün) bile
// her yenilemede yeniden şifre istenmesine yol açıyordu (canlıda
// yakalandı). apiClient.js zaten HİÇBİR istekte Firebase idToken'ı
// kullanmıyor, sadece cookie'yi (credentials: "include") — yani bu kontrol
// gerçekten gereksizdi.
onAuthStateChanged(firebaseAuth, async () => {
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

/**
 * callback'i hemen mevcut durumla, sonra her değişiklikte çağırır — AMA
 * SADECE kontrol GERÇEKTEN sonuçlanmışsa (`initialized === true`) hemen
 * çağırır. Canlıda yakalanan ciddi bir yarış durumu: `onAuthStateChanged`
 * (yukarıda) asenkron olduğu için, bir bileşen mount olup buraya abone
 * olduğunda kontrol HENÜZ bitmemiş olabilir — eskiden bu durumda bile
 * `callback(currentSession)` (o an hâlâ `null`) HEMEN çağrılıyordu,
 * RequireAuth/Login bunu "kontrol bitti, giriş yapılmamış" sanıp ANINDA
 * login'e yönlendiriyordu. Birkaç yüz milisaniye sonra GERÇEK kontrol
 * (fetchMe) sonuçlanıp `setSession` çağrılınca da bu sefer panele geri
 * yönlendiriyordu — kullanıcı ekranda "login ekranı → beyaz an → panel"
 * diye bir yanıp sönme görüyordu. Artık kontrol bitmemişse HİÇ erken
 * çağrılmıyor, bileşen kendi `useState(isAuthInitialized())` başlangıç
 * değeriyle (false) bekliyor, gerçek sonuç gelince TEK SEFERDE haber
 * alıyor.
 */
export function subscribeToAuthState(callback) {
  listeners.add(callback);
  if (initialized) callback(currentSession);
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
    // Mock modda gerçek bir Firebase oturumu hiç kurulmamış olabilir (bkz.
    // mockLogin) — signOut'un başarısız olması asıl hatayı (aşağıdaki throw)
    // gizlemesin diye yutuluyor.
    await signOut(firebaseAuth).catch(() => {});
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
/** Mock modda: gerçek Firebase client SDK'sı yerine backend'in mock-only `/auth/mock-token`'ından bir idToken alır — gerisi (establishSession) TAMAMEN aynı akış. */
async function mockLogin(email, password) {
  const response = await fetch(`${API_URL}/auth/mock-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "Giriş başarısız oldu.");
  return body.data.idToken;
}

export async function login(email, password, rememberMe = false) {
  const idToken = isMockAuth
    ? await mockLogin(email, password)
    : await signInWithEmailAndPassword(firebaseAuth, email, password).then((credential) => credential.user.getIdToken());
  return establishSession(idToken, rememberMe);
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  // Mock modda firebaseAuth'un hiçbir zaman gerçek bir oturumu olmadı
  // (login hiç signInWithEmailAndPassword çağırmadı) — signOut() zaten
  // no-op olmalı ama boş/geçersiz bir Firebase config'e karşı savunmacı
  // davranmak için hatayı yutuyoruz, backend cookie'si (asıl kaynak)
  // yukarıda zaten temizlendi.
  await signOut(firebaseAuth).catch(() => {});
  setSession(null);
}
