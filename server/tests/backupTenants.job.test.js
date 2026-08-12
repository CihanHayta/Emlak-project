// server/tests/backupTenants.job.test.js
import { filesNeedingBackup, isBackupOutputPath, backupTenantStorage } from "../src/jobs/backupTenants.job.js";

describe("backupTenants.job — filesNeedingBackup", () => {
  it("zaten yedeklenmiş dosyaları hariç tutar", () => {
    const result = filesNeedingBackup(["a.jpg", "b.jpg", "c.jpg"], new Set(["a.jpg"]));
    expect(result).toEqual(["b.jpg", "c.jpg"]);
  });

  it("hiçbiri yedeklenmemişse hepsini döner", () => {
    expect(filesNeedingBackup(["a.jpg"], new Set())).toEqual(["a.jpg"]);
  });
});

describe("backupTenants.job — isBackupOutputPath", () => {
  it("storage-backups/ ve backups/ altındaki yolları kendi çıktımız olarak tanır", () => {
    expect(isBackupOutputPath("storage-backups/tenant1/tenants/tenant1/photo.jpg")).toBe(true);
    expect(isBackupOutputPath("backups/tenant1/2026-08-12.json")).toBe(true);
  });

  it("gerçek tenant içeriğini (fotoğraf/video) çıktı olarak İŞARETLEMEZ", () => {
    expect(isBackupOutputPath("tenants/tenant1/properties/photo.jpg")).toBe(false);
    expect(isBackupOutputPath("tenants/tenant1/avatars/x.jpg")).toBe(false);
  });
});

/**
 * Sahte bucket: `getFiles`/`file().save()` davranışını taklit eden, isim ->
 * içerik haritalı basit bir Map. Aynı obje hem "tenant" hem "central" bucket
 * olarak geçirilerek, canlıda yakalanan "tenant'ın kendi Firebase projesi
 * merkezi projeyle aynı" senaryosu birebir simüle ediliyor.
 */
function createFakeBucket(initialFiles = []) {
  const store = new Map(initialFiles.map((f) => [f.name, f]));
  return {
    store,
    async getFiles(opts = {}) {
      const prefix = opts.prefix ?? "";
      const files = [...store.values()]
        .filter((f) => f.name.startsWith(prefix))
        .map((f) => ({
          name: f.name,
          getMetadata: async () => [{ contentType: f.contentType }],
          download: async () => [f.buffer],
        }));
      return [files];
    },
    file(name) {
      return {
        save: async (buffer, opts) => {
          store.set(name, { name, contentType: opts?.contentType, buffer });
        },
        getMetadata: async () => [{ contentType: store.get(name)?.contentType }],
        download: async () => [store.get(name)?.buffer],
      };
    },
  };
}

describe("backupTenants.job — backupTenantStorage (aynı bucket regresyon testi, 2026-08-12 canlı bug)", () => {
  it("tenant ve merkezi bucket AYNI olsa bile kendi yedeğini tekrar yedeklemez (doubled-prefix oluşmaz)", async () => {
    // Senaryo: tenant'ın Firebase projesi merkezi proje ile aynı (tenant
    // "Şahin Emlak" gibi) — bucket = hem tenant hem central. İçinde 1 gerçek
    // fotoğraf VE önceki (sağlıklı) bir çalıştırmadan kalma 1 yedek kopyası var.
    const bucket = createFakeBucket([
      { name: "tenants/T/properties/photo1.jpg", contentType: "image/jpeg", buffer: Buffer.from("foto") },
      { name: "storage-backups/T/tenants/T/properties/photo1.jpg", contentType: "image/jpeg", buffer: Buffer.from("foto") },
      { name: "backups/T/2026-08-11.json", contentType: "application/json", buffer: Buffer.from("{}") },
    ]);
    const getTenantStorageBucket = async () => bucket;

    const result = await backupTenantStorage("T", bucket, getTenantStorageBucket);

    // photo1 zaten yedeklenmiş (stripped path eşleşiyor) — yeniden kopyalanmamalı.
    expect(result.copied).toBe(0);
    // Kritik regresyon kontrolü: "storage-backups/T/storage-backups/..." gibi
    // katmanlanmış bir path OLUŞMAMALI.
    const doubledPrefixKeys = [...bucket.store.keys()].filter((name) => name.startsWith("storage-backups/T/storage-backups/"));
    expect(doubledPrefixKeys).toEqual([]);
    // backups/ (Firestore JSON) klasörü de yedek kaynağı sayılmamalı.
    const backupsFolderCopied = [...bucket.store.keys()].filter((name) => name.startsWith("storage-backups/T/backups/"));
    expect(backupsFolderCopied).toEqual([]);
  });

  it("gerçekten yeni bir dosya varsa (aynı bucket senaryosunda da) doğru şekilde yedeklenir", async () => {
    const bucket = createFakeBucket([
      { name: "tenants/T/properties/photo1.jpg", contentType: "image/jpeg", buffer: Buffer.from("foto") },
      { name: "storage-backups/T/tenants/T/properties/photo1.jpg", contentType: "image/jpeg", buffer: Buffer.from("foto") },
      { name: "tenants/T/properties/photo2.jpg", contentType: "image/jpeg", buffer: Buffer.from("yeni-foto") },
    ]);
    const getTenantStorageBucket = async () => bucket;

    const result = await backupTenantStorage("T", bucket, getTenantStorageBucket);

    expect(result.copied).toBe(1);
    expect(bucket.store.has("storage-backups/T/tenants/T/properties/photo2.jpg")).toBe(true);
  });

  it("iki kez art arda çalıştırılınca (deploy'da olduğu gibi) ikinci çalıştırma hiçbir şey kopyalamaz", async () => {
    const bucket = createFakeBucket([{ name: "tenants/T/properties/photo1.jpg", contentType: "image/jpeg", buffer: Buffer.from("foto") }]);
    const getTenantStorageBucket = async () => bucket;

    const first = await backupTenantStorage("T", bucket, getTenantStorageBucket);
    expect(first.copied).toBe(1);

    const second = await backupTenantStorage("T", bucket, getTenantStorageBucket);
    expect(second.copied).toBe(0);
    const doubledPrefixKeys = [...bucket.store.keys()].filter((name) => name.startsWith("storage-backups/T/storage-backups/"));
    expect(doubledPrefixKeys).toEqual([]);
  });
});
