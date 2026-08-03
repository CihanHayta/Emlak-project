/**
 * Shared fetch wrapper for talking to server/ — every *Store.js module that
 * has been migrated off localStorage goes through this instead of repeating
 * the same fetch/credentials/error-envelope boilerplate.
 *
 * `credentials: "include"` is what lets the browser send the httpOnly
 * session cookie (set by POST /auth/session, see admin/lib/auth.js) on
 * every request — without it every one of these calls would come back 401
 * even right after logging in.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `İstek başarısız oldu (HTTP ${response.status}).`);
  }
  return payload.data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
