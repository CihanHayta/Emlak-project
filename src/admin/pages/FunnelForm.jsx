import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFunnelById, addFunnel, updateFunnel } from "../data/funnelStore";
import { getLeads, subscribeToLeads } from "../../lib/leadStore";
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
  ctaWhatsappMessage: "",
  formEnabled: true,
  status: "draft",
};

/**
 * "/admin/funnel/yeni" ve "/admin/funnel/:id" — kampanya sayfası
 * oluşturma/düzenleme + (düzenleme modunda) o sayfadan gelen başvuruların
 * listesi. Genel (public) tarafı için bkz. src/pages/FunnelPage.jsx —
 * burada girilen her alan aynen orada render edilir.
 */
export default function FunnelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const existing = isEditing ? getFunnelById(id) : null;

  const [form, setForm] = useState(() => (existing ? { ...EMPTY_FORM, ...existing } : EMPTY_FORM));
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState(getLeads());

  useEffect(() => subscribeToLeads(() => setLeads(getLeads())), []);

  // Düzenleme modunda, funnel henüz store'un ilk yüklemesi tamamlanmadan
  // gelmişse (sayfaya doğrudan linkten girildiğinde) veriyi geç doldur.
  useEffect(() => {
    if (isEditing && existing && form.name === "") {
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
      if (isEditing) {
        await updateFunnel(id, form);
        toast.success("Funnel güncellendi.");
      } else {
        const created = await addFunnel(form);
        toast.success("Funnel oluşturuldu.");
        navigate(`/admin/funnel/${created.id}`, { replace: true });
        return;
      }
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

  const submissions = isEditing ? leads.filter((l) => l.funnelId === id) : [];

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

            {isEditing && form.slug && (
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
              <Input id="f-headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Örn: Boğaz Manzaralı Yazlık Fırsatları" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-subheadline">Alt Başlık</Label>
              <Textarea id="f-subheadline" rows={2} value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-hero">Kapak Görseli (URL)</Label>
              <Input id="f-hero" value={form.heroImage} onChange={(e) => set("heroImage", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-video">YouTube Video Bağlantısı (opsiyonel)</Label>
              <Input id="f-video" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Çağrı (CTA) ve Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-cta-text">Buton Metni</Label>
              <Input id="f-cta-text" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cta-msg">WhatsApp&apos;ta Açılacak Hazır Mesaj</Label>
              <Input id="f-cta-msg" value={form.ctaWhatsappMessage} onChange={(e) => set("ctaWhatsappMessage", e.target.value)} placeholder="Örn: Yazlık kampanyası hakkında bilgi almak istiyorum." />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">İletişim Formu</p>
                <p className="text-xs text-muted-foreground">Açıkken sayfada ad/telefon toplayan bir form da gösterilir.</p>
              </div>
              <Switch checked={form.formEnabled} onCheckedChange={(checked) => set("formEnabled", checked)} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark">
          {isEditing ? "Kaydet" : "Funnel Oluştur"}
        </Button>
      </form>

      {isEditing && (
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
                  <div key={lead.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lead.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", LEAD_STATUS_STYLES[lead.status])}>
                      {lead.status}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
