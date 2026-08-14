// server/src/models/conversation.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `conversations` — bir Instagram kullanıcısıyla olan sohbetin özeti.
 * Doküman id'si otomatik üretilir; hangi Instagram kullanıcısı olduğu
 * `externalUserId` (Instagram-scoped user id / IGSID) ile tutulur —
 * webhook'tan her yeni olay geldiğinde bununla eşleştirilir (bkz.
 * repositories/conversation.repository.js#findByExternalUser).
 *
 * `windowExpiresAt`: Meta'nın "24 saatlik mesajlaşma penceresi" kuralı —
 * son gelen (inbound) mesajdan 24 saat sonrasına kadar serbestçe cevap
 * yazılabilir, sonrasında Meta normal mesaj gönderimini reddeder. Bu alan
 * her inbound mesajda güncellenir, gönderim öncesi kontrol edilir (bkz.
 * services/message.service.js#sendOutboundMessage).
 */
export function createDefaultConversation({
  channel = "instagram",
  externalUserId,
  participantName = null,
  participantUsername = null,
  participantAvatarUrl = null,
}) {
  const now = Date.now();
  return withCreateFields({
    channel, // şimdilik sadece "instagram" destekleniyor
    externalUserId,
    participantName,
    participantUsername,
    participantAvatarUrl,
    customerId: null, // CRM müşterisine bağlanınca doldurulur
    status: "open", // open | closed
    lastMessageAt: now,
    lastMessagePreview: "",
    lastMessageDirection: "inbound", // inbound | outbound
    unreadCount: 0,
    windowExpiresAt: now + 24 * 60 * 60 * 1000,
    // Mesai Dışı Otomatik Yanıt otomasyonu (bkz.
    // automation.service.js#checkOffHoursAndReply) en son ne zaman bir bot
    // yanıtı gönderdi — arka arkaya gelen birkaç mesaja her seferinde ayrı
    // bir "kapalıyız" yanıtı gitmesin diye bir soğuma (cooldown) süresi
    // hesaplamak için kullanılır.
    lastAutoReplyAt: null,
  });
}
