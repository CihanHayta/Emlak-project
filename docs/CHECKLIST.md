# CHECKLIST.md — Deployment Öncesi Kontrol Listesi

## Firebase Console

- [ ] Firebase projesi **Blaze** planda mı? (bkz. `SECURITY.md` → Billing)
- [ ] Authentication → Email/Password açık mı?
- [ ] Firestore → **Native mode**'da oluşturuldu mu?
- [ ] Storage → açık mı, bucket adı `.env`'deki (`FIREBASE_STORAGE_BUCKET`
      / `VITE_FIREBASE_STORAGE_BUCKET`) ile birebir aynı mı?
- [ ] `firestore.rules` + `storage.rules` yayınlandı mı? Doğrulama:
      tarayıcıdan doğrudan bir `getDocs()`/`uploadBytes()` denemesi
      `permission-denied` vermeli (bkz. `SECURITY.md`).
- [ ] Firestore Backups (Daily + Weekly) açık mı? (bkz. `BACKUP.md`)

## Environment Variables

- [ ] `server/.env`'deki TÜM zorunlu değişkenler dolu mu (`NODE_ENV`,
      `PORT`, `FIREBASE_MODE`, `INTEGRATIONS_MODE`, `CORS_ORIGINS`, ve
      `FIREBASE_MODE=live` iken `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/
      `FIREBASE_PRIVATE_KEY`/`FIREBASE_STORAGE_BUCKET`)?
- [ ] Kök `.env`'deki `VITE_API_URL`, `VITE_TENANT_ID`, `VITE_FIREBASE_*`
      dolu ve doğru mu?
- [ ] `CORS_ORIGINS` gerçek frontend adresini içeriyor mu? (Deploy
      sonrası **tekrar** kontrol edin — adres platform tarafından
      değişebilir.)
- [ ] `NODE_ENV=production` set edildi mi? (Cookie `secure`/`sameSite`
      davranışı buna bağlı — bkz. `SECURITY.md`.)

## Kimlik / Kullanıcılar

- [ ] `bootstrap-owner.js` çalıştırıldı mı, en az bir gerçek owner hesabı
      var mı?
- [ ] Owner ile gerçek bir giriş denendi mi (şifre + oturum çerezi
      birlikte çalışıyor mu)?

## Frontend / Routing

- [ ] SPA rewrite kuralı var mı (`vercel.json` ya da eşdeğeri) — direkt
      `/satilik`, `/admin/login` gibi adreslere **hard-refresh** ile
      girildiğinde 404 vermiyor mu? (Bu proje sürecinde tam olarak bu
      hata yaşandı, sadece anasayfa çalışıp diğer her route 404
      veriyordu.)

## Uçtan Uca Fonksiyonel Test

- [ ] Anasayfa gerçek ilan verisiyle yükleniyor mu?
- [ ] Satılık/Kiralık sayfaları filtreleme + sıralama ile çalışıyor mu?
- [ ] İlan detay sayfası doğrudan bir linkle (hard navigation) açılıyor mu?
- [ ] Admin girişi (doğru rol sekmesiyle) çalışıyor mu, dashboard gerçek
      veriyle yükleniyor mu?
- [ ] En az bir CRUD işlemi uçtan uca denendi mi (örn. müşteri oluşturma,
      randevu oluşturma/silme, ilan oluşturma + gerçek fotoğraf yükleme)?
- [ ] Fotoğraf/video yükleme gerçekten Storage'a gidiyor mu (URL
      `storage.googleapis.com` ile başlıyor mu)?
- [ ] Bir ilan silindiğinde Storage'daki dosyaları da gerçekten siliniyor mu?

## Kod / Depo

- [ ] `git status` temiz mi, tüm değişiklikler commit edildi mi?
- [ ] Hiçbir `.env`/servis hesabı JSON'u git'e girmemiş mi?
      (`git ls-files | grep -i env` sadece `.env.example` dosyalarını
      göstermeli.)
- [ ] `npm run lint` (hem kök hem `server/`) hatasız geçiyor mu?

## Operasyonel

- [ ] Rate limit ayarları (`server/src/config/constants.js#RATE_LIMITS`)
      beklenen production trafiğine uygun mu?
- [ ] Backend health endpoint'i (`/api/v1/health`) canlı adresten yanıt
      veriyor mu?
