import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/**
 * Generic "are you sure?" confirmation before a destructive action (deleting
 * a listing, a customer card, ...). Reused everywhere something gets
 * permanently removed, so nothing disappears from a single accidental click.
 *
 * Silme sürerken kendi "isDeleting" durumunu tutup butonu pasifleştiriyor —
 * hiçbir çağıran (Listings.jsx, Customers.jsx, Funnels.jsx, ...) kendi
 * isSubmitting state'ini eklemek zorunda kalmadan, tek bu dosyayı düzeltmek
 * TÜM silme akışlarını çift-tıklamaya karşı koruyor (2026-08-13). Radix'in
 * AlertDialogAction'ı varsayılan olarak tıklanınca diyaloğu ANINDA kapatır —
 * `preventDefault` bunu engelliyor, diyalog `onConfirm` bitene kadar (ve
 * çağıranın kendi `finally`'sinde `open`'ı false yapmasına kadar) açık kalıp
 * "Siliniyor…" durumunu gösterebiliyor.
 */
export default function ConfirmDeleteDialog({ open, onOpenChange, title, description, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm(event) {
    event.preventDefault();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting ? "Siliniyor…" : "Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
