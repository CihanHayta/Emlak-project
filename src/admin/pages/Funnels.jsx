import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Trash2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFunnels, subscribeToFunnels, deleteFunnel } from "../data/funnelStore";
import { getLeads, subscribeToLeads, updateLeadStatus } from "../../lib/leadStore";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import IncomingLeads from "../components/IncomingLeads";
import CustomerSheet from "../components/CustomerSheet";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import { addCustomer } from "../data/customerStore";

function funnelUrl(slug) {
  return `${window.location.origin}/kampanya/${slug}`;
}

/**
 * "/admin/funnel" — Instagram/reklam trafiği için oluşturulan kampanya
 * sayfalarının listesi. Sadece owner görür (bkz. Sidebar.jsx'in
 * `ownerOnly` bayrağı) — kampanya yayınlama bir işletme kararı.
 */
export default function Funnels() {
  const [funnels, setFunnels] = useState(getFunnels());
  const [leads, setLeads] = useState(getLeads());
  const [pendingDelete, setPendingDelete] = useState(null);

  // Kampanya kartları alanı — Basvurular.jsx'teki aynı desen (bkz. o dosyanın
  // yorumları): "Müşteri Yap" akışı için CustomerSheet, "Randevu Oluştur"
  // akışı için önce hafif bir müşteri kaydı + AppointmentFormDialog.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState({});
  const [convertingLeadId, setConvertingLeadId] = useState(null);
  const [appointmentTarget, setAppointmentTarget] = useState(null);

  useEffect(() => {
    const unsubFunnels = subscribeToFunnels(() => setFunnels(getFunnels()));
    const unsubLeads = subscribeToLeads(() => setLeads(getLeads()));
    return () => {
      unsubFunnels();
      unsubLeads();
    };
  }, []);

  function submissionCount(funnelId) {
    return leads.filter((l) => l.funnelId === funnelId).length;
  }

  const campaignLeads = leads.filter((l) => l.funnelId != null);

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

  async function handleCopyLink(slug) {
    try {
      await navigator.clipboard.writeText(funnelUrl(slug));
      toast.success("Bağlantı kopyalandı.");
    } catch {
      toast.error("Bağlantı kopyalanamadı.");
    }
  }

  async function confirmDelete() {
    try {
      await deleteFunnel(pendingDelete.id);
      toast.success(`"${pendingDelete.name}" silindi.`);
    } catch (error) {
      toast.error(error.message || "Funnel silinemedi.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Instagram/reklam trafiği için hazırlanan kampanya sayfaları — gelen başvurular ayrı ayrı listelenir.
      </p>

      {funnels.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Henüz bir kampanya sayfası yok.</p>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Başvuru</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">/kampanya/{f.slug}</span>
                      <button type="button" onClick={() => handleCopyLink(f.slug)} title="Bağlantıyı kopyala">
                        <Copy className="h-3.5 w-3.5 shrink-0 hover:text-foreground" />
                      </button>
                      {f.status === "published" && (
                        <a href={funnelUrl(f.slug)} target="_blank" rel="noopener noreferrer" title="Sayfayı aç">
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "published" ? "default" : "outline"} className={f.status === "published" ? "bg-emerald-600" : undefined}>
                      {f.status === "published" ? "Yayında" : "Taslak"}
                    </Badge>
                  </TableCell>
                  <TableCell>{submissionCount(f.id)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/admin/funnel/${f.id}`} aria-label="Düzenle">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(f)} aria-label="Sil">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(o) => !o && setPendingDelete(null)}
          title="Funnel'ı sil"
          description={`"${pendingDelete.name}" kampanya sayfasını kalıcı olarak silmek istediğinize emin misiniz? Yayındaysa sayfa da erişilemez hale gelir.`}
          onConfirm={confirmDelete}
        />
      )}

      <div className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-foreground">Kampanya Başvuruları ({campaignLeads.length})</h2>
        <IncomingLeads leads={campaignLeads} onConvert={handleConvertLead} onCreateAppointment={handleCreateAppointment} />
      </div>

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
          onSaved={handleAppointmentSaved}
        />
      )}
    </div>
  );
}
