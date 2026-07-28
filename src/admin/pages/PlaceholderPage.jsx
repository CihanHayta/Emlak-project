import { Construction } from "lucide-react";

/** Shared "not built yet" placeholder for admin pages still in progress. */
export default function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
      <Construction className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">Bu sayfa yakında hazır olacak.</p>
    </div>
  );
}
