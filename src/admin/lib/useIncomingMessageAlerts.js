import { useEffect } from "react";
import { toast } from "sonner";
import { getConversations, refreshConversations } from "../data/conversationStore";
import { addNotification } from "../data/notificationStore";
import { playNewMessageSound } from "./playSound";

const CHECK_INTERVAL_MS = 20 * 1000; // same cadence as useIncomingLeadAlerts.js
const SEEN_KEY = "sahin-admin-seen-messages"; // { [conversationId]: lastMessageAt }

// conversation.lastMessageAt is a plain Date.now() number (not a Firestore
// Timestamp — see conversationStore.js's header comment), so it can be
// compared/stored directly without toMillis().
function getSeenMap() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSeenMap(map) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
}

/**
 * Polls the conversation list (no real-time push yet, same limitation as
 * useIncomingLeadAlerts.js) and fires a sound + toast + Bildirimler entry
 * the moment a conversation's last message is a genuinely new INBOUND one —
 * i.e. skips conversations whose last message is our own outbound reply,
 * and skips the very first check (which only establishes the baseline).
 */
export function useIncomingMessageAlerts() {
  useEffect(() => {
    let seen = getSeenMap();
    let isFreshBrowser = Object.keys(seen).length === 0;

    async function checkForNewMessages() {
      await refreshConversations();
      const conversations = getConversations();

      if (isFreshBrowser) {
        seen = Object.fromEntries(conversations.map((c) => [c.id, c.lastMessageAt ?? 0]));
        saveSeenMap(seen);
        isFreshBrowser = false;
        return;
      }

      const newlyMessaged = conversations.filter(
        (c) => c.lastMessageDirection === "inbound" && (c.lastMessageAt ?? 0) > (seen[c.id] ?? 0),
      );
      if (newlyMessaged.length === 0) return;

      for (const conversation of newlyMessaged) {
        seen[conversation.id] = conversation.lastMessageAt ?? 0;
        const who = conversation.participantName || conversation.participantUsername || "Bilinmeyen kişi";
        toast.info(`Yeni mesaj: ${who}`, {
          description: conversation.lastMessagePreview || undefined,
          duration: 10000,
        });
        addNotification({
          title: `Yeni mesaj: ${who}`,
          description: conversation.lastMessagePreview,
          type: "message",
        });
      }
      saveSeenMap(seen);
      playNewMessageSound();
    }

    checkForNewMessages();
    const interval = setInterval(checkForNewMessages, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
