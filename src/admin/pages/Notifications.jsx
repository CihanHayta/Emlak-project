import { useEffect, useState } from "react";
import { Bell, CalendarClock, FileText, Building2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNotifications, markAsRead, markAllAsRead, subscribeToNotifications } from "../data/notificationStore";

const TYPE_ICON = { randevu: CalendarClock, form: FileText, ilan: Building2 };

/** "/admin/bildirimler" — the persistent notification center behind the topbar's bell. */
export default function Notifications() {
  const [notifications, setNotifications] = useState(getNotifications());

  useEffect(() => subscribeToNotifications(() => setNotifications(getNotifications())), []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notifications.filter((n) => !n.read).length} okunmamış bildirim
        </p>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          <CheckCheck className="h-4 w-4" />
          Tümünü Okundu İşaretle
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <Bell className="h-8 w-8" />
          <p>Henüz bildirim yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => markAsRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                  n.read ? "border-border bg-card" : "border-brand-gold/40 bg-brand-gold/5",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold-dark">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.at).toLocaleString("tr-TR")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
