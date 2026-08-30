/**
 * Storage servisi — merkezi `firebaseApp`'ten (config.js) türetilir.
 *
 * Bugün hiçbir yerde kullanılmıyor: dosya yükleme tarayıcıdan doğrudan
 * Storage'a değil, backend'in `/api/v1/uploads/*` uçlarına gidiyor (bkz.
 * src/lib/mediaStore.js, server/src/firebase/storage.client.js). Bu dosya
 * sadece yapısal bütünlük için var — backend'deki storage.client.js'in
 * frontend karşılığı.
 */
import { getStorage } from "firebase/storage";
import { firebaseApp } from "./config";

export const storage = getStorage(firebaseApp);
