/**
 * Mesajlar (unified Instagram/WhatsApp inbox) data store — same cache+subscribe
 * pattern as customerStore.js/appointmentStore.js. Conversations are cached
 * as a flat list (channel-agnostic — a "channel" field on each one is what
 * Mesajlar.jsx filters by); messages are cached per-conversation and only
 * fetched lazily when a thread is actually opened, since fetching every
 * conversation's full message history upfront would be wasteful.
 *
 * `lastMessageAt`/`windowExpiresAt` on a conversation are plain
 * `Date.now()` numbers (see server/src/models/conversation.model.js), NOT
 * Firestore Timestamps — no toMillis() normalization needed for those two.
 * Message `createdAt` IS a Firestore Timestamp (via base.model.js) and does
 * need it wherever displayed.
 */
import { apiClient } from "../../lib/apiClient";

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/conversations");
  } catch (error) {
    console.error("Sohbetler yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** All conversations, most recently active first. Triggers the initial load on first call. */
export function getConversations() {
  ensureLoaded();
  return [...cache].sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
}

export function getConversationById(id) {
  return cache.find((c) => c.id === id) ?? null;
}

/** Re-fetches the conversation list from the server — used by the polling alert hook. */
export async function refreshConversations() {
  await refresh();
}

export async function linkConversationToCustomer(id, customerId) {
  const updated = await apiClient.patch(`/conversations/${id}/customer`, { customerId });
  cache = cache.map((c) => (c.id === id ? updated : c));
  notify();
  return updated;
}

export async function markConversationRead(id) {
  const updated = await apiClient.post(`/conversations/${id}/read`);
  cache = cache.map((c) => (c.id === id ? updated : c));
  notify();
  return updated;
}

/** Yumuşak siler (backend'de deletedAt set edilir) — liste ve önbellekten kaldırır. */
export async function deleteConversation(id) {
  await apiClient.delete(`/conversations/${id}`);
  cache = cache.filter((c) => c.id !== id);
  messagesCache.delete(id);
  notify();
}

export function subscribeToConversations(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ---- Messages (scoped per conversation) ----

const messagesCache = new Map(); // conversationId -> message[]
const messagesListeners = new Map(); // conversationId -> Set<callback>

function notifyMessages(conversationId) {
  messagesListeners.get(conversationId)?.forEach((callback) => callback());
}

/** Synchronous cache read — pair with loadMessages()/subscribeToMessages(). */
export function getMessages(conversationId) {
  return messagesCache.get(conversationId) ?? [];
}

export async function loadMessages(conversationId) {
  try {
    messagesCache.set(conversationId, await apiClient.get(`/conversations/${conversationId}/messages`));
  } catch (error) {
    console.error("Mesajlar yüklenemedi:", error);
    messagesCache.set(conversationId, []);
  }
  notifyMessages(conversationId);
}

/**
 * Sends an outbound reply, appends it locally, and refreshes the
 * conversation list (last-message preview/ordering changed). The list
 * refresh is deliberately NOT awaited — it doesn't affect what the caller
 * needs (the sent message), and awaiting it just adds a second network
 * round-trip's worth of latency to something that's supposed to feel instant.
 */
export async function sendMessage(conversationId, text) {
  const message = await apiClient.post(`/conversations/${conversationId}/messages`, { text });
  messagesCache.set(conversationId, [...(messagesCache.get(conversationId) ?? []), message]);
  notifyMessages(conversationId);
  refresh();
  return message;
}

export function subscribeToMessages(conversationId, callback) {
  if (!messagesListeners.has(conversationId)) messagesListeners.set(conversationId, new Set());
  messagesListeners.get(conversationId).add(callback);
  return () => messagesListeners.get(conversationId)?.delete(callback);
}
