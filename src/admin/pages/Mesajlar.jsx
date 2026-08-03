import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Search, Send, CalendarPlus, MessageCircleOff, UserPlus, Phone, Mail, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { InstagramIcon, WhatsAppIcon } from "../../components/common/BrandIcons";
import { toMillis } from "../../lib/firestoreTimestamp";
import {
  getConversations,
  subscribeToConversations,
  getMessages,
  loadMessages,
  subscribeToMessages,
  sendMessage,
  markConversationRead,
  linkConversationToCustomer,
} from "../data/conversationStore";
import { getCustomers, getCustomerById, updateCustomer } from "../data/customerStore";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import CustomerSheet from "../components/CustomerSheet";

const NONE = "__none__";
const CHANNEL_TABS = [
  { value: "all", label: "Tümü" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
];

function ChannelIcon({ channel, className }) {
  if (channel === "instagram") return <InstagramIcon className={className} />;
  if (channel === "whatsapp") return <WhatsAppIcon className={className} />;
  return null;
}

function participantLabel(conversation) {
  return conversation.participantName || conversation.participantUsername || "Bilinmeyen kişi";
}

function formatTime(ms) {
  if (!ms) return "";
  const date = new Date(ms);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

/**
 * "/admin/mesajlar" — kanal-agnostik birleşik gelen kutusu (bugün sadece
 * Instagram gerçekten bağlı; WhatsApp entegrasyonu bağlandığında sekmesi
 * zaten burada duruyor, ekstra bir arayüz değişikliği gerekmeyecek — bkz.
 * server/src/services/message.service.js#dispatchOutbound).
 *
 * Üç panel: sohbet listesi (sol) + mesaj akışı (orta) + bağlı müşteri
 * bilgisi/randevu kısayolu (sağ). Instagram'ın "24 saatlik mesajlaşma
 * penceresi" kuralı burada da uygulanır — pencere kapandıysa yanıt kutusu
 * devre dışı kalır (bkz. message.service.js#sendOutboundMessage).
 */
export default function Mesajlar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState(getConversations());
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  // Gönderilmiş ama backend'in henüz onaylamadığı mesajlar — "Gönder"e
  // basınca metin kutusunu ve balonu ANINDA güncelleyip API isteğini arka
  // planda beklemek için (bkz. handleSend). Gerçek mesaj gelince (store'un
  // messages'ı üzerinden) ilgili geçici balon kaldırılır.
  const [pendingMessages, setPendingMessages] = useState([]);
  const [appointmentTarget, setAppointmentTarget] = useState(null);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [customerSheetTarget, setCustomerSheetTarget] = useState(null); // null = "yeni müşteri kaydet" modu
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => subscribeToConversations(() => setConversations(getConversations())), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (!query) return true;
      const haystack = `${c.participantName ?? ""} ${c.participantUsername ?? ""} ${c.lastMessagePreview ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, search, channelFilter]);

  // Seçili sohbet filtrelenince (kanal sekmesi değişince vb.) listede
  // kaybolmasın diye ilk görünen sohbete geçer; ilk yüklemede de otomatik
  // bir sohbet açar. Dashboard'daki "Yeni Mesajlar" kutusundan
  // ?id=<conversationId> ile gelindiyse (Customers.jsx'in ⌘K derin
  // bağlantı deseniyle aynı mantık) o öncelikli — aynı render'da hem
  // deep-link hem "ilkine geç" mantığı yarışıp deep-link'i ezmesin diye
  // tek effect'te birleştirildi.
  useEffect(() => {
    const deepLinkId = searchParams.get("id");
    if (deepLinkId) {
      setSelectedId(deepLinkId);
      setSearchParams({}, { replace: true });
      return;
    }
    if (selectedId && filtered.some((c) => c.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setReplyText("");
    setPendingMessages([]);
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setMessages(getMessages(selectedId));
    loadMessages(selectedId);
    return subscribeToMessages(selectedId, () => setMessages(getMessages(selectedId)));
  }, [selectedId]);

  useEffect(() => {
    if (selected && selected.unreadCount > 0) {
      markConversationRead(selected.id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Açık sohbet için ayrıca hızlı bir yenileme — sol listedeki 20 saniyelik
  // genel tarama (useIncomingMessageAlerts.js) sadece son mesaj önizlemesini
  // günceller. Sadece o an AÇIK olan sohbet için, tüm sohbet listesini değil
  // tek bir sohbeti sorguladığı için maliyeti düşük — 1 saniyede bir gelen
  // mesajın görünmesi için yeterince sık.
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => loadMessages(selectedId), 1000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // Gerçek mesajlarla (backend'den) henüz onaylanmamış, az önce gönderilen
  // geçici balonları birleştirir — bkz. handleSend.
  const displayMessages = [...messages, ...pendingMessages];

  // Yeni mesaj eklendiğinde (gönderilen/gelen) veya bir sohbet ilk açıldığında
  // otomatik en alta kaydırır. Sadece mesaj SAYISI arttığında tetiklenir —
  // periyodik yenilemede içerik aynı kalıp sadece dizi referansı değişince
  // kullanıcının yukarı kaydırdığı konumu geri almasın diye.
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (displayMessages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
    prevMessageCountRef.current = displayMessages.length;
  }, [displayMessages.length]);

  const customers = getCustomers();
  const linkedCustomer = selected?.customerId ? getCustomerById(selected.customerId) : null;
  const windowClosed = Boolean(selected?.windowExpiresAt && Date.now() > selected.windowExpiresAt);

  useEffect(() => {
    setNoteDraft(linkedCustomer?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedCustomer?.id]);

  async function handleSaveNote() {
    if (!linkedCustomer) return;
    setSavingNote(true);
    try {
      await updateCustomer(linkedCustomer.id, { notes: noteDraft });
      toast.success("Not kaydedildi.");
    } catch (error) {
      toast.error(error.message || "Not kaydedilemedi.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const text = replyText.trim();
    if (!text || !selected) return;

    // Önce ekrana yaz, sonra gönder — Graph API + Firestore turu bitene
    // kadar beklemek yerine metin kutusu anında boşalır, balon anında görünür.
    const tempId = `pending-${Date.now()}`;
    setPendingMessages((prev) => [...prev, { id: tempId, direction: "outbound", text, createdAt: new Date(), pending: true }]);
    setReplyText("");

    try {
      await sendMessage(selected.id, text);
    } catch (error) {
      toast.error(error.message || "Mesaj gönderilemedi.");
    } finally {
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function handleLinkCustomer(value) {
    try {
      await linkConversationToCustomer(selected.id, value === NONE ? null : value);
      toast.success(value === NONE ? "Müşteri bağlantısı kaldırıldı." : "Müşteriye bağlandı.");
    } catch (error) {
      toast.error(error.message || "Bağlanamadı.");
    }
  }

  function openCreateCustomerFromConversation() {
    setCustomerSheetTarget(null);
    setCustomerSheetOpen(true);
  }

  function openEditLinkedCustomer() {
    if (!linkedCustomer) return;
    setCustomerSheetTarget(linkedCustomer);
    setCustomerSheetOpen(true);
  }

  // "Yeni Kaydet" akışında oluşturulan kart otomatik olarak bu sohbete
  // bağlanır — kullanıcı ayrıca dropdown'dan seçmek zorunda kalmasın diye.
  async function handleCustomerSheetSaved(savedCustomer) {
    if (!customerSheetTarget && savedCustomer && selected) {
      try {
        await linkConversationToCustomer(selected.id, savedCustomer.id);
      } catch (error) {
        toast.error(error.message || "Müşteri oluşturuldu ama sohbete bağlanamadı.");
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sol: sohbet listesi */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl border border-border bg-card">
        <div className="space-y-3 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sohbetlerde ara..."
              className="pl-8"
            />
          </div>
          <Tabs value={channelFilter} onValueChange={setChannelFilter}>
            <TabsList className="w-full">
              {CHANNEL_TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value} className="flex-1">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {conversations.length === 0 ? "Henüz mesaj yok." : "Bu kritere uygun sohbet bulunamadı."}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition hover:bg-muted/60",
                  selectedId === c.id && "bg-muted",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar size="lg">
                    <AvatarImage src={c.participantAvatarUrl ?? undefined} />
                    <AvatarFallback>{participantLabel(c).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <ChannelIcon channel={c.channel} className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{participantLabel(c)}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessageDirection === "outbound" ? "Siz: " : ""}
                      {c.lastMessagePreview || "—"}
                    </p>
                    {c.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full bg-brand-gold px-1 text-[10px] text-white">
                        {c.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Orta: mesaj akışı */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-card">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircleOff className="h-8 w-8" />
            <p className="text-sm">Görüntülemek için bir sohbet seçin.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarImage src={selected.participantAvatarUrl ?? undefined} />
                  <AvatarFallback>{participantLabel(selected).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{participantLabel(selected)}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChannelIcon channel={selected.channel} className="h-3 w-3" />
                    {selected.channel === "instagram" ? "Instagram" : "WhatsApp"}
                    {selected.participantUsername && ` • @${selected.participantUsername}`}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => linkedCustomer && setAppointmentTarget(linkedCustomer)}
                disabled={!linkedCustomer}
                title={!linkedCustomer ? "Randevu oluşturmak için önce bir müşteriye bağlayın" : undefined}
              >
                <CalendarPlus className="h-4 w-4" />
                Randevu Oluştur
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {displayMessages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Bu sohbette henüz mesaj yok.</p>
              ) : (
                displayMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start", m.pending && "opacity-60")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                        m.direction === "outbound" ? "bg-brand-gold text-white" : "bg-muted text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={cn("mt-1 text-[10px]", m.direction === "outbound" ? "text-white/70" : "text-muted-foreground")}>
                        {m.pending ? "Gönderiliyor..." : formatTime(toMillis(m.createdAt))}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-border p-3">
              {windowClosed && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  24 saatlik mesajlaşma penceresi kapandı — kullanıcı tekrar yazana kadar cevap gönderilemez (Meta kuralı).
                </p>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Mesaj yaz..."
                  rows={1}
                  disabled={windowClosed}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  className="min-h-10 flex-1 resize-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={windowClosed || !replyText.trim()}
                  className="bg-brand-gold text-white hover:bg-brand-gold-dark"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Sağ: müşteri bağlantısı */}
      {selected && (
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Müşteri Bağlantısı</h3>
              <button
                type="button"
                onClick={openCreateCustomerFromConversation}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-gold-dark hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Yeni Kaydet
              </button>
            </div>
            <Select value={selected.customerId ?? NONE} onValueChange={handleLinkCustomer}>
              <SelectTrigger className="w-full">
                <SelectValue>{linkedCustomer ? linkedCustomer.name : "Bağlı değil"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>Bağlı değil</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {linkedCustomer ? (
            <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-start gap-3">
                <Avatar size="lg" className="shrink-0">
                  <AvatarImage src={linkedCustomer.photo ?? undefined} />
                  <AvatarFallback>{linkedCustomer.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-foreground">{linkedCustomer.name}</p>
                    <Badge variant="outline" className="shrink-0">{linkedCustomer.status}</Badge>
                  </div>
                  {linkedCustomer.phone && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {linkedCustomer.phone}
                    </p>
                  )}
                  {linkedCustomer.email && (
                    <p className="flex items-center gap-1.5 truncate text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {linkedCustomer.email}
                    </p>
                  )}
                  {(linkedCustomer.desiredProvince || linkedCustomer.desiredDistrict) && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[linkedCustomer.desiredDistrict, linkedCustomer.desiredProvince].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={openEditLinkedCustomer}>
                Detayları Görüntüle / Düzenle
              </Button>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Label htmlFor="mesajlar-not" className="text-xs font-semibold text-muted-foreground">
                  Not
                </Label>
                <Textarea
                  id="mesajlar-not"
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Bu müşteriyle ilgili bir not ekleyin..."
                  className="resize-none text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={savingNote || noteDraft === (linkedCustomer.notes ?? "")}
                  onClick={handleSaveNote}
                >
                  Notu Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Bu sohbet henüz bir müşteri kartına bağlı değil — yukarıdan mevcut bir kartı seçebilir ya da &quot;Yeni Kaydet&quot;
              ile buradan bir kart oluşturabilirsiniz.
            </p>
          )}

          <p className="text-xs text-muted-foreground">Sohbet durumu: {selected.status === "open" ? "Açık" : "Kapalı"}</p>
        </div>
      )}

      {appointmentTarget && (
        <AppointmentFormDialog
          key={appointmentTarget.id}
          open
          onOpenChange={(o) => !o && setAppointmentTarget(null)}
          appointment={null}
          initialCustomerId={appointmentTarget.id}
        />
      )}

      <CustomerSheet
        open={customerSheetOpen}
        onOpenChange={setCustomerSheetOpen}
        customer={customerSheetTarget}
        prefill={
          !customerSheetTarget && selected
            ? {
                name: participantLabel(selected) !== "Bilinmeyen kişi" ? participantLabel(selected) : "",
                instagram:
                  selected.channel === "instagram" && selected.participantUsername
                    ? `@${selected.participantUsername}`
                    : "",
                source: selected.channel === "instagram" ? "Instagram" : "WhatsApp",
                photo: selected.participantAvatarUrl ?? null,
              }
            : undefined
        }
        onSaved={handleCustomerSheetSaved}
      />
    </div>
  );
}
