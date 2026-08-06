// server/src/utils/notifyTelegram.js
//
// Basit, dashboard'suz hata izleme: production'da bir 5xx hatası
// oluştuğunda Telegram'a bir mesaj düşer. `TELEGRAM_BOT_TOKEN`/
// `TELEGRAM_CHAT_ID` set değilse tamamen sessiz no-op'tur — env.js'in
// zorunlu değişken listesinde YOK, kurulmadan da uygulama normal çalışır.
//
// Kurulum: Telegram'da @BotFather'a "/newbot" yazıp bir token alın, botla
// bir sohbet başlatıp https://api.telegram.org/bot<token>/getUpdates
// adresinden kendi chat id'nizi öğrenin.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Ortak gönderim — 5 saniyelik zaman aşımıyla (bkz. AbortSignal.timeout):
 * özellikle notifyTelegramFatalError, process tam çökmeden hemen ÖNCE
 * çağrılıyor; Telegram'a giden istek takılırsa süreç kapanışını sonsuza
 * kadar bloke etmesin diye bir üst sınır şart.
 */
async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Bildirim gönderilemedi — asıl hata zaten ayrıca loglandı, bildirim
    // ikincil bir kanal, burada sessizce yutulur.
  }
}

/** Fire-and-forget — asla await edilmemeli, hata yanıtını geciktirmesin. */
export async function notifyTelegramError(err, req) {
  const text = [
    "🔴 *Sunucu Hatası*",
    `*Yol:* \`${req.method} ${req.originalUrl}\``,
    `*Mesaj:* ${err.message}`,
    `*Request ID:* \`${req.requestId}\``,
  ].join("\n");
  await sendTelegramMessage(text);
}

/**
 * Sunucu process'i ayağa kalktığında (bkz. server.js) çağrılır — hem
 * normal bir deploy'dan hem de beklenmedik bir çökme sonrası Railway'in
 * otomatik restart'ından gelebilir, ikisini BİRBİRİNDEN AYIRT ETMEZ. Bu
 * bilinçli bir tercih: ayrım için ek durum takibi gerekirdi, oysa Cihan
 * zaten "az önce ben mi deploy attım" bilgisine sahip — mesaj beklenmedik
 * bir anda gelirse (deploy atmadığı bir sırada) bu tek başına "bir şey
 * çökmüş, Railway kendi kendine yeniden başlatmış" sinyali olarak yeterli.
 */
export async function notifyTelegramServerStarted() {
  await sendTelegramMessage("✅ Sunucu (yeniden) başladı.");
}

/**
 * `process.on("uncaughtException"/"unhandledRejection")` için — process
 * Node'un varsayılan davranışıyla zaten kapanacak (bkz. server.js), bu
 * son bir haber verme denemesi. error.middleware.js'in yakaladığı normal
 * 5xx hatalarından FARKLI: buraya düşen hatalar Express'in hiç
 * yakalayamadığı, process'i gerçekten öldüren hatalardır.
 */
export async function notifyTelegramFatalError(err) {
  const text = ["💥 *Sunucu ÇÖKTÜ (fatal, process sonlanıyor)*", `*Hata:* ${err?.stack || err?.message || String(err)}`].join(
    "\n",
  );
  await sendTelegramMessage(text);
}
