import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Icon-square color per stat "kind" — mirrors the reference dashboard
// mockup's purple/green/amber/blue tiles.
const TONE_STYLES = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
};

/** One stat tile: icon + big number + label + sublabel. */
export default function StatCard({ icon: Icon, value, label, sublabel, tone = "blue" }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-center gap-4 py-1">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[tone])}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sublabel && <p className="truncate text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
