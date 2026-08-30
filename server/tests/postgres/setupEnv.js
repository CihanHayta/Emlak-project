// server/tests/postgres/setupEnv.js
//
// tests/setupEnv.js'in gerçek-Postgres-gerektiren testler için karşılığı —
// AYNI temel değişkenler + STORAGE_MODE=mock (R2 mock) + TEST_DATABASE_URL
// (verilmezse yerel bir varsayılana düşer, bkz. tests/postgres/pgTestDb.js).
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.INTEGRATIONS_MODE = "mock";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
process.env.STORAGE_MODE = "mock";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || `postgres://${process.env.USER}@localhost:5432/emlak_tenant_test`;
