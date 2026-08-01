// server/src/firebase/mock/storage.mock.js
//
// Gerçek Firebase Storage'ın "sahte" hâli — ama tamamen uydurma değil:
// dosyayı GERÇEKTEN sunucunun diskine yazar (server/.mock-uploads/) ve
// app.js'in servis ettiği bir URL döner. Böylece Firebase Storage kurulana
// kadar da fotoğraf/video yükleme uçtan uca gerçekten çalışır — sadece
// "bulutta değil, bu sunucuda" durur. FIREBASE_MODE=live'a geçince aynı
// arayüzü (upload/deleteFile/getSignedUrl) storage.client.js gerçek
// Firebase Storage ile karşılar, hiçbir üst katman kodu değişmez.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MOCK_UPLOADS_ROOT = path.resolve(__dirname, "../../../.mock-uploads");

async function upload(buffer, storagePath) {
  const fullPath = path.join(MOCK_UPLOADS_ROOT, storagePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { url: `http://localhost:${env.port}/mock-uploads/${storagePath}`, storagePath };
}

async function deleteFile(storagePath) {
  const fullPath = path.join(MOCK_UPLOADS_ROOT, storagePath);
  await fs.rm(fullPath, { force: true });
}

async function getSignedUrl(storagePath) {
  // Mock modda "imzalı URL" kavramı yok — dosya zaten doğrudan servis
  // ediliyor, aynı public URL'i döneriz.
  return `http://localhost:${env.port}/mock-uploads/${storagePath}`;
}

export const mockStorage = { upload, deleteFile, getSignedUrl };
