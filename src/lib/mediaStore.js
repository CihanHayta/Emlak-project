/**
 * Client-side file storage for uploaded listing photos/videos.
 *
 * `uploadMediaFile` (the one MediaUploadField.jsx actually calls now) POSTs
 * the file to the backend (server/, see src/routes/upload.routes.js), which
 * stores it in Firebase Storage — or, until that's configured
 * (FIREBASE_MODE=mock), on the backend's own disk — and returns a real,
 * publicly-loadable URL. That URL is what gets saved on the listing
 * directly, no indirection needed.
 *
 * The IndexedDB-based functions below (putMediaFile/getMediaBlob/
 * toMediaRef/isMediaRef/fromMediaRef) are kept ONLY so listings created
 * before this change (whose `image`/`images`/`videoUrl` still hold an
 * "idb:<uuid>" reference) keep resolving — see lib/useResolvedMediaUrl.js,
 * which tries an idb: lookup first and falls back to treating the value as
 * a plain URL otherwise. IndexedDB storage never left the visiting
 * browser, so anything still using it is invisible to anyone on another
 * device — don't reintroduce it for new uploads.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

/** Uploads a File to the backend and returns its public URL. Throws on failure — caller shows the error. */
export async function uploadMediaFile(file, kind) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/uploads/${kind}`, { method: "POST", credentials: "include", body: formData });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? `Yükleme başarısız oldu (HTTP ${response.status}).`);
  }
  return body.data.url;
}
const DB_NAME = "sahin-admin-media";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Stores a File/Blob and returns its new id. */
export async function putMediaFile(file) {
  const db = await openDB();
  const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, blob: file, name: file.name, type: file.type });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

/** Reads back the raw Blob for an id (or null if it's gone). */
export async function getMediaBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMediaFile(id) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const MEDIA_REF_PREFIX = "idb:";
export const isMediaRef = (value) => typeof value === "string" && value.startsWith(MEDIA_REF_PREFIX);
export const toMediaRef = (id) => `${MEDIA_REF_PREFIX}${id}`;
export const fromMediaRef = (ref) => ref.slice(MEDIA_REF_PREFIX.length);
