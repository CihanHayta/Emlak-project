import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home as HomeIcon, Lock, Mail, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerTenant } from "../lib/auth";

/**
 * "/admin/register" — self-service sign-up for a brand new real estate
 * agency (tenant). Same visual shell as Login.jsx. On success this creates
 * a real Firebase Auth account, a new `tenants` document, and makes the new
 * user its "owner" (see lib/auth.js's registerTenant + server's
 * POST /auth/register-tenant) — no manual bootstrap script needed anymore.
 */
export default function Register() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await registerTenant({ email, password, companyName, phone });
      toast.success(`${session.tenantName ?? companyName} hesabı oluşturuldu, hoş geldiniz!`);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Bu e-posta adresiyle zaten bir hesap var."
          : err.code === "auth/weak-password"
            ? "Şifre çok zayıf, daha güçlü bir şifre seçin."
            : err.message || "Kayıt oluşturulamadı, lütfen tekrar deneyin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy px-6 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brand-gold text-brand-gold">
            <HomeIcon className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-extrabold tracking-wide text-white">ŞAHİN EMLAK CRM</h1>
          <p className="mt-1 text-sm text-gray-400">Emlak Ofisiniz İçin Hesap Oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-gray-300">
              Firma Adı
            </Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Örnek Emlak"
                autoComplete="organization"
                required
                className="h-10 border-white/15 bg-white/5 pl-9 text-white placeholder:text-gray-500 focus-visible:ring-brand-gold/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-gray-300">
              E-posta
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="reg-email"
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
            <Label htmlFor="reg-password" className="text-gray-300">
              Şifre
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
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
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hesap Oluştur"}
          </Button>
        </form>

        <Link
          to="/admin/login"
          className="mt-6 block text-center text-xs text-gray-500 transition hover:text-gray-300"
        >
          Zaten hesabınız var mı? Giriş yapın
        </Link>
      </div>
    </div>
  );
}
