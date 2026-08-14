// server/src/models/automationEvent.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `automationEvents` — Otomasyonlar sayfasındaki aktivite kaydı. Her
 * "bir müşteriye otomasyon mesajı hazırlandı/gönderildi" olayı için bir
 * doküman. `status`:
 *  - "sent": template onaylıydı, gerçekten Meta API'siyle gönderildi.
 *  - "pending_manual": template henüz onaylı değil — mesaj hazır, `waLink`
 *    admin panelinde "Gönder" butonuna bağlanır (agent kendi WhatsApp'ından
 *    tek tıkla açıp gönderir, Business API'yi hiç kullanmaz).
 *  - "manual_sent": agent "Gönderdim" diye işaretledi (bkz.
 *    automation.controller.js#markEventSentController).
 *  - "failed": gönderim denendi ama Graph API hata döndü (ör. token
 *    geçersiz) — mesaj kaybolmasın diye yine de kayıt tutulur.
 */
export function createDefaultAutomationEvent({
  type, // "listingMatch" | "appointmentReminder" — tenant.automations'taki (bkz. tenant.model.js) alan adlarıyla BİREBİR aynı, otomasyon türleri arasında tek/tutarlı bir isimlendirme olsun diye.
  customerId,
  listingId = null,
  appointmentId = null,
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
    channel,
    status,
    message,
    waLink,
    errorMessage,
    sentAt: status === "sent" ? Date.now() : null,
  });
}
