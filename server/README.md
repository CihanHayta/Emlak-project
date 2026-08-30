# Emlak CRM — Backend (server/)

Bu klasör, `../src` altındaki frontend'e (React + Vite) hizmet veren ayrı bir Node.js/Express projesidir. Kalıcı veri PostgreSQL'de, dosyalar (fotoğraf/video) Cloudflare R2'de, kimlik doğrulama (şifre hash + oturum çerezi) doğrudan Postgres'te — Firebase'e (Firestore/Storage/Auth) hiçbir bağımlılık yok. Mimari detay için bkz. `../docs/ARCHITECTURE.md`.

## Kurulum (ilk kez)

```bash
cd server
npm install
cp .env.example .env   # sonra .env'i kendi değerlerinizle doldurun
npm run db:migrate     # DATABASE_URL'deki veritabanına migrations/ şemasını uygular
node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]
```

`INTEGRATIONS_MODE=mock` ile (WhatsApp/Instagram'a hiç bağlanmadan) çalışır; `STORAGE_MODE=mock` ile de gerçek bir R2 hesabı olmadan (sunucunun kendi diskine, `.mock-r2/`) dosya yükleyebilirsiniz. Postgres'in kendisi her zaman gerçek — bir "mock veritabanı" yok, yerel geliştirme için de gerçek (yerel) bir Postgres kurulu olmalı.

## Çalıştırma

```bash
cd server
npm run dev
```

Terminalde şunu görmelisiniz:
```
Sunucu ayakta: http://localhost:4000 (STORAGE_MODE=mock, INTEGRATIONS_MODE=mock)
```

Görmüyorsanız: en üstte kırmızı `[env] Uygulama başlatılamadı` yazıyorsa `.env` dosyasında eksik bir alan var demektir — mesajda hangisi olduğu yazar.

## Test etme

Başka bir terminalde:
```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/ready   # Postgres'e gerçekten bağlanabiliyor mu diye SELECT 1 çalıştırır
```
İkisi de `{"success":true,"data":{...}}` dönmeli.

## Lint

```bash
npm run lint
```
Not: bu proje `emlak-web` deposunun içinde yaşıyor ve üst dizinde başka (frontend'e ait, flat-config formatlı) bir `eslint.config.js` var. ESLint 8, komut satırından `ESLINT_USE_FLAT_CONFIG` verilmezse üst dizinlerde flat config dosyası olup olmadığına bakıp onu kullanmaya çalışıyor — `npm run lint` script'i bunu `ESLINT_USE_FLAT_CONFIG=false` ile bastırıp bu klasördeki `.eslintrc.json`'ı zorluyor. `npx eslint .` gibi elle çalıştırırsanız aynı env değişkenini siz eklemelisiniz, yoksa yanlış (üst proje) kurallar uygulanır.

## Klasör açıklaması

| Klasör | Ne işe yarar |
|---|---|
| `src/config/` | Ortam değişkeni (env) doğrulama, sabitler, loglayıcı |
| `src/db/` | Postgres bağlantı havuzu (`pool.js`), migration runner, R2 storage istemcisi (`storage.client.js`) |
| `src/repositories/` | Veritabanı sorguları — her sorgu tenant'a (ofise) kilitli (bkz. `base.postgres.repository.js`) |
| `src/services/` | İş kuralları |
| `src/controllers/` | HTTP isteğini service'e, service sonucunu HTTP yanıtına çevirir |
| `src/routes/` | URL yolları |
| `src/middleware/` | Her istekten geçen ortak kod (kimlik doğrulama, hata yakalama, vb. — "middleware" = zincirleme çalışan ara katman fonksiyonları) |
| `src/utils/` | Küçük yardımcı fonksiyonlar (şifre hash'leme, oturum token'ı, e-posta normalizasyonu dahil) |
| `src/webhook/` | WhatsApp/Instagram/Meta Lead Ads webhook uçları |
| `migrations/` | Postgres şema geçmişi (`node-pg-migrate`) |
| `tests/` | Otomatik testler (`tests/postgres/` gerçek bir yerel Postgres ister, ayrı çalışır — bkz. `jest.postgres.config.js`) |

## env (ortam değişkeni) tablosu

Tam liste ve açıklamalar `.env.example` dosyasında. Özet:

| Değişken | Zorunlu mu | Açıklama |
|---|---|---|
| `NODE_ENV`, `PORT` | Her zaman | Çalışma ortamı, port |
| `INTEGRATIONS_MODE` | Her zaman | `mock` veya `live` (WhatsApp/Instagram) |
| `CORS_ORIGINS` | Her zaman | Hangi adreslerden istek kabul edileceği |
| `DATABASE_URL` | Her zaman | Postgres bağlantı dizesi — iş verisi VE kullanıcı/oturum tabloları burada |
| `STORAGE_MODE` | Her zaman | `mock` (yerel diske yazar) veya `live` (gerçek R2) |
| `R2_*` | Sadece `STORAGE_MODE=live` iken | Cloudflare R2 credential'ları |
| `WHATSAPP_*`, `INSTAGRAM_*`, `TOKEN_ENCRYPTION_KEY` | Sadece `INTEGRATIONS_MODE=live` iken | Meta API bilgileri |

## İlk owner hesabı / şifre sıfırlama

Kendi kendine kayıt akışı yok. `node scripts/bootstrap-owner.js <email> <şifre>` hem ilk owner hesabını (+ tenant satırını) oluşturur, hem de aynı e-postayla tekrar çalıştırıldığında o hesabın şifresini SIFIRLAR — owner kendi şifresini unutursa kullanılacak yol budur (bkz. betiğin kendi başındaki not). Danışman/Personel/Kısıtlı hesapları ve şifreleri owner'ın kendisi, admin panelin Ayarlar sayfasından yönetir.

## Deploy notları

Backend Railway'de, frontend Vercel'de çalışıyor — cross-origin cookie detayları için `docs/SECURITY.md`'ye bakın.
