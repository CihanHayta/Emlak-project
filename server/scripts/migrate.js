// server/scripts/migrate.js
//
// Veritabanına migrations/ altındaki şemayı uygular. Kullanım:
// DATABASE_URL=postgres://... node scripts/migrate.js
// (ya da server/.env'de tanımlıysa doğrudan `npm run db:migrate`).
import "dotenv/config";
import { migrateDatabase } from "../src/db/migrate.js";

migrateDatabase()
  .then(() => {
    console.log("[migrate] Migrasyonlar uygulandı.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[migrate] Migrasyon başarısız:", error.message);
    process.exit(1);
  });
