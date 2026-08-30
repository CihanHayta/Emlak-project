// server/jest.postgres.config.js
//
// jest.config.js'ten AYRI, sadece `npm run test:postgres` ile çalışır.
// tests/postgres/ altındaki testler GERÇEK bir yerel PostgreSQL'e bağlanır
// (bkz. tests/postgres/setupEnv.js#TEST_TENANT_DATABASE_URL) — bu yüzden
// normal `npm test`'ten (jest.config.js) bilerek dışlandılar.
export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/postgres/setupEnv.js"],
  testMatch: ["<rootDir>/tests/postgres/**/*.test.js"],
  watchman: false,
  // Tüm test dosyaları AYNI fiziksel test veritabanını paylaşıyor (bkz.
  // pgTestDb.js) ve her biri kendi beforeEach'inde TRUNCATE çalıştırıyor —
  // Jest varsayılan olarak dosyaları PARALEL worker'larda çalıştırdığı için
  // bu, bir dosyanın TRUNCATE'i başka bir dosyanın o an ürettiği satırları
  // silmesine (flaky/yanlış-negatif testlere) yol açıyordu. maxWorkers:1
  // bunu kökten çözüyor — normal `npm test` (Firestore mock, veritabanı
  // paylaşımı yok) için gerekmiyor, sadece burada.
  maxWorkers: 1,
};
