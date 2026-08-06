// server/src/server.js
import { env } from "./config/env.js"; // en başta import edilir — eksik env varsa uygulama burada durur.
import { logger } from "./config/logger.js";
import { app } from "./app.js";
import { startInstagramTokenRefreshJob } from "./jobs/instagramTokenRefresh.job.js";
import { startWhatsappTokenRefreshJob } from "./jobs/whatsappTokenRefresh.job.js";
import { startTenantBackupJob } from "./jobs/backupTenants.job.js";
import { notifyTelegramServerStarted, notifyTelegramFatalError } from "./utils/notifyTelegram.js";

const server = app.listen(env.port, () => {
  logger.info(`Sunucu ayakta: http://localhost:${env.port} (FIREBASE_MODE=${env.firebaseMode}, INTEGRATIONS_MODE=${env.integrationsMode})`);
  notifyTelegramServerStarted();
});

// Express'in error middleware'inin YAKALAYAMADIĞI hatalar (senkron olmayan
// kod, event listener içi hatalar, unutulmuş bir Promise reddi) buraya
// düşer — Node'un varsayılan davranışı zaten process'i sonlandırmak
// (özellikle unhandledRejection modern Node'da default olarak çöker).
// Amacımız bu davranışı DEĞİŞTİRMEK değil, sadece process ölmeden HEMEN
// önce son bir Telegram bildirimi denemesi yapmak — aksi halde process
// sessizce ölür, Railway'in restart'ı hariç kimse haberdar olmaz.
process.on("uncaughtException", (err) => {
  logger.error("Yakalanmamış hata (uncaughtException), process sonlandırılıyor: " + err.stack);
  notifyTelegramFatalError(err).finally(() => process.exit(1));
});
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Yakalanmamış Promise reddi (unhandledRejection), process sonlandırılıyor: " + err.stack);
  notifyTelegramFatalError(err).finally(() => process.exit(1));
});

// mock modda gerçek Instagram token'ı olmadığından işi başlatmanın anlamı yok.
if (env.integrationsMode === "live") {
  startInstagramTokenRefreshJob();
  startWhatsappTokenRefreshJob();
}

// mock modda gerçek Firestore/Storage olmadığından yedeklemenin anlamı yok.
if (env.firebaseMode === "live") {
  startTenantBackupJob();
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
