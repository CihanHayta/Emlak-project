import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home as HomeIcon, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../lib/auth";

/**
 * "/admin/login" — the only unguarded admin route (see RequireAuth.jsx).
 * Real Firebase Authentication (email/password) + the backend's session
 * cookie — see lib/auth.js.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const session = await login(email, password);
      toast.success(`Hoş geldiniz, ${session.name}!`);
      const redirectTo = location.state?.from ?? "/admin";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found"
          ? "E-posta veya şifre hatalı."
          : err.message || "Giriş yapılamadı, lütfen tekrar deneyin.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            <Label htmlFor="email" className="text-gray-300">
              E-posta
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sahinemlak.com"
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Giriş Yap"}
          </Button>
        </form>

        <Link
          to="/admin/register"
          className="mt-6 block text-center text-xs text-gray-400 transition hover:text-brand-gold"
        >
          Yeni emlak ofisi misiniz? Hesap oluşturun
        </Link>
        <Link
          to="/"
          className="mt-2 block text-center text-xs text-gray-500 transition hover:text-gray-300"
        >
          ← Siteye dön
        </Link>
      </div>
    </div>
  );
}
