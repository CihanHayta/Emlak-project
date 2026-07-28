import { useEffect } from "react";
import { toast } from "sonner";
import { getAppointments } from "../data/appointmentStore";
import { getCustomerById } from "../data/customerStore";
import { addNotification } from "../data/notificationStore";

const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000; // "en az 2 saat önceden haber olsun"
const CHECK_INTERVAL_MS = 60 * 1000; // re-check every minute
const REMINDED_KEY = "sahin-admin-reminded-appointments";

// Persisted (not just in-memory) so a page refresh/new tab doesn't re-fire
// the same reminder for an appointment it already notified about. Keyed by
// `${appointmentId}-${dateTime}` so a *rescheduled* appointment (new
// dateTime) is treated as new and still reminds.
function getRemindedKeys() {
  try {
    const raw = localStorage.getItem(REMINDED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markReminded(key, remindedKeys) {
  remindedKeys.add(key);
  localStorage.setItem(REMINDED_KEY, JSON.stringify([...remindedKeys]));
}

/**
 * Watches upcoming appointments and fires a reminder (toast + an entry in
 * the Bildirimler notification center) once an appointment falls within the
 * next 2 hours — so the agent using the panel gets a heads-up instead of
 * having to keep the Randevular page open and watch the clock.
 *
 * Mount this once, high up in AdminLayout, so it keeps checking no matter
 * which admin page is open. There's no backend/push-notification service
 * yet, so this only works while the admin panel tab is open — a real
 * implementation would move this check server-side (a cron job sending
 * SMS/email/push) once one exists.
 */
export function useUpcomingAppointmentReminders() {
  useEffect(() => {
    function checkReminders() {
      const now = Date.now();
      const remindedKeys = getRemindedKeys();

      for (const appointment of getAppointments()) {
        if (appointment.status === "İptal Edildi" || appointment.status === "Tamamlandı") continue;

        const key = `${appointment.id}-${appointment.dateTime}`;
        if (remindedKeys.has(key)) continue;

        const msUntil = appointment.dateTime - now;
        if (msUntil <= 0 || msUntil > REMINDER_WINDOW_MS) continue;

        markReminded(key, remindedKeys);

        const customer = getCustomerById(appointment.customerId);
        const listingTitle = appointment.listing?.title ?? "İlan";
        const hoursLeft = Math.max(1, Math.round(msUntil / (60 * 60 * 1000)));
        const timeLabel = new Date(appointment.dateTime).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        toast.info(`Yaklaşan randevu: ${customer?.name ?? "Müşteri"}`, {
          description: `${listingTitle} — bugün saat ${timeLabel} (~${hoursLeft} saat sonra)`,
          duration: 12000,
        });

        addNotification({
          title: `Yaklaşan randevu: ${customer?.name ?? "Müşteri"}`,
          description: `${listingTitle} randevusu ${timeLabel} saatinde, yaklaşık ${hoursLeft} saat içinde.`,
          type: "randevu",
        });
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
