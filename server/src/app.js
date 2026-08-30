// server/src/app.js
import "express-async-errors"; // Express 4'ün router'ını async hataları otomatik next(err)'e yönlendirecek şekilde yamalar — EN ÜSTTE import edilmeli.
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { globalRateLimit, webhookRateLimit } from "./middleware/rateLimit.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { instagramWebhookRouter } from "./webhook/instagram.webhook.js";
import { whatsappWebhookRouter } from "./webhook/whatsapp.webhook.js";
import { metaLeadAdsWebhookRouter } from "./webhook/metaLeadAds.webhook.js";
import { MOCK_UPLOADS_ROOT } from "./firebase/mock/storage.mock.js";
import { MOCK_R2_ROOT, mockR2Storage } from "./db/mock/storage.mock.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true, // httpOnly session cookie'nin tarayıcıdan gitmesi için zorunlu.
  }),
);
app.use(compression());
app.use(requestIdMiddleware);
app.use(
  morgan(env.isProduction ? "combined" : "dev", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);
app.use(cookieParser());

// Webhook route'ları BİLEREK burada, express.json()'dan ÖNCE bağlanır
// (kendi express.raw() gövde ayrıştırıcılarıyla, bkz. instagram.webhook.js)
// — Meta imza doğrulaması ham body üzerinde çalışır, JSON'a parse edilmiş
// body üzerinde değil.
app.use("/webhooks/instagram", webhookRateLimit, instagramWebhookRouter);
app.use("/webhooks/whatsapp", webhookRateLimit, whatsappWebhookRouter);
app.use("/webhooks/meta-leads", webhookRateLimit, metaLeadAdsWebhookRouter);

// FIREBASE_MODE=mock iken yüklenen dosyalar buradan servis edilir (bkz.
// firebase/mock/storage.mock.js). Rate limit'ten ÖNCE bağlanır — bir video
// oynatılırken tarayıcının attığı çok sayıda "range" isteği limite takılmasın.
// Helmet'in varsayılan Cross-Origin-Resource-Policy: same-origin'i burada
// gevşetiyoruz, yoksa frontend (farklı origin, localhost:5173) bu
// görselleri/videoları <img>/<video> ile yükleyemez.
if (env.firebaseMode === "mock") {
  app.use(
    "/mock-uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(MOCK_UPLOADS_ROOT),
  );
}

// STORAGE_MODE=mock iken R2'nin karşılığı — Aşama 6'nın presigned-PUT akışını
// (frontend'in `uploadUrl`e doğrudan PUT ile dosya göndermesi) gerçek R2
// olmadan da uçtan uca test edilebilir kılar (bkz. db/mock/storage.mock.js#getUploadUrl).
// `express.raw()` ile ham body bellekte tutulur (disk'e ARA bir dosya
// yazılmaz), boyut sınırı en büyük UPLOAD_LIMITS değeriyle (video, 200MB)
// eşleşir — üst katman (upload.service.js) zaten kesin mime/boyut kontrolünü
// presign ANINDA yapıyor, bu sadece "mock disk'e nereye yazılacağı" katmanı.
if (process.env.STORAGE_MODE !== "live") {
  app.use(
    "/mock-r2",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(MOCK_R2_ROOT),
  );
  app.put(
    "/mock-r2-upload/:objectKey(*)",
    express.raw({ type: "*/*", limit: "200mb" }),
    async (req, res, next) => {
      try {
        // Path traversal koruması: object_key her zaman upload.service.js
        // tarafından üretilir (randomUUID tabanlı) ama bu mock endpoint HTTP
        // üzerinden dışarıya açık — kullanıcıdan gelen bir path'in
        // MOCK_R2_ROOT dışına çıkmasına asla izin verilmemeli.
        const objectKey = req.params.objectKey;
        if (objectKey.includes("..")) return res.status(400).json({ error: "Geçersiz object key." });
        await mockR2Storage.upload(req.body, objectKey, { contentType: req.headers["content-type"] });
        res.status(200).end();
      } catch (error) {
        next(error);
      }
    },
  );
}

app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimit);

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
