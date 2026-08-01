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
import { globalRateLimit } from "./middleware/rateLimit.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { MOCK_UPLOADS_ROOT } from "./firebase/mock/storage.mock.js";

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

// Faz 6'da webhook route'ları TAM OLARAK BURADA, express.json()'dan ÖNCE
// bağlanacak (kendi express.raw() gövde ayrıştırıcılarıyla) — Meta imza
// doğrulaması ham body üzerinde çalışır.
// app.use("/webhooks", webhookRouter);

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

app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimit);

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
