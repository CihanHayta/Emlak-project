// server/src/services/metaLeadAds.service.js
//
// Instagram/Facebook reklamlarındaki "Instant Form" (Lead Ads) gönderimleri
// — instagram.service.js/whatsapp.service.js ile aynı desen: imza
// doğrulama TEK bir paylaşılan Meta App'e ait (bkz. webhook/metaLeadAds.webhook.js,
// INSTAGRAM_APP_SECRET/VERIFY_TOKEN'ı aynen kullanır, yeni env değişkeni
// gerekmiyor), ama gönderim/veri çekme fonksiyonları tenant'ın kendi
// bağladığı Facebook Sayfası'nın token'ını PARAMETRE olarak alır.
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_BASE = `https://graph.facebook.com/${env.metaGraphApiVersion}`;

/** Elle bağlama sırasında çağrılır — aksi halde webhook hiç gelmez (Instagram OAuth'taki scope'un otomatik yaptığını burada elle yapıyoruz, WhatsApp'taki subscribed_apps çağrısıyla aynı desen). */
export async function subscribePageToLeadgen(pageId, pageAccessToken) {
  const response = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps?subscribed_fields=leadgen`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pageAccessToken}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw ApiError.upstream(body?.error?.message || "Facebook Sayfası leadgen olaylarına abone edilemedi.");
  }
}

/**
 * Meta'nın `field_data: [{ name, values: [...] }]` formatını bizim
 * `lead.model.js`'in beklediği düz şekle çevirir. `full_name`/`phone_number`
 * Meta'nın standart (yerleşik) soru tipi alan adları — kullanıcı forma özel
 * bir soru eklediyse o alanlar burada yakalanmaz, sadece bilgi amaçlı
 * `message`'a eklenir.
 */
function mapFieldData(fieldData) {
  const byName = Object.fromEntries((fieldData ?? []).map((f) => [f.name, f.values?.[0] ?? ""]));
  const extras = (fieldData ?? [])
    .filter((f) => !["full_name", "first_name", "last_name", "phone_number", "email"].includes(f.name))
    .map((f) => `${f.name}: ${f.values?.[0] ?? ""}`)
    .join(", ");
  return {
    name: byName.full_name || [byName.first_name, byName.last_name].filter(Boolean).join(" ") || "Bilinmeyen",
    phone: byName.phone_number || "",
    message: extras,
  };
}

/** Webhook'tan gelen `leadgen_id` ile asıl form verisini çeker — webhook olayının kendisi sadece bir id taşır, gizlilik gereği. */
export async function fetchLeadData(leadgenId, pageAccessToken) {
  const response = await fetch(`${GRAPH_BASE}/${leadgenId}?access_token=${encodeURIComponent(pageAccessToken)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw ApiError.upstream(body?.error?.message || "Lead verisi alınamadı.");
  }
  return mapFieldData(body.field_data);
}
