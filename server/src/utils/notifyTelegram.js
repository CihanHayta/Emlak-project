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

/** Fire-and-forget — asla await edilmemeli, hata yanıtını geciktirmesin. */
export async function notifyTelegramError(err, req) {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const text = [
    "🔴 *Sunucu Hatası*",
    `*Yol:* \`${req.method} ${req.originalUrl}\``,
    `*Mesaj:* ${err.message}`,
    `*Request ID:* \`${req.requestId}\``,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
    });
  } catch {
    // Bildirim gönderilemedi — asıl hata zaten error.middleware.js'te
    // loglandı, bildirim ikincil bir kanal, burada sessizce yutulur.
  }
}
