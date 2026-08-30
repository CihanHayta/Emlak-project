// server/src/repositories/customer.postgres.repository.js
//
// customer.repository.js'in (Firestore) PostgreSQL karşılığı — o da hiçbir
// ekstra metod eklemiyor (sadece BaseRepository), burada da aynen öyle.
// `interests`/`tags` gerçek Postgres TEXT[]; `timeline` JSONB (bkz.
// migrations/tenant/..._create-customers-table.js) — bu yüzden
// jsonbColumns: ["timeline"] veriliyor, aksi halde bir JS dizisi doğrudan
// jsonb sütununa yazılmaya çalışılıp tip hatası verirdi.
import { BasePostgresRepository } from "./base.postgres.repository.js";

class CustomerPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("customers", { jsonbColumns: ["timeline"] });
  }
}

export const customerPostgresRepository = new CustomerPostgresRepository();
