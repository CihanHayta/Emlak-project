import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, CalendarClock, MessageCircleReply, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getAutomationSettings,
  subscribeToAutomations,
  getAutomationEvents,
  updateAutomationSettings,
  submitAutomationTemplate,
  refreshTemplateStatus,
  markAutomationEventSent,
} from "../data/automationStore";

const DAY_LABELS = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

const TEMPLATE_STATUS_INFO = {
  not_submitted: { label: "Şablon gönderilmedi", variant: "secondary" },
  pending: { label: "Meta onayı bekleniyor", variant: "outline" },
  approved: { label: "Onaylandı — otomatik gönderiliyor", variant: "default" },
  rejected: { label: "Reddedildi", variant: "destructive" },
};

const EVENT_TYPE_LABELS = { listingMatch: "Yeni İlan Eşleşmesi", appointmentReminder: "Randevu Hatırlatması" };
const EVENT_STATUS_INFO = {
  sent: { label: "Gönderildi", variant: "default" },
  pending_manual: { label: "Gönderim Bekliyor", variant: "outline" },
  manual_sent: { label: "Elle Gönderildi", variant: "secondary" },
  failed: { label: "Başarısız", variant: "destructive" },
};

/**
 * "/admin/otomasyonlar" — WhatsApp üzerinden proaktif otomasyonlar
 * (yeni ilan eşleşmesi, randevu hatırlatması) VE reaktif otomasyon
 * (mesai dışı otomatik yanıt). İlk iki otomasyon Meta'nın onayladığı bir
 * WhatsApp Şablonu gerektirir (bkz. server/src/services/automation.service.js'in
 * üst yorumu) — onaylanana kadar mesajlar hazırlanır, aşağıdaki listeden
 * tek tıkla elle gönderilir. Üçüncüsü hiç şablon gerektirmez, anında aktif olur.
 */
export default function Automations() {
  const [settings, setSettings] = useState(getAutomationSettings());
  const [events, setEvents] = useState(getAutomationEvents());

  useEffect(
    () =>
      subscribeToAutomations(() => {
        setSettings(getAutomationSettings());
        setEvents(getAutomationEvents());
      }),
    [],
  );

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <ListingMatchCard settings={settings.listingMatch} />
      <AppointmentReminderCard settings={settings.appointmentReminder} />
      <OffHoursReplyCard settings={settings.offHoursReply} />
      <EventsLog events={events} />
    </div>
  );
}

function TemplateControls({ type, templateStatus }) {
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const info = TEMPLATE_STATUS_INFO[templateStatus] ?? TEMPLATE_STATUS_INFO.not_submitted;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitAutomationTemplate(type);
      toast.success("Şablon Meta'ya gönderildi, onay bekleniyor.");
    } catch (error) {
      toast.error(error.message || "Şablon gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const updated = await refreshTemplateStatus(type);
      const newStatus = updated[type]?.templateStatus;
      if (newStatus === "approved") toast.success("Şablon onaylandı — artık otomatik gönderiliyor.");
      else if (newStatus === "rejected") toast.error("Şablon reddedildi.");
      else toast("Henüz onaylanmadı, daha sonra tekrar kontrol edin.");
    } catch (error) {
      toast.error(error.message || "Durum alınamadı.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={info.variant}>{info.label}</Badge>
      {(templateStatus === "not_submitted" || templateStatus === "rejected") && (
        <Button size="sm" variant="outline" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Gönderiliyor…" : templateStatus === "rejected" ? "Tekrar Gönder" : "Şablonu Meta'ya Gönder"}
        </Button>
      )}
      {templateStatus === "pending" && (
        <Button size="sm" variant="outline" disabled={refreshing} onClick={handleRefresh}>
          {refreshing ? "Kontrol ediliyor…" : "Onay Durumunu Yenile"}
        </Button>
      )}
      {templateStatus !== "approved" && (
        <p className="w-full text-xs text-muted-foreground">
          Şablon onaylanana kadar mesajlar hazırlanır, aşağıdaki geçmiş listesinden tek tıkla WhatsApp&apos;tan elle gönderebilirsiniz.
        </p>
      )}
    </div>
  );
}

function ListingMatchCard({ settings }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle(enabled) {
    setToggling(true);
    try {
      await updateAutomationSettings({ listingMatch: { ...settings, enabled } });
      toast.success(enabled ? "Yeni İlan Eşleşmesi açıldı." : "Yeni İlan Eşleşmesi kapatıldı.");
    } catch (error) {
      toast.error(error.message || "Ayar güncellenemedi.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-brand-gold" />
              Yeni İlan Eşleşmesi
            </CardTitle>
            <CardDescription>Yeni bir ilan yayına girdiğinde, aradıkları kritere uyan müşterilere WhatsApp&apos;tan haber verilir.</CardDescription>
          </div>
          <Switch checked={settings.enabled} disabled={toggling} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>
      <CardContent>
        <TemplateControls type="listingMatch" templateStatus={settings.templateStatus} />
      </CardContent>
    </Card>
  );
}

function AppointmentReminderCard({ settings }) {
  const [toggling, setToggling] = useState(false);
  const [hoursBefore, setHoursBefore] = useState(settings.hoursBefore);

  useEffect(() => setHoursBefore(settings.hoursBefore), [settings.hoursBefore]);

  async function handleToggle(enabled) {
    setToggling(true);
    try {
      await updateAutomationSettings({ appointmentReminder: { ...settings, enabled } });
      toast.success(enabled ? "Randevu Hatırlatması açıldı." : "Randevu Hatırlatması kapatıldı.");
    } catch (error) {
      toast.error(error.message || "Ayar güncellenemedi.");
    } finally {
      setToggling(false);
    }
  }

  async function handleHoursBlur() {
    const value = Math.min(72, Math.max(1, Number(hoursBefore) || settings.hoursBefore));
    setHoursBefore(value);
    if (value === settings.hoursBefore) return;
    try {
      await updateAutomationSettings({ appointmentReminder: { ...settings, hoursBefore: value } });
      toast.success("Hatırlatma süresi güncellendi.");
    } catch (error) {
      toast.error(error.message || "Güncellenemedi.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-gold" />
              Randevu Hatırlatması
            </CardTitle>
            <CardDescription>Randevudan belirlediğiniz süre önce müşteriye otomatik bir hatırlatma gönderilir.</CardDescription>
          </div>
          <Switch checked={settings.enabled} disabled={toggling} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="hoursBefore" className="text-sm text-muted-foreground">Kaç saat önce:</Label>
          <Input
            id="hoursBefore"
            type="number"
            min={1}
            max={72}
            value={hoursBefore}
            onChange={(e) => setHoursBefore(e.target.value)}
            onBlur={handleHoursBlur}
            className="w-20"
          />
        </div>
        <TemplateControls type="appointmentReminder" templateStatus={settings.templateStatus} />
      </CardContent>
    </Card>
  );
}

function OffHoursReplyCard({ settings }) {
  const [toggling, setToggling] = useState(false);
  const [replyText, setReplyText] = useState(settings.replyText);
  const [businessHours, setBusinessHours] = useState(settings.businessHours);

  useEffect(() => {
    setReplyText(settings.replyText);
    setBusinessHours(settings.businessHours);
  }, [settings.replyText, settings.businessHours]);

  async function persist(next) {
    try {
      await updateAutomationSettings({ offHoursReply: next });
    } catch (error) {
      toast.error(error.message || "Ayar güncellenemedi.");
    }
  }

  async function handleToggle(enabled) {
    setToggling(true);
    try {
      await updateAutomationSettings({ offHoursReply: { ...settings, enabled } });
      toast.success(enabled ? "Mesai Dışı Otomatik Yanıt açıldı — hemen aktif." : "Mesai Dışı Otomatik Yanıt kapatıldı.");
    } catch (error) {
      toast.error(error.message || "Ayar güncellenemedi.");
    } finally {
      setToggling(false);
    }
  }

  function toggleDay(day) {
    const days = businessHours.days.includes(day) ? businessHours.days.filter((d) => d !== day) : [...businessHours.days, day].sort();
    const next = { ...businessHours, days };
    setBusinessHours(next);
    persist({ ...settings, businessHours: next });
  }

  function handleHourChange(field, value) {
    const next = { ...businessHours, [field]: Number(value) };
    setBusinessHours(next);
    persist({ ...settings, businessHours: next });
  }

  async function handleReplyTextBlur() {
    if (replyText === settings.replyText) return;
    await persist({ ...settings, replyText });
    toast.success("Yanıt metni güncellendi.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MessageCircleReply className="h-4 w-4 text-brand-gold" />
              Mesai Dışı Otomatik Yanıt
            </CardTitle>
            <CardDescription>Çalışma saatleri dışında gelen mesajlara otomatik bir yanıt gönderilir. Şablon gerekmez, hemen aktif olur.</CardDescription>
          </div>
          <Switch checked={settings.enabled} disabled={toggling} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Çalışma saatleri:</span>
          <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={businessHours.startHour} onChange={(e) => handleHourChange("startHour", e.target.value)}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">—</span>
          <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={businessHours.endHour} onChange={(e) => handleHourChange("endHour", e.target.value)}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-muted-foreground">Çalışma günleri:</span>
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "h-7 w-9 rounded-md border text-xs font-medium transition",
                businessHours.days.includes(day) ? "border-brand-gold bg-brand-gold/10 text-brand-gold-dark" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replyText">Yanıt metni</Label>
          <Textarea id="replyText" rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} onBlur={handleReplyTextBlur} maxLength={1000} />
        </div>
      </CardContent>
    </Card>
  );
}

function EventsLog({ events }) {
  const [sendingId, setSendingId] = useState(null);

  async function handleMarkSent(event) {
    window.open(event.waLink, "_blank", "noopener,noreferrer");
    setSendingId(event.id);
    try {
      await markAutomationEventSent(event.id);
    } catch (error) {
      toast.error(error.message || "İşaretlenemedi.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Otomasyon Etkinlikleri</CardTitle>
        <CardDescription>Otomasyonların hazırladığı/gönderdiği son 100 mesaj.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Henüz bir otomasyon etkinliği yok.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const statusInfo = EVENT_STATUS_INFO[event.status] ?? EVENT_STATUS_INFO.pending_manual;
              return (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{EVENT_TYPE_LABELS[event.type] ?? event.type}</p>
                    <p className="truncate text-xs text-muted-foreground">{event.message}</p>
                    {event.errorMessage && <p className="text-xs text-destructive">{event.errorMessage}</p>}
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {event.status === "pending_manual" && (
                    <Button size="sm" variant="outline" disabled={sendingId === event.id} onClick={() => handleMarkSent(event)}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Gönder
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
