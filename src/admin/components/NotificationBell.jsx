import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, FileText, Building2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from "../data/notificationStore";

const TYPE_ICON = { randevu: CalendarClock, form: FileText, ilan: Building2, message: MessageCircle, musteri_takip: Phone };
// Bazı bildirimlerin kendi `link`i var (ör. belirli bir müşteri kartı,
// bkz. notificationStore.js#addNotification) — o zaman doğrudan oraya
// gidilir. Yoksa (link: null) bu liste, o TÜRDEN şeylerin genel liste
// sayfasına düşer, en azından bir yere gitmiş olur.
const TYPE_ROUTE = { randevu: "/admin/randevular", form: "/admin/basvurular", ilan: "/admin/ilanlar", message: "/admin/mesajlar", musteri_takip: "/admin/musteriler" };
const PREVIEW_COUNT = 6;

/**
 * Topbar bell: clicking it no longer jumps straight to /admin/bildirimler —
 * it opens a quick preview popover of the most recent notifications first
 * (mark-as-read inline), with a link to the full page at the bottom for
 * anything older.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(getNotifications());
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());

  useEffect(() =>
    subscribeToNotifications(() => {
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
    }),
  []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Bildirimler">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold">Bildirimler</p>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllAsRead} className="text-xs text-brand-gold-dark hover:underline">
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz bildirim yok.</p>
          ) : (
            notifications.slice(0, PREVIEW_COUNT).map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                    const target = n.link ?? TYPE_ROUTE[n.type];
                    if (target) navigate(target);
                  }}
                  className="flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold-dark">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate("/admin/bildirimler");
          }}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-sm font-medium text-brand-gold-dark hover:bg-muted/50"
        >
          Tüm Bildirimleri Gör
        </button>
      </PopoverContent>
    </Popover>
  );
}
