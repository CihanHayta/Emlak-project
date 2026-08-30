# INSTALL.md — Yeni Müşteri Kurulumu

> Senaryo: Bu projeyi ikinci (üçüncü, ...) bir emlak firmasına satıyorsunuz.
> Mimari gerekçeler için `ARCHITECTURE.md`, güvenlik detayları için
> `SECURITY.md`, deploy sonrası kontrol için `CHECKLIST.md`'ye bakın.

## Mimari Özet

Bu proje **TEK-KİRACILI** — her müşteri kendi TAMAMEN AYRI, bağımsız
deployment'ına sahip:

- Kendi Railway backend servisi (kendi `DATABASE_URL`'i, kendi `R2_*`
  credential'ları, kendi kimlik doğrulama tablosu).
- Kendi Postgres veritabanı (başka hiçbir müşteriyle paylaşılmaz).
- Kendi Cloudflare R2 bucket'ı.
- Kendi Vercel frontend deployment'ı (kendi domaini/markası).

**Paylaşılan hiçbir şey yok** — her satış tam anlamıyla sıfırdan bir
kurulum. (Meta App/webhook konusu da her müşteride ayrı: kendi Instagram/
WhatsApp Business hesabını kendi admin panelinden, Ayarlar → Entegrasyonlar
üzerinden OAuth ile bağlar — bkz. Adım 6.)

## Adım 1 — Postgres Veritabanı

Yeni bir Postgres veritabanı açın (Railway'in kendi Postgres eklentisi en
basiti — "New" → "Database" → "Add PostgreSQL"). Bağlantı dizesini
(`DATABASE_URL`) not edin.

## Adım 2 — Cloudflare R2 Bucket'ı

1. Cloudflare Dashboard → R2 → **Create bucket** (bucket adını not edin).
2. Bucket → Settings → "S3 API" → endpoint URL'ini not edin
   (`https://<accountId>.r2.cloudflarestorage.com`).
3. R2 → "Manage R2 API Tokens" → **Create API Token** — Object Read &
   Write, **sadece bu bucket'a** kapsamlı (least privilege). Access Key
   ID + Secret Access Key'i not edin (Secret SADECE burada gösterilir).
4. (Opsiyonel ama önerilir) Bucket → Settings → Public access → bir
   `r2.dev` public URL'i ya da kendi custom domaininizi bağlayın — bunu
   `R2_PUBLIC_URL` olarak kullanacaksınız (boş bırakılırsa uygulama
   `getSignedUrl` ile geçici imzalı linkler üretir, daha yavaş ama çalışır).

## Adım 3 — Backend'i Deploy Edin (Railway)

Yeni bir Railway projesi/servisi açın, bu repodaki `server/` klasörünü
deploy edin, `server/.env.example`'daki TÜM değişkenleri Railway'in
environment variable panelinden doldurun:

- `NODE_ENV=production`, `PORT` (Railway kendi atar, genelde dokunmaya
  gerek yok), `INTEGRATIONS_MODE`, `CORS_ORIGINS` (henüz frontend domaini
  yoksa geçici bir değer, Adım 5'te güncellenecek).
- `DATABASE_URL` (Adım 1), `STORAGE_MODE=live`, `R2_*` (Adım 2).
- `INTEGRATIONS_MODE=live` olacaksa: `INSTAGRAM_*`/`WHATSAPP_*`/
  `TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32` ile üretin)/
  `PUBLIC_BACKEND_URL`/`FRONTEND_URL`.

Deploy sonrası şemayı uygulayın:
```bash
DATABASE_URL=<Adım 1'deki bağlantı dizesi> npm run db:migrate
```
(Railway'in "Run command" özelliğinden ya da yerel makinenizden
`DATABASE_URL`'i geçici olarak export edip çalıştırabilirsiniz.)

## Adım 4 — Owner Hesabını Oluşturun

```bash
DATABASE_URL=<Adım 1'deki bağlantı dizesi> \
  node scripts/bootstrap-owner.js sahibi@kartalemlak.com GucluBirSifre123 "Kartal Emlak" "Sahibinin Adı Soyadı"
```

Bu script:
1. Yeni bir `tenants` satırı açar (ekrana basılan **tenant id**'yi not
   edin — Adım 5'te `VITE_TENANT_ID`'ye yazılacak).
2. Şifreyi bcrypt ile hash'leyip owner'ın `users` satırını oluşturur.

> Not: aynı e-postayla **tekrar** çalıştırırsanız yeni bir hesap AÇMAZ —
> mevcut hesabın şifresini SIFIRLAR (owner kendi şifresini unutursa
> kullanılacak yol budur, bkz. `SECURITY.md`).

## Adım 5 — Yeni Vercel Projesi (Müşterinin Kendi Domaini/Markası)

Kök dizinden yeni bir Vercel projesi açın (Vite otomatik algılanır):

| Değişken | Değer |
|---|---|
| `VITE_API_URL` | `/api/v1` (production'da — `vercel.json` bunu Railway backend'ine proxy'ler, bkz. `.env.example`'daki cross-origin-cookie notu) |
| `VITE_TENANT_ID` | Adım 4'te üretilen tenant id |
| `VITE_WHATSAPP_APP_ID`/`VITE_WHATSAPP_CONFIG_ID` | Sadece WhatsApp Embedded Signup kullanılacaksa |

`vercel.json` (SPA rewrite + backend proxy) zaten repoda, dokunmanıza
gerek yok — ama proxy'nin hedef Railway adresini bu yeni backend'e
işaret edecek şekilde güncelleyin.

## Adım 6 — Backend'de CORS

Backend'in `CORS_ORIGINS`'ine yeni Vercel domainini ekleyip (virgülle
ayırarak) backend'i yeniden deploy edin.

## Adım 7 — Marka/Görsel Özelleştirme

Bunlar `.env`'den DEĞİL kod içinden okunur, yeni müşterinin markasına göre
elle değiştirip **bu deployment'a özel** commit/deploy edilmesi gerekir:

| Dosya | Ne değişir |
|---|---|
| `src/config/siteConfig.js` | İşletme adı, telefon, adres, WhatsApp, sosyal linkler |
| `index.html` | Sayfa başlığı, meta açıklama |
| `public/favicon.svg` | Favicon |
| `src/styles/tokens.css` | `--brand-navy`/`--brand-gold` marka renkleri |

## Adım 8 — Instagram/WhatsApp

Müşteri kendi admin panelinden giriş yapıp Ayarlar → Entegrasyonlar →
**"Instagram Hesabını Bağla"** / **"WhatsApp Hattını Bağla"** der — kendi
Meta hesabıyla OAuth akışını tamamlar, sizin hiçbir ek işleminize gerek
kalmaz.

## Adım 9 — Doğrulama

`CHECKLIST.md`'deki tüm maddeleri işaretleyin. En azından: gerçek bir
tarayıcıdan anasayfa, ilan detay sayfası, admin girişi (owner şifresiyle)
ve bir CRUD işlemi (örn. müşteri oluşturma, fotoğraf yükleme) test
edilmeden "kurulum tamam" denmemeli.
