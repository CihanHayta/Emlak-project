# Emlak CRM — Backend (server/)

Bu klasör, `../src` altındaki mevcut frontend'e (React + Vite) hizmet veren ayrı bir Node.js/Express projesidir. Frontend dosyalarına dokunulmaz — API sözleşmesi frontend'in gerçek ihtiyacından türetilir (bkz. `../docs/backend/faz0-frontend-envanteri.md`).

## Kurulum (ilk kez)

```bash
cd server
npm install
```

`.env` dosyası zaten `FIREBASE_MODE=mock` ile hazır geliyor — hiçbir Firebase hesabı olmadan çalışır. Kendi değerlerinizi görmek isterseniz `.env.example`'a bakın.

## Çalıştırma

```bash
cd server
npm run dev
```

Terminalde şunu görmelisiniz:
```
Sunucu ayakta: http://localhost:4000 (FIREBASE_MODE=mock, INTEGRATIONS_MODE=mock)
```

Görmüyorsanız: en üstte kırmızı `[env] Uygulama başlatılamadı` yazıyorsa `.env` dosyasında eksik bir alan var demektir — mesajda hangisi olduğu yazar.

## Test etme

Başka bir terminalde:
```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/ready
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
| `src/firebase/` | *(Faz 2)* Gerçek/sahte Firebase bağlantısı |
| `src/repositories/` | *(Faz 2+)* Veritabanı sorguları — her sorgu tenant'a (ofise) kilitli |
| `src/services/` | *(Faz 3+)* İş kuralları |
| `src/presenters/` | *(Faz 3+)* İç veri şeklini frontend'in beklediği şekle çevirir |
| `src/controllers/` | *(Faz 3+)* HTTP isteğini service'e, service sonucunu HTTP yanıtına çevirir |
| `src/routes/` | URL yolları |
| `src/middleware/` | Her istekten geçen ortak kod (kimlik doğrulama, hata yakalama, vb. — "middleware" = zincirleme çalışan ara katman fonksiyonları) |
| `src/utils/` | Küçük yardımcı fonksiyonlar |
| `src/webhook/`, `src/integrations/` | *(Faz 6)* WhatsApp/Instagram bağlantısı |
| `tests/` | Otomatik testler |

## env (ortam değişkeni) tablosu

Tam liste ve açıklamalar `.env.example` dosyasında. Özet:

| Değişken | Zorunlu mu | Açıklama |
|---|---|---|
| `NODE_ENV`, `PORT` | Her zaman | Çalışma ortamı, port |
| `FIREBASE_MODE` | Her zaman | `mock` (sahte, hesap gerekmez) veya `live` (gerçek Firebase) |
| `INTEGRATIONS_MODE` | Her zaman | `mock` veya `live` (WhatsApp/Instagram) |
| `CORS_ORIGINS` | Her zaman | Hangi adreslerden istek kabul edileceği |
| `FIREBASE_*` | Sadece `FIREBASE_MODE=live` iken | Firebase servis hesabı bilgileri |
| `WHATSAPP_*`, `INSTAGRAM_*` | Sadece `INTEGRATIONS_MODE=live` iken | Meta API bilgileri |

## mock → live geçişi

Hiçbir servis/controller kodu `FIREBASE_MODE`'a bakmaz — seçim tek bir dosyada (`src/firebase/firestore.client.js`, Faz 2) yapılır. Gerçek Firebase'e geçmek için:
1. `.env`'de `FIREBASE_MODE=live` yapın ve `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`/`FIREBASE_STORAGE_BUCKET` doldurun (Firebase Console → Proje Ayarları → Hizmet Hesapları → "Yeni özel anahtar oluştur").
2. Sunucuyu yeniden başlatın.
Kod tarafında değişiklik gerekmez.

## Endpoint → frontend ekranı tablosu

Faz 1'de sadece `/health` ve `/health/ready` var. Planlanan tam eşleme için `../docs/backend/faz0-frontend-envanteri.md` (bölüm C.1 ve C.7) dosyasına bakın — her endpoint hangi ekranın hangi localStorage fonksiyonunun yerini alacağıyla birlikte listelendi.

## Deploy notları

Henüz deploy edilmedi — Faz 1-9 tamamlanınca eklenecek.
