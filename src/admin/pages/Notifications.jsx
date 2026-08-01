import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, FileText, Building2, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotifications,
  subscribeToNotifications,
} from "../data/notificationStore";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

const TYPE_ICON = { randevu: CalendarClock, form: FileText, ilan: Building2 };
const TYPE_ROUTE = { randevu: "/admin/randevular", form: "/admin/basvurular", ilan: "/admin/ilanlar" };

/** "/admin/bildirimler" — the persistent notification center behind the topbar's bell. */
export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(getNotifications());
  const [selected, setSelected] = useState(new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // { ids, label }

  useEffect(() => subscribeToNotifications(() => setNotifications(getNotifications())), []);

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === notifications.length ? new Set() : new Set(notifications.map((n) => n.id))));
  }

  function confirmDelete() {
    if (pendingDelete.ids.length === 1) {
      deleteNotification(pendingDelete.ids[0]);
    } else {
      deleteNotifications(pendingDelete.ids);
    }
    setSelected(new Set());
    setPendingDelete(null);
  }

  function openNotification(n) {
    markAsRead(n.id);
    const route = TYPE_ROUTE[n.type];
    if (route) navigate(route);
  }

  const allSelected = notifications.length > 0 && selected.size === notifications.length;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              Tümünü seç
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {notifications.filter((n) => !n.read).length} okunmamış
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setPendingDelete({ ids: [...selected], label: `${selected.size} bildirim` })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Seçilenleri Sil ({selected.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-3.5 w-3.5" />
            Tümünü Okundu İşaretle
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <Bell className="h-8 w-8" />
          <p>Henüz bildirim yok.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 transition",
                  n.read ? "border-border bg-card" : "border-brand-gold/40 bg-brand-gold/5",
                )}
              >
                <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggleSelected(n.id)} />
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold-dark">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(n.at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ ids: [n.id], label: `"${n.title}"` })}
                  aria-label="Bildirimi sil"
                  className="shrink-0 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Bildirimi sil"
        description={pendingDelete ? `${pendingDelete.label} kalıcı olarak silinsin mi?` : ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
