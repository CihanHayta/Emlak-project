/**
 * Client-side file storage for uploaded listing photos/videos.
 *
 * There's no backend/object storage yet, and localStorage is both too
 * small (~5-10MB) and string-only — useless for actual image/video
 * bytes. IndexedDB has a much larger quota and stores Blobs natively, so
 * uploaded files are kept here instead, referenced from a listing by a
 * small "idb:<uuid>" string (see toMediaRef/isMediaRef/fromMediaRef)
 * rather than embedding the file itself in the listing record.
 *
 * A listing's `image`/`images`/`videoUrl` fields can hold EITHER a real
 * URL (the public site's existing Unsplash-based sample listings) OR one
 * of these "idb:" references (freshly uploaded files) — resolve whichever
 * you get with lib/useResolvedMediaUrl.js, which handles both transparently.
 *
 * Lives under the shared src/lib/ (not admin/lib/) because both the admin
 * panel (uploading) and the public site (displaying an admin-created
 * listing's photos) need to resolve these references.
 */
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
