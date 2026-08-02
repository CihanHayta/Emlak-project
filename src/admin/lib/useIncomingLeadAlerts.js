import { useEffect } from "react";
import { toast } from "sonner";
import { getLeads, refreshLeads } from "../../lib/leadStore";
import { addNotification } from "../data/notificationStore";
import { playNewLeadSound } from "./playSound";

const CHECK_INTERVAL_MS = 20 * 1000; // visitor forms should feel "almost real-time"
const SEEN_KEY = "sahin-admin-seen-leads";

// Persisted so a page refresh doesn't replay a sound for a lead this admin
// already saw last session — same reasoning as
// useUpcomingAppointmentReminders.js's REMINDED_KEY.
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
 * Polls the leads inbox (there's no real-time push yet — see
 * docs/backend/faz0-frontend-envanteri.md's original Faz 6 webhook/queue
 * plan for what a real implementation would use instead) and fires a sound
 * + toast + Bildirimler entry the moment a genuinely new Başvuru form shows
 * up, even if a visitor submitted it from their own device while this admin
 * panel tab is just sitting open.
 *
 * The very first check only establishes the baseline (marks whatever's
 * already there as "seen") — it must never blast a sound for every existing
 * lead the moment the panel loads.
 */
export function useIncomingLeadAlerts() {
  useEffect(() => {
    let seenIds = getSeenIds();
    // Bu tarayıcıda bu hook hiç çalışmamışsa (localStorage'da hiç kayıt
    // yoksa) ilk kontrol sadece mevcut başvuruları sessizce "görüldü"
    // işaretler — yoksa panel her yeni cihazda/tarayıcıda açıldığında
    // önceden var olan onlarca başvuru için art arda ses çalardı.
    let isFreshBrowser = seenIds.size === 0;

    async function checkForNewLeads() {
      await refreshLeads();
      const leads = getLeads();

      if (isFreshBrowser) {
        seenIds = new Set(leads.map((lead) => lead.id));
        saveSeenIds(seenIds);
        isFreshBrowser = false;
        return;
      }

      const newLeads = leads.filter((lead) => !seenIds.has(lead.id));
      if (newLeads.length === 0) return;

      for (const lead of newLeads) {
        seenIds.add(lead.id);
        toast.info(`Yeni başvuru: ${lead.name}`, {
          description: lead.context || lead.message || lead.phone,
          duration: 10000,
        });
        addNotification({
          title: `Yeni başvuru: ${lead.name}`,
          description: lead.context ? `${lead.context} — ${lead.phone}` : lead.phone,
          type: "form",
        });
      }
      saveSeenIds(seenIds);
      playNewLeadSound();
    }

    checkForNewLeads();
    const interval = setInterval(checkForNewLeads, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
