// server/src/server.js
import { env } from "./config/env.js"; // en başta import edilir — eksik env varsa uygulama burada durur.
import { logger } from "./config/logger.js";
import { app } from "./app.js";
import { startInstagramTokenRefreshJob } from "./jobs/instagramTokenRefresh.job.js";

const server = app.listen(env.port, () => {
  logger.info(`Sunucu ayakta: http://localhost:${env.port} (FIREBASE_MODE=${env.firebaseMode}, INTEGRATIONS_MODE=${env.integrationsMode})`);
});

// mock modda gerçek Instagram token'ı olmadığından işi başlatmanın anlamı yok.
if (env.integrationsMode === "live") {
  startInstagramTokenRefreshJob();
}

function shutdown(signal) {
  logger.info(`${signal} alındı, sunucu kapatılıyor...`);
  server.close(() => {
    logger.info("Sunucu kapandı.");
    process.exit(0);
  });
  // Açık bağlantılar 10 saniyede kapanmazsa zorla çık.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
