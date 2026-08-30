// server/src/db/migrate.js
//
// Tek veritabanı, tek migration seti — node-pg-migrate'in programatik
// API'si (`runner()`), CLI değil, çünkü provizyon/test script'lerinin
// migration'ı DOĞRUDAN çağırması (ayrı bir shell komutu çalıştırmadan)
// daha basit. `migrations/` dizinindeki her dosya sırayla uygulanır,
// hedef veritabanının kendi `pgmigrations` tablosunda hangi migration'ların
// uygulandığı izlenir (tekrar çalıştırmak no-op'tur).
import { runner } from "node-pg-migrate";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

export async function migrateDatabase(databaseUrl = process.env.DATABASE_URL, { verbose = true } = {}) {
  if (!databaseUrl) throw new Error("migrateDatabase: DATABASE_URL ayarlanmamış.");
  return runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: "up",
    migrationsTable: "pgmigrations",
    verbose,
  });
}
