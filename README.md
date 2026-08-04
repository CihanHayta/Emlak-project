# Şahin Emlak — Emlak Ofisi CRM

Bir emlak ofisi için: genel (public) portföy sitesi + admin panelden yönetilen
CRM (ilan, müşteri/lead, randevu, Instagram/WhatsApp mesajlaşma, kampanya
sayfaları). React + Vite frontend, Node/Express backend, Firebase (Auth +
Firestore + Storage).

Her müşteri (emlak ofisi) kendi Firebase projesinde, kendi Railway
backend'inde ve kendi Vercel frontend'inde çalışır — tek kod tabanı, ortam
değişkenleriyle (`.env`) müşteriye özelleştirilir.

## Kurulum ve geliştirme

```bash
npm install && npm run dev          # frontend, http://localhost:5173
cd server && npm install && npm run dev   # backend, http://localhost:4000
```

Backend varsayılan olarak `FIREBASE_MODE=mock` ile gelir — hiçbir Firebase
hesabı olmadan çalışır (bkz. `server/README.md`).

## Dokümantasyon

| Dosya | İçerik |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Mimari, veri akışı, teknik kararlar, bilinen eksikler |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Güvenlik modeli, RBAC, rate limiting, alınan önlemler |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Yeni bir müşteri için sıfırdan kurulum adımları |
| [`docs/CHECKLIST.md`](docs/CHECKLIST.md) | Deploy öncesi kontrol listesi |
| [`docs/BACKUP.md`](docs/BACKUP.md) | Firestore yedekleme/geri yükleme |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Firestore koleksiyonları ve alanları |
| [`server/README.md`](server/README.md) | Backend'e özel kurulum/klasör açıklaması |
