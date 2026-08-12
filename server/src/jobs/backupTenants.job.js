// server/src/jobs/backupTenants.job.js
//
// Her tenant'ın verisi kendi Firebase projesinde yaşıyor ve sürekli
// güncelleniyor — ama bu bir YEDEK değil: tenant'ın Google/Blaze hesabında
// bir sorun olursa (ödeme, yanlışlıkla silme, hesabın askıya alınması) o
// canlı veri de kaybolur. Bu iş günde bir kere her tenant'ın hem
// Firestore'unu (ilan/müşteri/randevu METNİ) hem de Storage'ını (ilan
// FOTOĞRAF/VİDEOLARI — Firestore'da tutulmaz, ayrı bir sistemdir) okuyup
// BİZİM merkezi projemizin Storage'ına yazar. İkisi de gerekli: sadece
// Firestore yedeklenip Storage kaybolursa, ilan kaydı kurtulur ama
// fotoğrafsız/videosuz kalır — pratikte işe yaramaz. Tenant'ın kendi
// projesi tamamen erişilemez hale gelse bile GEÇMİŞTEKİ HER GÜNÜN verisi
// bizde durur. Eski yedekler OTOMATİK SİLİNMEZ (randevu/müşteri gibi
// veriler için "2 ay önceki hali lazım" ihtimaline karşı bilinçli tercih).
//
// Storage (fotoğraf/video) tarafı Firestore kadar sık değişmediğinden ve
// dosya indirip yeniden yüklemek (metin yedeklemesine göre) daha maliyetli
// olduğundan HAFTADA BİR (bkz. STORAGE_BACKUP_WEEKDAY_ISTANBUL) çalışır —
// Firestore yine HER GECE yedeklenir. Çalıştığında da SADECE YENİ dosyaları
// kopyalar (bkz. backupTenantStorage) — her dosya upload.service.js'te
// randomUUID() ile üretiliyor, yani bir path'in içeriği ASLA değişmiyor;
// bir kere yedeklenen dosya bir daha asla tekrar kopyalanmaya gerek duymaz.
// İlk kurulumda (bkz. startTenantBackupJob) haftayı beklemeden HEMEN bir
// Storage yedeği de alınır, sonrasında haftalık ritme döner.
//
// Zamanlama: her gece 02:00'de (Türkiye saati) çalışacak şekilde
// SABİTLENMİŞ — `setInterval(24h)` KULLANILMADI çünkü o "sunucu ne zaman
// ayağa kalktıysa o saatten 24 saat sonra" demek olurdu; Railway'de her
// deploy/restart bu saati kaydırırdı. Bunun yerine her çalıştıktan sonra
// bir sonraki 02:00'ye kaç ms kaldığını yeniden hesaplayıp kendini
// zamanlıyor (bkz. scheduleNextBackup) — hiç sapma birikmez. Ayrıca
// process ayağa kalkar kalkmaz BİR KERE hemen de çalışır (bkz.
// startTenantBackupJob) — sunucu saatlerce kapalı kalıp yeniden başlarsa
// veri uzun süre yedeksiz kalmasın diye.
import { getTenantsWithFirebaseConnected } from "../services/tenant.service.js";
import { getTenantFirestore } from "../firebase/firestore.client.js";
import { logger } from "../config/logger.js";

const BACKUP_HOUR_ISTANBUL = 2; // gece 02:00
// Türkiye 2016'dan beri yaz saati uygulaması yapmıyor, sabit UTC+3 — bu
// yüzden Intl/timezone kütüphanesi gerekmeden basit bir ofsetle hesaplanabilir.
const ISTANBUL_UTC_OFFSET_HOURS = 3;
// 0=Pazar, 1=Pazartesi, ... — Storage yedeği sadece bu güne denk gelen gece
// 02:00'de çalışır (Firestore her gece çalışmaya devam eder). Pazartesi
// seçildi, özel bir sebebi yok — herhangi bir gün olabilirdi.
const STORAGE_BACKUP_WEEKDAY_ISTANBUL = 1;
// `tenants` koleksiyonunun kendisi burada YOK — o zaten merkezi projede,
// ayrıca korunuyor. Sadece tenant'ların kendi iş verisi yedekleniyor.
const COLLECTIONS_TO_BACKUP = [
  "properties",
  "customers",
  "appointments",
  "leads",
  "funnels",
  "conversations",
  "messages",
  "users",
];

/** Firestore Timestamp'lerini (`{_seconds,_nanoseconds}` yerine) okunabilir ISO string'e çevirir. */
function serializable(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serializable(val)]));
  }
  return value;
}

async function exportTenantData(tenantId) {
  const db = await getTenantFirestore(tenantId);
  const snapshot = {};
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    // eslint-disable-next-line no-await-in-loop -- tenant başına sıralı koleksiyon okuma; günde bir kere tetiklenen bir iş için paralelleştirmeye değmez.
    const querySnapshot = await db.collection(collectionName).get();
    snapshot[collectionName] = querySnapshot.docs.map((doc) => serializable({ id: doc.id, ...doc.data() }));
  }
  return snapshot;
}

const STORAGE_BACKUP_PREFIX = "storage-backups"; // Firestore JSON'ları "backups/" altında, dosyalar ayrı bir kökte — karışmasın diye.

/** Merkezi bucket'ta bu tenant için ZATEN yedeklenmiş dosya yollarının (path) kümesi. */
async function listAlreadyBackedUpPaths(centralBucket, tenantId) {
  const prefix = `${STORAGE_BACKUP_PREFIX}/${tenantId}/`;
  const [files] = await centralBucket.getFiles({ prefix });
  return new Set(files.map((file) => file.name.slice(prefix.length)));
}

/** Saf mantık (I/O yok) — hangi dosyaların HENÜZ yedeklenmediğini bulur, bkz. testler. */
export function filesNeedingBackup(tenantFileNames, alreadyBackedUpPaths) {
  return tenantFileNames.filter((name) => !alreadyBackedUpPaths.has(name));
}

/**
 * Bazı tenant'lar (özellikle SaaS pivotundan ÖNCEKİ tek işletme kurulumu)
 * kendi Firebase projesi olarak MERKEZİ projeyi kullanıyor — yani
 * `tenantBucket` ve `centralBucket` fiilen AYNI GCS bucket'ı. Bu durumda
 * prefix'siz `tenantBucket.getFiles()` kendi ürettiğimiz `storage-backups/`
 * ve `backups/` çıktısını da "yedeklenmesi gereken yeni dosya" sanıp onu da
 * tekrar `storage-backups/{tenantId}/` altına kopyalıyordu — her çalıştığında
 * kendi yedeğinin üstüne bir kat daha `storage-backups/{tenantId}/` ekleyip
 * path'i büyütüyordu, ta ki GCS'in 1024 karakter obje adı sınırını aşıp
 * hata verene kadar (canlıda 2026-08-12'de yakalandı). Bu iki kök klasörü
 * kaynak listesinden dışlamak, aynı bucket paylaşılsa bile sorunu kökten
 * çözüyor — ayrı bucket'ı olan tenant'larda bu isimler zaten hiç yok, yani
 * filtre onlar için no-op.
 */
export function isBackupOutputPath(name) {
  return name.startsWith(`${STORAGE_BACKUP_PREFIX}/`) || name.startsWith("backups/");
}

export async function backupTenantStorage(tenantId, centralBucket, getTenantStorageBucket) {
  const tenantBucket = await getTenantStorageBucket(tenantId);
  const alreadyBackedUpPaths = await listAlreadyBackedUpPaths(centralBucket, tenantId);
  const [tenantFiles] = await tenantBucket.getFiles();
  const tenantFileNames = tenantFiles.map((file) => file.name).filter((name) => !isBackupOutputPath(name));
  const toBackup = filesNeedingBackup(tenantFileNames, alreadyBackedUpPaths);

  let copiedBytes = 0;
  for (const fileName of toBackup) {
    const sourceFile = tenantBucket.file(fileName);
    // eslint-disable-next-line no-await-in-loop -- dosya başına sıralı indir/yükle; sadece YENİ dosyalar için çalışıyor (bkz. filesNeedingBackup), günde bir kere tetiklenen bir iş için paralelleştirmeye değmez.
    const [metadata] = await sourceFile.getMetadata();
    // eslint-disable-next-line no-await-in-loop
    const [buffer] = await sourceFile.download();
    // eslint-disable-next-line no-await-in-loop
    await centralBucket
      .file(`${STORAGE_BACKUP_PREFIX}/${tenantId}/${fileName}`)
      .save(buffer, { contentType: metadata.contentType, resumable: false });
    copiedBytes += buffer.length;
  }

  return { copied: toBackup.length, totalFiles: tenantFiles.length, copiedBytes };
}

/** Saf mantık (I/O yok) — şu an Storage yedeğinin çalışması gereken gün mü? bkz. testler. */
function isScheduledStorageBackupDay(now = new Date()) {
  const istanbulNow = new Date(now.getTime() + ISTANBUL_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return istanbulNow.getUTCDay() === STORAGE_BACKUP_WEEKDAY_ISTANBUL;
}

async function backupAllTenants({ forceStorageBackup = false } = {}) {
  const { getCentralStorageBucket, getTenantStorageBucket } = await import("../firebase/admin.js");
  const bucket = getCentralStorageBucket();
  const tenants = await getTenantsWithFirebaseConnected();
  const dateStamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const shouldBackupStorage = forceStorageBackup || isScheduledStorageBackupDay();

  for (const tenant of tenants) {
    try {
      // eslint-disable-next-line no-await-in-loop -- tenant başına bağımsız yedekleme; diğerini bekletmesi günde bir kere tetiklenen bir iş için sorun değil.
      const data = await exportTenantData(tenant.id);
      const json = JSON.stringify(data);
      const file = bucket.file(`backups/${tenant.id}/${dateStamp}.json`);
      // eslint-disable-next-line no-await-in-loop
      await file.save(json, { contentType: "application/json", resumable: false });
      logger.info(`Tenant Firestore yedeklendi: ${tenant.id} (${json.length} byte)`);

      if (shouldBackupStorage) {
        // eslint-disable-next-line no-await-in-loop
        const storageResult = await backupTenantStorage(tenant.id, bucket, getTenantStorageBucket);
        logger.info(
          `Tenant Storage yedeklendi: ${tenant.id} — ${storageResult.copied}/${storageResult.totalFiles} yeni dosya (${storageResult.copiedBytes} byte)`,
        );
      }
    } catch (error) {
      // Bir tenant'ın yedeklemesi başarısız olursa diğerlerini etkilemesin.
      logger.error(`Tenant yedekleme hatası: tenant=${tenant.id} — ${error.message}`);
    }
  }
}

/** Şu andan, bir sonraki 02:00 (Türkiye saati)'ye kaç ms kaldığını hesaplar. */
function msUntilNextBackupTime() {
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      BACKUP_HOUR_ISTANBUL - ISTANBUL_UTC_OFFSET_HOURS,
      0,
      0,
      0,
    ),
  );
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - now.getTime();
}

function scheduleNextBackup() {
  setTimeout(() => {
    backupAllTenants()
      .catch((error) => logger.error("Yedekleme işi hatası: " + error.message))
      .finally(scheduleNextBackup);
  }, msUntilNextBackupTime()).unref();
}

export function startTenantBackupJob() {
  // Deploy/restart anında hemen bir yedek al (Storage dahil — haftayı
  // beklemeden ilk kurulumda hemen korumaya alınsın diye) — sunucu gece
  // 02:00'den uzun süre kapalı kalmışsa veri yedeksiz beklemesin.
  backupAllTenants({ forceStorageBackup: true }).catch((error) => logger.error("Yedekleme işi başlatılamadı: " + error.message));
  scheduleNextBackup();
}
