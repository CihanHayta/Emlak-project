// server/src/models/funnel.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `funnels` — admin panelde oluşturulan, Instagram/reklam trafiği için
 * tasarlanmış tek-sayfalık kampanya sitesi. Sabit ama içeriği tamamen
 * düzenlenebilir bir şablon (public/FunnelPage.jsx tarafından render edilir):
 * başlık + alt başlık + video (opsiyonel) + WhatsApp CTA + lead formu.
 *
 * `slug`: genel (public) URL'in son parçası (`/kampanya/{slug}`) — tenant
 * içinde benzersiz olmalı, servis katmanında kontrol edilir.
 * `status`: "draft" iken genel sayfa 404 döner, sadece admin önizleyebilir
 * (bkz. funnel.service.js#getPublicFunnelBySlug).
 */
export function createDefaultFunnel({
  name,
  slug,
  headline = "",
  subheadline = "",
  videoUrl = "",
  heroImage = "",
  ctaText = "Hemen Randevu Al",
  formEnabled = true,
}) {
  return withCreateFields({
    name, // sadece admin panelde görünen, iç referans amaçlı ad
    slug,
    status: "draft", // draft | published
    headline,
    subheadline,
    videoUrl,
    heroImage,
    ctaText, // sayfadaki CTA butonunun metni — tıklanınca randevu formu popup'ı açılır
    formEnabled, // kapalıyken CTA butonu popup açmaz, sadece bilgi amaçlı görünür
  });
}
