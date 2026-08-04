import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Copy, UserPlus, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFunnelById, updateFunnel } from "../data/funnelStore";
import MediaUploadField from "../components/MediaUploadField";
import { isYoutubeUrl } from "../../lib/youtube";
import { getLeads, subscribeToLeads, updateLeadStatus } from "../../lib/leadStore";
import { addCustomer } from "../data/customerStore";
import CustomerSheet from "../components/CustomerSheet";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import { LEAD_STATUS_STYLES } from "../data/constants";
import { toMillis } from "../../lib/firestoreTimestamp";
import { cn } from "@/lib/utils";

function funnelUrl(slug) {
  return `${window.location.origin}/kampanya/${slug}`;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  headline: "",
  subheadline: "",
  videoUrl: "",
  heroImage: "",
  ctaText: "Hemen Bilgi Al",
  formEnabled: true,
  status: "draft",
};

/**
 * "/admin/funnel/:id" — kampanya sayfası düzenleme + o sayfadan gelen
 * başvuruların listesi (aynı kayıtlar, kaynağı belli olsun diye ayrıca
 * "/admin/basvurular"da da Kampanya rozetiyle görünür — bkz.
 * IncomingLeads.jsx — ama randevu/müşteri dönüştürme burada da yapılabilir,
 * agent hangisini açtıysa orada işlem yapabilsin diye). Yeni funnel
 * oluşturma UI'dan bilerek kaldırıldı (her kampanya sayfası artık referans
 * bir tasarıma göre elle kodlanıyor, bkz. src/pages/FunnelPage.jsx).
 */
export default function FunnelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = getFunnelById(id);

  const [form, setForm] = useState(() => (existing ? { ...EMPTY_FORM, ...existing } : EMPTY_FORM));
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState(getLeads());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState({});
  const [convertingLeadId, setConvertingLeadId] = useState(null);
  const [appointmentTarget, setAppointmentTarget] = useState(null);

  useEffect(() => subscribeToLeads(() => setLeads(getLeads())), []);

  // Funnel, store'un ilk yüklemesi tamamlanmadan (sayfaya doğrudan linkten
  // girildiğinde) gelmişse veriyi geç doldur.
  useEffect(() => {
    if (existing && form.name === "") {
      setForm({ ...EMPTY_FORM, ...existing });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Ad zorunlu.");
    setSaving(true);
    try {
      await updateFunnel(id, form);
      toast.success("Funnel güncellendi.");
    } catch (error) {
      toast.error(error.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(funnelUrl(form.slug));
      toast.success("Bağlantı kopyalandı.");
    } catch {
      toast.error("Bağlantı kopyalanamadı.");
    }
  }

  function handleConvertLead(lead) {
    setConvertingLeadId(lead.id);
    setPrefill({ name: lead.name, phone: lead.phone, notes: lead.message, source: "Kampanya" });
    setSheetOpen(true);
  }

  async function handleCustomerSaved() {
    if (convertingLeadId) {
      try {
        await updateLeadStatus(convertingLeadId, "Müşteri Oldu");
      } catch (error) {
        toast.error(error.message || "Başvuru durumu güncellenemedi.");
      }
      setConvertingLeadId(null);
    }
  }

  async function handleCreateAppointment(lead) {
    try {
      const customer = await addCustomer({ name: lead.name, phone: lead.phone, notes: lead.message, source: "Kampanya" });
      setAppointmentTarget({ leadId: lead.id, customer });
    } catch (error) {
      toast.error(error.message || "Müşteri kartı oluşturulamadı.");
    }
  }

  async function handleAppointmentSaved() {
    if (appointmentTarget) {
      try {
        await updateLeadStatus(appointmentTarget.leadId, "Randevu Verildi");
      } catch (error) {
        toast.error(error.message || "Başvuru durumu güncellenemedi.");
      }
    }
  }

  const submissions = leads.filter((l) => l.funnelId === id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/funnel")}>
        <ArrowLeft className="h-4 w-4" />
        Funnel&apos;lara dön
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kampanya Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-name">Ad (sadece siz görürsünüz)</Label>
                <Input id="f-name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Örn: Yazlık Kampanya 2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-slug">Adres (URL)</Label>
                <Input id="f-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="otomatik oluşturulur" />
              </div>
            </div>

            {form.slug && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{funnelUrl(form.slug)}</span>
                <button type="button" onClick={handleCopyLink} title="Kopyala">
                  <Copy className="h-3.5 w-3.5 hover:text-foreground" />
                </button>
                {form.status === "published" && (
                  <a href={funnelUrl(form.slug)} target="_blank" rel="noopener noreferrer" title="Sayfayı aç">
                    <ExternalLink className="h-3.5 w-3.5 hover:text-foreground" />
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Yayında</p>
                <p className="text-xs text-muted-foreground">
                  Kapalıyken sayfa genel ziyaretçilere görünmez, sadece siz önizleyebilirsiniz.
                </p>
              </div>
              <Switch
                checked={form.status === "published"}
                onCheckedChange={(checked) => set("status", checked ? "published" : "draft")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sayfa İçeriği</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-headline">Başlık</Label>
              <Textarea id="f-headline" rows={3} value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder={"Örn: Kişiye Özel\n**Boğaz Manzaralı Yazlık Fırsatları**\nSizi Bekliyor"} />
              <p className="text-[11px] text-muted-foreground">
                Enter ile satır kırabilirsiniz. Vurgulamak istediğiniz kısmı <strong>**iki yıldız**</strong> arasına yazın, sayfada altın renkli görünür.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-subheadline">Alt Başlık</Label>
              <Textarea id="f-subheadline" rows={2} value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
            </div>

            <MediaUploadField
              label="Kapak Görseli"
              accept="image/*"
              value={form.heroImage ? [form.heroImage] : []}
              onChange={(urls) => set("heroImage", urls[urls.length - 1] || "")}
            />

            <div className="space-y-1.5">
              <Label htmlFor="f-video">YouTube Video Bağlantısı (opsiyonel)</Label>
              <Input id="f-video" value={isYoutubeUrl(form.videoUrl) ? form.videoUrl : ""} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <MediaUploadField
              label="veya kendi videonuzu yükleyin"
              accept="video/*"
              isVideo
              value={form.videoUrl && !isYoutubeUrl(form.videoUrl) ? [form.videoUrl] : []}
              onChange={(urls) => set("videoUrl", urls[urls.length - 1] || "")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Çağrı (CTA) ve Randevu Formu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-cta-text">Buton Metni</Label>
              <Input id="f-cta-text" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Randevu Formu</p>
                <p className="text-xs text-muted-foreground">Açıkken CTA butonuna tıklayınca ad/telefon toplayan bir popup açılır.</p>
              </div>
              <Switch checked={form.formEnabled} onCheckedChange={(checked) => set("formEnabled", checked)} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark">
          Kaydet
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Bu Sayfadan Gelen Başvurular ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {submissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Henüz başvuru yok.</p>
          ) : (
            submissions
              .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
              .map((lead) => (
                <div key={lead.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
                    {lead.message && <p className="mt-1 truncate text-xs text-muted-foreground">“{lead.message}”</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", LEAD_STATUS_STYLES[lead.status ?? "Yeni"])}>
                      {lead.status ?? "Yeni"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleCreateAppointment(lead)}>
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Randevu
                    </Button>
                    <Button size="sm" className="bg-brand-gold text-white hover:bg-brand-gold-dark" onClick={() => handleConvertLead(lead)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Müşteri Yap
                    </Button>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={null}
        prefill={prefill}
        onSaved={handleCustomerSaved}
      />

      {appointmentTarget && (
        <AppointmentFormDialog
          key={appointmentTarget.customer.id}
          open
          onOpenChange={(o) => !o && setAppointmentTarget(null)}
          appointment={null}
          initialCustomerId={appointmentTarget.customer.id}
          initialServiceType="İlan Gösterimi"
          onSaved={handleAppointmentSaved}
        />
      )}
    </div>
  );
}
