// server/tests/postgres/pgTestDb.js
//
// Bu testler `src/db/pool.js#getPool`'u (jest.unstable_mockModule ile, bkz.
// property.postgres.repository.test.js) bu TEK paylaşımlı test pool'unu
// döner şekilde taklit ediyor — tek-kiracılı üretim mimarisiyle zaten
// TUTARLI (gerçek uygulama da tek bir pool kullanıyor, bkz. src/db/pool.js).
// IDOR/tenant-satır-izolasyonu testleri hâlâ anlamlı: farklı `tenant_id`
// DEĞERLERİ aynı fiziksel tabloda satır satır ayrışıyor,
// `base.postgres.repository.js`'in `WHERE tenant_id = $2` kanarya kontrolü
// tam olarak bunu koruyor (bu kanarya, tek-kiracılı modelde bile "yanlış
// context.tenantId geçirildi" sınıfı bir kod hatasını erken yakalar).
import pg from "pg";
import { migrateDatabase } from "../../src/db/migrate.js";
import { registerNumericTypeParsers } from "../../src/db/typeParsers.js";

registerNumericTypeParsers();

let pool;
let migrated = false;

export async function getTestPool() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 4 });
  if (!migrated) {
    await migrateDatabase(process.env.TEST_DATABASE_URL, { verbose: false });
    migrated = true;
  }
  return pool;
}

const SCOPED_TABLES = [
  "automation_events",
  "messages",
  "conversations",
  "appointments",
  "leads",
  "customers",
  "property_media",
  "properties",
  "vehicle_media",
  "vehicles",
  "funnels",
  // AŞAMA (Firebase Auth kaldırma): sessions, users'a ON DELETE CASCADE ile
  // bağlı (TRUNCATE ... CASCADE onu zaten boşaltırdı) ama diğer tüm
  // tablolar gibi burada da AÇIKÇA listeleniyor.
  "sessions",
  "users",
  // AŞAMA (File Store kaldırma): tenants artık Postgres'te (bkz.
  // tenant.postgres.repository.js) — diğer tüm tablolar gibi testler arası
  // temizleniyor.
  "tenants",
];

/** Testler arası izolasyon — her tabloyu boşaltır (migration geçmişine dokunmaz). */
export async function truncateAll() {
  const testPool = await getTestPool();
  await testPool.query(`TRUNCATE TABLE ${SCOPED_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export async function closeTestPool() {
  if (!pool) return;
  const closing = pool;
  pool = null;
  migrated = false;
  await closing.end();
}
