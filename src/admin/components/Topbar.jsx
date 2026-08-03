import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Search, Sun, Moon, LogOut, Settings as SettingsIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSession, logout } from "../lib/auth";
import NotificationBell from "./NotificationBell";

/**
 * Top bar: page title/subtitle on the left (set per-page by AdminLayout's
 * route->title map), global search + theme toggle + notifications + user
 * menu on the right. Pinned across every admin page.
 */
export default function Topbar({ title, subtitle, onOpenSearch }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const session = getSession();

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Global search / ⌘K trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted sm:flex"
        >
          <Search className="h-4 w-4" />
          Arama yap...
          <kbd className="ml-6 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        <Button variant="outline" size="icon" className="sm:hidden" onClick={onOpenSearch} aria-label="Ara">
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Temayı değiştir"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {session?.name?.charAt(0) ?? "A"}
              </span>
              <span className="hidden text-sm font-medium sm:inline">{session?.name ?? "Admin"}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{session?.name ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/admin/ayarlar")}>
              <SettingsIcon className="h-4 w-4" />
              Ayarlar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
