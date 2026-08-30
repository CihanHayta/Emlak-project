// server/jest.config.js
export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  // tests/postgres/ AYRI bir jest config'le (jest.postgres.config.js,
  // `npm run test:postgres`) çalışıyor çünkü gerçek bir yerel PostgreSQL
  // gerektiriyor — bu, `npm test`'in (ve dolayısıyla CI'ın) Postgres kurulu
  // olmayan hiçbir makinede YENİ bir dış bağımlılık kazanmamasını sağlar.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/postgres/"],
  // Bu makinede kurulu `watchman` binary'si bozuk (eksik bir dylib yüzünden
  // çöküyor ama temiz çıkmıyor, asılı kalıyor) — Jest varsayılan olarak
  // dosya taraması için onu kullanmayı DENER, bu da her `npm test`
  // çalıştırmasının sonsuza kadar takılmasına sebep oluyordu (haftalardır
  // süren "npm test hiç bitmiyor" sorununun kök nedeni buydu). `false`
  // ile Jest'in kendi JS tabanlı dosya tarayıcısına zorluyoruz, watchman'e
  // hiç dokunmuyor.
  watchman: false,
};
