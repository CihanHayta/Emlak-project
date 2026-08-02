# Şahin Emlak CRM — Doküman İndeksi

> **İş modeli (her kararın temeli):** Bu proje çok kiracılı bir SaaS
> DEĞİL. **Tek kiracılı, satış başına ayrı bir Firebase projesine
> kurulan** bir üründür — bir müşteriye bir kurulum, bir sonrakine
> tamamen ayrı ve sıfırdan bir Firebase projesi. Kod tabanı aynı kalır,
> değişen sadece `.env` ve `src/firebase/config.js`'in okuduğu değerler.

Bu klasördeki her dosya, projeyi hiç bilmeyen bir geliştiricinin (ya da
6 ay sonra geri dönen sizin) tek başına anlayıp yeni bir müşteriye
kurabilmesi için, kod doğrudan okunarak yazıldı.

| Dosya | Ne anlatır | Ne zaman bakılır |
|---|---|---|
| [`HISTORY.md`](./HISTORY.md) | Proje sıfırdan hangi sırayla kuruldu, her adım neden o sırada yapıldı | Projenin "hikayesini" anlamak için |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Genel mimari, katmanlar, veri akışı, kod deseni (cache+subscribe), roller, bilinen eksikler | Kod yazmaya başlamadan önce |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Firestore koleksiyonları, doküman alanları, ilişkiler, index'ler; Storage klasör yapısı, upload akışı | Yeni bir alan/koleksiyon eklerken |
| [`SECURITY.md`](./SECURITY.md) | Firestore/Storage Rules, Authentication, RBAC, rate limit, IAM, Billing, bulunup kapatılan gerçek güvenlik açıkları | Güvenlikle ilgili her soru için |
| [`BACKUP.md`](./BACKUP.md) | Yedekleme nasıl kuruldu/değiştirilir, restore adımları | Veri kaybı riski/kurtarma söz konusu olduğunda |
| [`INSTALL.md`](./INSTALL.md) | **Sıfırdan yeni bir müşteri kurulumu** — Firebase Console adımlarından deploy'a kadar, uçtan uca | Projeyi yeni bir müşteriye satarken |
| [`CHECKLIST.md`](./CHECKLIST.md) | Deployment öncesi kontrol listesi | Her production deploy'undan önce |
| [`backend/faz0-frontend-envanteri.md`](./backend/faz0-frontend-envanteri.md) | Backend geliştirmesinin en başındaki frontend API sözleşmesi envanteri (tarihi referans) | Eski bir tasarım kararının kökenini ararken |

## Hızlı Başlangıç (mevcut geliştirici, yerelde çalıştırmak için)

```bash
# Backend
cd server
cp .env.example .env   # sonra .env'i doldurun, bkz. ARCHITECTURE.md → Environment Variables
npm install
npm run dev             # http://localhost:4000

# Frontend (başka bir terminalde, repo kökünde)
cp .env.example .env    # sonra .env'i doldurun
npm install
npm run dev              # http://localhost:5173
```

`FIREBASE_MODE=mock` ile backend, gerçek Firebase'e hiç bağlanmadan
bellek-içi sahte bir veritabanıyla ayağa kalkar — gerçek veriye
geçmeden önce iskeletin çalıştığını doğrulamak için kullanışlıdır.
Gerçek veriyle çalışmak için `INSTALL.md`'yi takip edin.
