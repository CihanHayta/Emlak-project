import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "../../components/common/BrandIcons";
import { buildWhatsAppLink } from "../../config/siteConfig";

/**
 * Shown right after a new listing is created: "Bu ilana uygun N eski
 * müşteri bulundu" — everyone findMatchingCustomers() thinks might want
 * it, each with a one-click WhatsApp message already written about this
 * specific listing.
 */
export default function MatchedCustomersDialog({ open, onOpenChange, listing, matches }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {matches.length > 0
              ? `Bu ilana uygun ${matches.length} eski müşteri bulundu`
              : "Uygun müşteri bulunamadı"}
          </DialogTitle>
          <DialogDescription>
            {matches.length > 0
              ? `"${listing?.title}" ilanı, ilgi alanı/bütçesi/konumu uyan müşterilere tek tıkla iletilebilir.`
              : "İlgi alanı, bütçesi veya konumu bu ilana uyan bir müşteri kartı bulunamadı."}
          </DialogDescription>
        </DialogHeader>

        {matches.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {matches.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
                </div>
                <a
                  href={buildWhatsAppLink(
                    `Merhaba ${customer.name}, aradığınız kriterlere uygun yeni bir ilanımız var: "${listing?.title}" — ${listing?.price}. Detaylı bilgi almak ister misiniz?`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-[#25D366] text-white hover:brightness-95">
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    Mesaj Gönder
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
