// server/migrations/1699999999999_create-tenants-table.js
//
// Bu uygulama TEK-KİRACILI (single-tenant) olarak paketlenip her müşteriye
// AYRI, bağımsız bir deployment (kendi sunucusu, kendi bu veritabanı, kendi
// R2 bucket'ı) olarak satılıyor — bkz. proje kararı. `tenants` tablosu
// YİNE DE var, çünkü bu ofisin GERÇEK iş verisini (adı, Instagram/WhatsApp
// bağlantıları, otomasyon ayarları, rol izin override'ları) tutuyor; sadece
// bu tabloda BİR satır olacak. Firestore'daki merkezi projenin ARTIK
// gerçekten var olmayan bir amacı vardı (hangi tenant'ın verisi HANGİ
// veritabanında/bucket'ta — bkz. eski migrations/control-plane/, kaldırıldı):
// tek-kiracılı bir deploymentta "hangi veritabanı" sorusu yok, veritabanı
// zaten `DATABASE_URL` ile sabit — bu yüzden o eski `postgres`/`r2`
// (şifreli bağlantı bilgisi) sütunları burada YOK, R2 credential'ları artık
// düz env değişkenleri (bkz. src/db/storage.client.js).

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE tenants (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      slug             TEXT NOT NULL UNIQUE,
      owner_user_id    TEXT,
      phone            TEXT,
      tax_number       TEXT,

      plan             JSONB NOT NULL DEFAULT '{"name":"trial","limits":{"users":5,"properties":100,"storageMb":5000}}',
      usage            JSONB NOT NULL DEFAULT '{"users":1,"properties":0,"storageBytes":0}',
      status           TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled')),
      trial_ends_at    TIMESTAMPTZ,

      -- Meta entegrasyonları (Instagram/WhatsApp/Facebook) — bu ofisin
      -- kendi bağlantıları, encryptToken ile şifreli token içeriyor (bkz.
      -- utils/crypto.util.js, TOKEN_ENCRYPTION_KEY).
      instagram        JSONB,
      whatsapp         JSONB,
      facebook_page    JSONB,

      role_permissions JSONB,
      automations      JSONB,

      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at       TIMESTAMPTZ,
      created_by       TEXT,
      updated_by       TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_tenants_active ON tenants (slug) WHERE deleted_at IS NULL;`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS tenants;`);
}
