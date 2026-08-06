// server/jest.config.js
export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  // Bu makinede kurulu `watchman` binary'si bozuk (eksik bir dylib yüzünden
  // çöküyor ama temiz çıkmıyor, asılı kalıyor) — Jest varsayılan olarak
  // dosya taraması için onu kullanmayı DENER, bu da her `npm test`
  // çalıştırmasının sonsuza kadar takılmasına sebep oluyordu (haftalardır
  // süren "npm test hiç bitmiyor" sorununun kök nedeni buydu). `false`
  // ile Jest'in kendi JS tabanlı dosya tarayıcısına zorluyoruz, watchman'e
  // hiç dokunmuyor.
  watchman: false,
};
