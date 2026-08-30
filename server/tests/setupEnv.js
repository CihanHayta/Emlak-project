// server/tests/setupEnv.js
//
// Jest'in `setupFiles`i — her test dosyasının kendi importları çalışmadan
// ÖNCE, config/env.js hangi env değişkenlerini okuyacaksa onları burada
// hazırlıyoruz. Bu dosya SADECE tests/postgres/ DIŞINDAKİ (gerçek Postgres
// gerektirmeyen, repository'leri jest.mock ile sahteleyen) birim testleri
// için — FIREBASE_MODE=mock sayesinde Auth da gerçek Firebase'e hiç
// dokunmadan, bellek içi sahte auth ile (firebase/mock/auth.mock.js) çalışır.
// Gerçek Postgres'e bağlanan uçtan uca testler tests/postgres/setupEnv.js
// kullanır (bkz. jest.postgres.config.js).
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.FIREBASE_MODE = "mock";
process.env.INTEGRATIONS_MODE = "mock";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
