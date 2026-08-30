import { useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "../../lib/apiClient";
import { getSession } from "./auth";
import { addNotification } from "../data/notificationStore";

const CHECK_INTERVAL_MS = 20 * 1000; // useIncomingLeadAlerts.js ile aynı sıklık
const SEEN_KEY = "sahin-admin-seen-followup-alerts";

// useIncomingLeadAlerts.js'teki AYNI desen: bir önceki oturumda zaten
// bildirimi çıkmış bir olay için sayfa yenilemesinde tekrar bildirim
// atılmasın diye kalıcı (localStorage) bir "görüldü" seti.
function getSeenIds() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(seenIds) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seenIds]));
}

/**
 * "Lead Yanıt Uyarısı" otomasyonunun (server/src/services/automation.service.js#checkLeadResponseAlerts)
 * ürettiği `leadResponseAlert` tipindeki `automationEvents` kayıtlarını
 * izler — sunucu tarafında zaten "hangi müşteri/başvuru ne kadar süredir
 * 'Yeni'de takılı kaldı" hesabını yapıp bir kayıt bırakıyor (eşik +
 * tekrar aralığı Otomasyonlar sayfasından ayarlanır); bu hook onu SADECE
 * gerçek bir masaüstü bildirimine + Bildirimler kaydına çevirir — mantığı
 * TEKRARLAMAZ, tek doğru kaynak backend'de kalır.
 *
 * `/automations/events` owner-only bir uç (bkz. automation.routes.js) —
 * owner olmayan bir oturumda hiç çağrılmaz, aksi halde her 20 saniyede
 * bir 403 alırdı.
 *
 * İlk kontrol sadece mevcut olayları sessizce "görüldü" işaretler — yoksa
 * panel her açıldığında (owner Otomasyonlar'ı daha önce hiç açmamış bile
 * olsa) birikmiş onlarca eski uyarı için art arda bildirim/ses patlardı.
 */
export function useStaleFollowUpAlerts() {
  useEffect(() => {
    if (getSession()?.role !== "owner") return;

    let seenIds = getSeenIds();
    let isFreshBrowser = seenIds.size === 0;

    async function checkForNewAlerts() {
      let events;
      try {
        events = await apiClient.get("/automations/events");
      } catch {
        return; // otomasyon kapalıysa/erişim yoksa sessizce atla, akışı bozma.
      }
      const alerts = events.filter((e) => e.type === "leadResponseAlert");

      if (isFreshBrowser) {
        seenIds = new Set(alerts.map((e) => e.id));
        saveSeenIds(seenIds);
        isFreshBrowser = false;
        return;
      }

      const newAlerts = alerts.filter((e) => !seenIds.has(e.id));
      if (newAlerts.length === 0) return;

      for (const alert of newAlerts) {
        seenIds.add(alert.id);
        const link = alert.customerId ? `/admin/musteriler?id=${alert.customerId}` : "/admin/basvurular";
        toast.info("Takip hatırlatması", { description: alert.message, duration: 10000 });
        addNotification({ title: "Takip hatırlatması", description: alert.message, type: "musteri_takip", link });
      }
      saveSeenIds(seenIds);
    }

    checkForNewAlerts();
    const interval = setInterval(checkForNewAlerts, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
