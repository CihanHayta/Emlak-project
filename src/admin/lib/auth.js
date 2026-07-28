/**
 * Mock admin authentication.
 *
 * There's no backend yet, so this is intentionally NOT real security — it
 * just gates the /admin/* routes behind a login screen so the panel feels
 * like a real product instead of being wide open. Demo credentials:
 * kullanıcı adı "admin", şifre "1234". Once a real backend exists, replace
 * `login()` with an actual API call + a signed session token; nothing that
 * imports this module (RequireAuth, Topbar's user menu) needs to change shape.
 */
const SESSION_KEY = "sahin-admin-session";
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "1234";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getSession() !== null;
}

/** Returns the session on success, or `null` if the credentials are wrong. */
export function login(username, password) {
  if (username.trim().toLowerCase() !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
    return null;
  }
  const session = { username: DEMO_USERNAME, name: "Admin", role: "Admin", loggedInAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
