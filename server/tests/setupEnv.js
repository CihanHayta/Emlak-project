// server/tests/setupEnv.js
//
// Jest'in `setupFiles`i — her test dosyasının kendi importları çalışmadan
// ÖNCE, config/env.js hangi env değişkenlerini okuyacaksa onları burada
// hazırlıyoruz. FIREBASE_MODE=mock sayesinde testler gerçek Firestore'a
// hiç dokunmadan, bellek içi sahte veritabanıyla (firebase/mock/firestore.mock.js)
// çalışır — hızlı ve deterministik.
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.FIREBASE_MODE = "mock";
process.env.INTEGRATIONS_MODE = "mock";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
