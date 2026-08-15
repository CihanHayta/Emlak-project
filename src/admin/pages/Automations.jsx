import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, CalendarClock, MessageCircleReply, Loader2, ExternalLink, AlarmClock } from "lucide-react";
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

const TEMPLATE_SUBMIT_HINT = {
  not_submitted: "Bir kere tıklamanız yeterli. Meta onayladıktan sonra bu mesaj otomatik gönderilir, tekrar tıklamanıza gerek kalmaz. Metni sonradan değiştirmek isterseniz, düzenleyip tekrar gönderebilirsiniz.",
  pending: "Meta metni inceliyor, genelde birkaç saat içinde sonuçlanır. Aşağıdaki butonla durumu kontrol edebilirsiniz.",
  approved: "Şablon onaylı, mesaj artık otomatik gönderiliyor — herhangi bir şey yapmanıza gerek yok. Metni değiştirirseniz, yeni metni tekrar onaya göndermeniz gerekir.",
  rejected: "Meta bu metni onaylamadı. Metni düzenleyip tekrar gönderebilirsiniz.",
};

// server/src/services/automation.service.js#AUTOMATION_TEMPLATE_DEFAULTS ile
// AYNI metinler — sadece boş bırakıldığında ne kullanılacağını göstermek
// için burada da tutuluyor (backend zaten kendi varsayılanını uygular,
// burası SADECE görüntü amaçlı bir placeholder).
const DEFAULT_TEMPLATE_TEXT = {
  listingMatch: "Merhaba {{1}}, aradığınız kriterlere uygun yeni bir ilan bulduk: {{2}}.",
  appointmentReminder: "Merhaba {{1}}, {{2}} tarihindeki randevunuzu hatırlatmak isteriz.",
};

const EVENT_TYPE_LABELS = { listingMatch: "Yeni İlan Eşleşmesi", appointmentReminder: "Randevu Hatırlatması", windowClosing: "24 Saat Penceresi Uyarısı" };
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
      <WindowClosingAlertCard settings={settings.windowClosingAlert} />
      <EventsLog events={events} />
    </div>
  );
}

/** Tam olarak bir kere {{1}} ve bir kere {{2}} içeriyor mu — backend'in
 * automation.validator.js#validateTemplatePlaceholders'ıyla AYNI kural,
 * kullanıcı "Kaydet"e basmadan önce anında geri bildirim versin diye. */
function hasValidPlaceholders(text) {
  const count = (token) => text.split(token).length - 1;
  return count("{{1}}") === 1 && count("{{2}}") === 1 && !text.includes("{{3}}");
}

function TemplateControls({ type, settings, onSettingsChange }) {
  const { templateStatus, templateBodyText } = settings;
  const [text, setText] = useState(templateBodyText || DEFAULT_TEMPLATE_TEXT[type]);
  const [savingText, setSavingText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const info = TEMPLATE_STATUS_INFO[templateStatus] ?? TEMPLATE_STATUS_INFO.not_submitted;
  const textChanged = text.trim() !== (templateBodyText || DEFAULT_TEMPLATE_TEXT[type]);
  const placeholdersValid = hasValidPlaceholders(text);

  useEffect(() => setText(templateBodyText || DEFAULT_TEMPLATE_TEXT[type]), [templateBodyText, type]);

  async function handleSaveText() {
    if (!placeholdersValid) {
      toast.error("Mesaj tam olarak bir kere {{1}} (müşteri adı) ve bir kere {{2}} (detay) içermeli.");
      return;
    }
    setSavingText(true);
    try {
      const updated = await onSettingsChange({ templateBodyText: text.trim() });
      toast.success("Mesaj metni kaydedildi.");
      return updated;
    } catch (error) {
      toast.error(error.message || "Metin kaydedilemedi.");
    } finally {
      setSavingText(false);
    }
  }

  async function handleSubmit() {
    if (textChanged) {
      const saved = await handleSaveText();
      if (!saved) return; // kaydetme başarısız oldu, Meta'ya göndermeyi deneme
    }
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
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label htmlFor={`${type}-body`} className="text-xs text-muted-foreground">
          Mesaj metni — {"{{1}}"} müşteri adı, {"{{2}}"} detay olarak doldurulur, istediğiniz gibi düzenleyebilirsiniz
        </Label>
        <Textarea id={`${type}-body`} rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        {!placeholdersValid && <p className="text-xs text-destructive">Tam olarak bir kere {"{{1}}"} ve bir kere {"{{2}}"} olmalı.</p>}
        {textChanged && placeholdersValid && (
          <Button size="sm" variant="outline" disabled={savingText} onClick={handleSaveText}>
            {savingText ? "Kaydediliyor…" : "Metni Kaydet"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={info.variant}>{info.label}</Badge>
        {templateStatus !== "pending" && (
          <Button size="sm" variant="outline" disabled={submitting || savingText || !placeholdersValid} onClick={handleSubmit}>
            {submitting ? "Gönderiliyor…" : templateStatus === "not_submitted" ? "Şablonu Meta'ya Gönder" : "Yeniden Gönder"}
          </Button>
        )}
        {templateStatus === "pending" && (
          <Button size="sm" variant="outline" disabled={refreshing} onClick={handleRefresh}>
            {refreshing ? "Kontrol ediliyor…" : "Onay Durumunu Yenile"}
          </Button>
        )}
        <p className="w-full text-xs text-muted-foreground">{TEMPLATE_SUBMIT_HINT[templateStatus] ?? TEMPLATE_SUBMIT_HINT.not_submitted}</p>
        {templateStatus !== "approved" && (
          <p className="w-full text-xs text-muted-foreground">
            Şablon onaylanana kadar mesajlar hazırlanır, aşağıdaki geçmiş listesinden tek tıkla WhatsApp&apos;tan elle gönderebilirsiniz.
          </p>
        )}
      </div>
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

  async function handleSettingsChange(partial) {
    const updated = await updateAutomationSettings({ listingMatch: { ...settings, ...partial } });
    return updated.listingMatch;
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
        <TemplateControls type="listingMatch" settings={settings} onSettingsChange={handleSettingsChange} />
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

  async function handleSettingsChange(partial) {
    const updated = await updateAutomationSettings({ appointmentReminder: { ...settings, ...partial } });
    return updated.appointmentReminder;
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
        <TemplateControls type="appointmentReminder" settings={settings} onSettingsChange={handleSettingsChange} />
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

/**
 * "24 Saat Penceresi Uyarısı" — REAKTİF değil ama dışarıya (müşteriye)
 * hiçbir mesaj gitmez, TAMAMEN içsel: mesai saatleri içinde, bir müşteri
 * size yazıp cevap alamamışsa ve Meta'nın 24 saatlik ücretsiz mesajlaşma
 * penceresi kapanmak üzereyse aşağıdaki listeye bir uyarı düşer. Şablon
 * gerekmez (dış API'ye hiç çıkmaz), açar açmaz aktif olur. Çalışma
 * saatlerini "Mesai Dışı Otomatik Yanıt" kartındakiyle PAYLAŞIR — ayrı bir
 * saat ayarı yok, mesai dışında zaten elinizden bir şey gelmez.
 */
function WindowClosingAlertCard({ settings }) {
  const [toggling, setToggling] = useState(false);
  const [hoursBefore, setHoursBefore] = useState(settings.hoursBefore);

  useEffect(() => setHoursBefore(settings.hoursBefore), [settings.hoursBefore]);

  async function handleToggle(enabled) {
    setToggling(true);
    try {
      await updateAutomationSettings({ windowClosingAlert: { ...settings, enabled } });
      toast.success(enabled ? "24 Saat Penceresi Uyarısı açıldı." : "24 Saat Penceresi Uyarısı kapatıldı.");
    } catch (error) {
      toast.error(error.message || "Ayar güncellenemedi.");
    } finally {
      setToggling(false);
    }
  }

  async function handleHoursBlur() {
    const value = Math.min(23, Math.max(1, Number(hoursBefore) || settings.hoursBefore));
    setHoursBefore(value);
    if (value === settings.hoursBefore) return;
    try {
      await updateAutomationSettings({ windowClosingAlert: { ...settings, hoursBefore: value } });
      toast.success("Uyarı süresi güncellendi.");
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
              <AlarmClock className="h-4 w-4 text-brand-gold" />
              24 Saat Penceresi Uyarısı
            </CardTitle>
            <CardDescription>
              Bir müşteri yazdı, siz henüz cevap vermediniz ve ücretsiz mesajlaşma penceresi kapanmak üzere — mesai saatleri içinde aşağıdaki listeye bir uyarı düşer. Müşteriye hiçbir şey gönderilmez, şablon gerekmez.
            </CardDescription>
          </div>
          <Switch checked={settings.enabled} disabled={toggling} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Label htmlFor="windowHoursBefore" className="text-sm text-muted-foreground">Kapanmasına kaç saat kala uyar:</Label>
          <Input
            id="windowHoursBefore"
            type="number"
            min={1}
            max={23}
            value={hoursBefore}
            onChange={(e) => setHoursBefore(e.target.value)}
            onBlur={handleHoursBlur}
            className="w-20"
          />
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
