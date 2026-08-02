// server/src/models/message.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `messages` — bir `conversations/{id}`'e ait tek bir mesaj.
 * `externalMessageId` (Meta'nın ürettiği `mid`), aynı webhook olayının
 * iki kere işlenmesi ihtimaline karşı ileride bir tekilleştirme
 * (idempotency) kontrolü eklemek istenirse diye tutuluyor — bugün
 * kontrolü yapılmıyor, sadece alan olarak saklanıyor.
 */
export function createDefaultMessage({
  conversationId,
  direction, // "inbound" | "outbound"
  text = "",
  attachments = [],
  externalMessageId = null,
  senderId = null,
}) {
  return withCreateFields({
    conversationId,
    direction,
    text,
    attachments, // [{ type, url }]
    externalMessageId,
    senderId, // inbound: Instagram IGSID; outbound: bizim kullanıcı uid'imiz
    status: direction === "outbound" ? "sent" : "received",
  });
}
