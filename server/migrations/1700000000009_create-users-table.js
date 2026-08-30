// server/migrations/tenant/1700000000009_create-users-table.js
//
// user.model.js ile birebir aynı. `id` = Firebase Auth `uid` (Auth bu
// migrasyonun kapsamı dışında, Aşama 12'de ayrıca ele alınacak — bkz.
// docs/ARCHITECTURE.md) — otomatik üretilmez, dışarıdan (Auth'tan) gelir.
// user.repository.js#hardDelete'in kendi yorumu: kullanıcı hesapları
// SOFT-DELETE DEĞİL, gerçek (hard) delete kullanıyor çünkü Firebase Auth
// hesabı da her zaman aynı anda tamamen siliniyor — bu yüzden burada
// `deleted_at` yok, diğer tüm tenant tablolarından FARKLI olarak.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE users (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL,
      email          TEXT NOT NULL,
      phone          TEXT,
      display_name   TEXT,
      photo_url      TEXT,
      role           TEXT NOT NULL CHECK (role IN ('owner','agent','assistant')),
      permissions    TEXT[] NOT NULL DEFAULT '{}',
      status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','passive')),
      last_login_at  BIGINT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by     TEXT,
      updated_by     TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_users_tenant ON users (tenant_id);`);
  pgm.sql(`CREATE INDEX idx_users_email ON users (email);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS users;`);
}
