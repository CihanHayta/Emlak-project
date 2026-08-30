// server/src/models/automationEvent.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `automationEvents` — Otomasyonlar sayfasındaki aktivite kaydı. Her
 * "bir müşteriye otomasyon mesajı hazırlandı/gönderildi" YA DA "size bir
 * uyarı bırakıldı" olayı için bir doküman. `status`:
 *  - "sent": ya template onaylıydı ve gerçekten Meta API'siyle gönderildi,
 *    ya da (windowClosing gibi) zaten sadece İÇSEL bir bildirim — hiç dış
 *    API çağrısı yok, Firestore'a yazılır yazılmaz "sent" sayılır.
 *  - "pending_manual": template henüz onaylı değil — mesaj hazır, `waLink`
 *    admin panelinde "Gönder" butonuna bağlanır (agent kendi WhatsApp'ından
 *    tek tıkla açıp gönderir, Business API'yi hiç kullanmaz).
 *  - "manual_sent": agent "Gönderdim" diye işaretledi (bkz.
 *    automation.controller.js#markEventSentController).
 *  - "failed": gönderim denendi ama Graph API hata döndü (ör. token
 *    geçersiz) — mesaj kaybolmasın diye yine de kayıt tutulur.
 */
export function createDefaultAutomationEvent({
  type, // "listingMatch" | "appointmentReminder" | "windowClosing" — tenant.automations'taki (bkz. tenant.model.js) alan adlarıyla BİREBİR aynı, otomasyon türleri arasında tek/tutarlı bir isimlendirme olsun diye.
  customerId = null, // windowClosing'de sohbet henüz bir CRM müşterisine bağlanmamış olabilir — bu yüzden null'a izin veriliyor (diğer iki türde her zaman dolu).
  listingId = null,
  appointmentId = null,
  conversationId = null, // sadece windowClosing — hangi sohbetin penceresi kapanıyor.
  leadId = null, // sadece leadResponseAlert — henüz bir müşteri kartına dönüşmediği için customerId yok, hangi başvurunun bekletildiğini bulmak için.
  channel = "whatsapp",
  status, // "sent" | "pending_manual" | "manual_sent" | "failed"
  message,
  waLink = null,
  errorMessage = null,
}) {
  return withCreateFields({
    type,
    customerId,
    listingId,
    appointmentId,
    conversationId,
    leadId,
    channel,
    status,
    message,
    waLink,
    errorMessage,
    sentAt: status === "sent" ? Date.now() : null,
  });
}
