import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  Settings,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getCustomers } from "../data/customerStore";
import { getSaleProperties, getRentProperties } from "../../data/properties";

const PAGES = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "İlanlar", to: "/admin/ilanlar", icon: Building2 },
  { label: "Başvurular", to: "/admin/basvurular", icon: FileText },
  { label: "Randevular", to: "/admin/randevular", icon: CalendarDays },
  { label: "Müşteriler", to: "/admin/musteriler", icon: Users },
  { label: "Mesajlar", to: "/admin/mesajlar", icon: MessageSquare },
  { label: "Bildirimler", to: "/admin/bildirimler", icon: Bell },
  { label: "Ayarlar", to: "/admin/ayarlar", icon: Settings },
];

const QUICK_ACTIONS = [
  { label: "Yeni İlan Ekle", to: "/admin/ilanlar/yeni", icon: Plus },
  { label: "Yeni Müşteri Ekle", to: "/admin/musteriler?yeni=1", icon: UserPlus },
];

/**
 * Global "⌘K" search: jump to any admin page, or jump straight to a
 * customer/listing by name. Mounted once in AdminLayout; `open`/`onOpenChange`
 * are lifted up to AdminLayout so both the ⌘K keyboard shortcut and the
 * Topbar's search button can trigger the same dialog.
 */
export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();

  function go(to) {
    onOpenChange(false);
    navigate(to);
  }

  const customers = getCustomers();
  const listings = [...getSaleProperties(), ...getRentProperties()].filter((p) => p.hasVideo || p.category);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Genel Arama" description="Sayfa, müşteri veya ilan ara">
      {/* CommandDialog (this shadcn preset) renders the Dialog chrome but
          doesn't provide the cmdk root context itself — wrap here so
          CommandInput/CommandList have a store to read from. */}
      <Command>
        <CommandInput placeholder="Sayfa, müşteri veya ilan ara... (⌘K)" />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

          <CommandGroup heading="Sayfalar">
            {PAGES.map(({ label, to, icon: Icon }) => (
              <CommandItem key={to} value={label} onSelect={() => go(to)}>
                <Icon className="h-4 w-4" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Hızlı İşlemler">
            {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
              <CommandItem key={to} value={label} onSelect={() => go(to)}>
                <Icon className="h-4 w-4" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Müşteriler">
            {customers.slice(0, 6).map((customer) => (
              <CommandItem
                key={customer.id}
                value={`${customer.name} ${customer.phone}`}
                onSelect={() => go(`/admin/musteriler?id=${customer.id}`)}
              >
                <Users className="h-4 w-4" />
                {customer.name}
                <span className="ml-auto text-xs text-muted-foreground">{customer.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="İlanlar">
            {listings.slice(0, 6).map((listing) => (
              <CommandItem
                key={listing.id}
                value={`${listing.title} ${listing.listingNo}`}
                onSelect={() => go(`/admin/ilanlar/${listing.id}`)}
              >
                <Building2 className="h-4 w-4" />
                {listing.title}
                <span className="ml-auto text-xs text-muted-foreground">#{listing.listingNo}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
