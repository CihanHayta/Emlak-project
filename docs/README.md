# Şahin Emlak CRM — Doküman İndeksi

> **İş modeli (her kararın temeli):** Bu proje çok kiracılı bir SaaS
> DEĞİL. **Tek kiracılı** bir üründür — bir müşteriye bir deployment: kendi
> sunucusu (Railway), kendi PostgreSQL veritabanı, kendi R2 bucket'ı. Kod
> tabanı aynı kalır, değişen sadece `server/.env`/`.env` içindeki değerler.
> Firebase'e (Firestore/Storage/Authentication) hiçbir bağımlılık yok —
> veri Postgres'te, dosyalar R2'de, kimlik doğrulama (bcrypt + oturum
> çerezi) doğrudan Postgres'te.

Bu klasördeki her dosya, projeyi hiç bilmeyen bir geliştiricinin (ya da
6 ay sonra geri dönen sizin) tek başına anlayıp yeni bir müşteriye
kurabilmesi için, kod doğrudan okunarak yazıldı.

| Dosya | Ne anlatır | Ne zaman bakılır |
|---|---|---|
| [`HISTORY.md`](./HISTORY.md) | Proje sıfırdan hangi sırayla kuruldu, her adım neden o sırada yapıldı | Projenin "hikayesini" anlamak için |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Genel mimari, katmanlar, veri akışı, roller, bilinen eksikler | Kod yazmaya başlamadan önce |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Postgres tabloları, sütunlar, ilişkiler, index'ler; R2 object key yapısı, upload akışı | Yeni bir alan/tablo eklerken |
| [`SECURITY.md`](./SECURITY.md) | Kimlik doğrulama (şifre hash, oturum), RBAC, rate limit, bulunup kapatılan gerçek güvenlik açıkları | Güvenlikle ilgili her soru için |
| [`BACKUP.md`](./BACKUP.md) | Postgres + R2 yedekleme nasıl kuruldu/değiştirilir, restore adımları | Veri kaybı riski/kurtarma söz konusu olduğunda |
| [`INSTALL.md`](./INSTALL.md) | **Sıfırdan yeni bir müşteri kurulumu** — Postgres/R2 kurulumundan deploy'a kadar, uçtan uca | Projeyi yeni bir müşteriye satarken |
| [`CHECKLIST.md`](./CHECKLIST.md) | Deployment öncesi kontrol listesi | Her production deploy'undan önce |
| [`backend/faz0-frontend-envanteri.md`](./backend/faz0-frontend-envanteri.md) | Backend geliştirmesinin en başındaki frontend API sözleşmesi envanteri (tarihi referans) | Eski bir tasarım kararının kökenini ararken |

## Hızlı Başlangıç (mevcut geliştirici, yerelde çalıştırmak için)

```bash
# Backend — yerel bir PostgreSQL kurulu olmalı (mock'u yok, Firestore'un aksine)
cd server
cp .env.example .env   # sonra .env'i doldurun (en azından DATABASE_URL), bkz. ARCHITECTURE.md
npm install
npm run db:migrate      # şemayı uygular
node scripts/bootstrap-owner.js <email> <şifre>   # ilk owner hesabı
npm run dev              # http://localhost:4000

# Frontend (başka bir terminalde, repo kökünde)
cp .env.example .env    # sonra .env'i doldurun (VITE_TENANT_ID, bootstrap çıktısından)
npm install
npm run dev              # http://localhost:5173
```

`INTEGRATIONS_MODE=mock` ile (WhatsApp/Instagram'a hiç bağlanmadan),
`STORAGE_MODE=mock` ile de (gerçek bir R2 hesabı olmadan, sunucunun kendi
diskine) ayağa kalkar — Postgres'in kendisi her zaman gerçek. Gerçek bir
müşteri kurulumu için `INSTALL.md`'yi takip edin.
