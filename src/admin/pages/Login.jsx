import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home as HomeIcon, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../lib/auth";

/**
 * "/admin/login" — the only unguarded admin route (see RequireAuth.jsx).
 *
 * Demo credentials: kullanıcı adı "admin", şifre "1234" (see lib/auth.js).
 * There's no real backend yet, so this is a local-only mock session — good
 * enough to gate the panel for a demo, not for production security.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const session = login(username, password);
    if (!session) {
      setError("Kullanıcı adı veya şifre hatalı.");
      return;
    }
    toast.success(`Hoş geldiniz, ${session.name}!`);
    const redirectTo = location.state?.from ?? "/admin";
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy px-6">
      {/* Soft ambient glow behind the card for a bit of depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brand-gold text-brand-gold">
            <HomeIcon className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-extrabold tracking-wide text-white">ŞAHİN EMLAK</h1>
          <p className="mt-1 text-sm text-gray-400">Yönetim Paneline Giriş</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-gray-300">
              Kullanıcı Adı
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="h-10 border-white/15 bg-white/5 pl-9 text-white placeholder:text-gray-500 focus-visible:ring-brand-gold/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-300">
              Şifre
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                required
                className="h-10 border-white/15 bg-white/5 pl-9 text-white placeholder:text-gray-500 focus-visible:ring-brand-gold/40"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="h-10 w-full bg-brand-gold text-white hover:bg-brand-gold-dark">
            Giriş Yap
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Demo hesap: <span className="text-gray-300">admin</span> / <span className="text-gray-300">1234</span>
        </p>

        <Link
          to="/"
          className="mt-4 block text-center text-xs text-gray-500 transition hover:text-gray-300"
        >
          ← Siteye dön
        </Link>
      </div>
    </div>
  );
}
