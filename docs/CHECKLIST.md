# CHECKLIST.md — Deployment Öncesi Kontrol Listesi

## Altyapı (Postgres + R2)

- [ ] Production `DATABASE_URL`'e `npm run db:migrate` çalıştırıldı mı —
      şema (tüm tablolar + son migration'lar) güncel mi?
- [ ] R2 bucket'ı oluşturuldu mu, `.env`'deki `R2_BUCKET_NAME`/`R2_ENDPOINT`/
      `R2_ACCOUNT_ID` ile birebir eşleşiyor mu?
- [ ] `STORAGE_MODE=live` set edildi mi (production'da `mock` KALMAMALI)?
- [ ] R2 API token'ı **least-privilege** mi (sadece ilgili bucket'a Object
      Read & Write, bkz. `.env.example`)?

## Environment Variables

- [ ] `server/.env`'deki TÜM zorunlu değişkenler dolu mu (`NODE_ENV`,
      `PORT`, `INTEGRATIONS_MODE`, `CORS_ORIGINS`, `DATABASE_URL`,
      `STORAGE_MODE`, ve `STORAGE_MODE=live` iken `R2_*`)?
- [ ] Kök `.env`'deki `VITE_API_URL`, `VITE_TENANT_ID` dolu ve doğru mu?
- [ ] `CORS_ORIGINS` gerçek frontend adresini içeriyor mu? (Deploy
      sonrası **tekrar** kontrol edin — adres platform tarafından
      değişebilir.)
- [ ] `NODE_ENV=production` set edildi mi? (Cookie `secure`/`sameSite`
      davranışı buna bağlı — bkz. `SECURITY.md`.)
- [ ] `FIREBASE_*`/`VITE_FIREBASE_*`/`VITE_AUTH_MODE` env değişkenleri
      artık **hiç kullanılmıyor** — Railway/Vercel panellerinde kalmış
      olabilirler, zararı yok ama temizlemek isterseniz silebilirsiniz.

## Kimlik / Kullanıcılar

- [ ] `bootstrap-owner.js` çalıştırıldı mı, en az bir gerçek owner hesabı
      var mı (`node scripts/bootstrap-owner.js <email> <şifre>`)?
- [ ] Owner ile gerçek bir giriş denendi mi (şifre + oturum çerezi
      birlikte çalışıyor mu)?
- [ ] En az bir Danışman/Personel hesabı Ayarlar sayfasından oluşturulup
      onunla da giriş denendi mi?

## Frontend / Routing

- [ ] SPA rewrite kuralı var mı (`vercel.json` ya da eşdeğeri) — direkt
      `/satilik`, `/admin/login` gibi adreslere **hard-refresh** ile
      girildiğinde 404 vermiyor mu?

## Uçtan Uca Fonksiyonel Test

- [ ] Anasayfa gerçek ilan verisiyle yükleniyor mu?
- [ ] Satılık/Kiralık sayfaları filtreleme + sıralama ile çalışıyor mu?
- [ ] İlan detay sayfası doğrudan bir linkle (hard navigation) açılıyor mu?
- [ ] Admin girişi (doğru rol sekmesiyle) çalışıyor mu, dashboard gerçek
      veriyle yükleniyor mu? Yanlış şifreyle deneme doğru hata mesajını
      gösteriyor mu?
- [ ] Çıkış yapınca gerçekten oturum bitiyor mu (çıkış sonrası korumalı
      bir sayfaya gidince login'e yönlendiriyor mu)?
- [ ] En az bir CRUD işlemi uçtan uca denendi mi (örn. müşteri oluşturma,
      randevu oluşturma/silme, ilan oluşturma + gerçek fotoğraf yükleme)?
- [ ] Fotoğraf/video yükleme gerçekten R2'ye gidiyor mu (dönen URL
      `R2_PUBLIC_URL`'inizle başlıyor mu)?
- [ ] Bir ilan/araç silindiğinde R2'deki medya dosyaları da gerçekten
      siliniyor mu?

## Kod / Depo

- [ ] `git status` temiz mi, tüm değişiklikler commit edildi mi?
- [ ] Hiçbir gerçek `.env` dosyası git'e girmemiş mi?
      (`git ls-files | grep -i env` sadece `.env.example` dosyalarını
      göstermeli — onlar gerçek secret İÇERMEZ.)
- [ ] `npm run lint` (hem kök hem `server/`) hatasız geçiyor mu?
- [ ] `npm test` (kök) ve `npm test` + `npm run test:postgres` (server/)
      geçiyor mu?

## Operasyonel

- [ ] Rate limit ayarları (`server/src/config/constants.js#RATE_LIMITS`)
      beklenen production trafiğine uygun mu?
- [ ] Backend health endpoint'leri canlı adresten yanıt veriyor mu —
      `/api/v1/health` VE `/api/v1/health/ready` (ikincisi gerçek bir
      Postgres sorgusu çalıştırır, DB düşükse 503 döner)?
- [ ] Postgres backup stratejisi kuruldu mu (bkz. `BACKUP.md`)?
