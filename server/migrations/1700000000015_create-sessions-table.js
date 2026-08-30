// server/migrations/1700000000015_create-sessions-table.js
//
// AŞAMA (Firebase Auth kaldırma): Firebase'in `createSessionCookie`/
// `verifySessionCookie`/`revokeRefreshTokens`'ının Postgres karşılığı —
// gerçek sunucu-taraflı, geri alınabilir (revocable) oturumlar. Çerezde
// SADECE rastgele, yüksek entropili bir token durur; bu tabloda tutulan
// `token_hash` o token'ın SHA-256'sı — ham token asla diskte/DB'de saklanmaz
// (bkz. utils/session.util.js). `user_id` üzerinde `ON DELETE CASCADE`:
// bir kullanıcı hard-delete edildiğinde (bkz. user.postgres.repository.js
// #hardDelete) oturumları da otomatik temizlenir, ayrı bir silme adımına
// gerek yok. `deleted_at` YOK — diğer tenant tablolarından farklı, çünkü
// oturumların "soft-delete" kavramı yok: ya geçerli (revoked_at IS NULL VE
// expires_at henüz geçmemiş) ya değil.
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id   TEXT NOT NULL,
      token_hash  TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ NOT NULL,
      revoked_at  TIMESTAMPTZ
    );
  `);

  pgm.sql(`CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions (token_hash);`);
  pgm.sql(`CREATE INDEX idx_sessions_user ON sessions (user_id);`);
  // Süresi geçmiş/iptal edilmiş oturumları periyodik temizlemek isteyen
  // ileride bir bakım job'u yazarsa diye (bkz. docs/BACKUP.md) — şu an
  // hiçbir kod bunu kullanmıyor, sadece ucuz bir index.
  pgm.sql(`CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS sessions;`);
}
