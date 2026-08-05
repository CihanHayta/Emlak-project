import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Link2Off } from "lucide-react";
import { InstagramIcon, WhatsAppIcon, FacebookIcon } from "../../components/common/BrandIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { getUsers, addUser, updateUser, deleteUser, subscribeToUsers, ROLE_LABELS, ASSIGNABLE_ROLES } from "../data/userStore";
import { getSession } from "../lib/auth";
import {
  getRolePermissions,
  togglePermission,
  subscribeToSettings,
  USER_ROLES,
  ALL_PERMISSIONS,
} from "../data/settingsStore";
import {
  getInstagramStatus,
  subscribeToInstagramStatus,
  goToInstagramConnect,
  disconnectInstagram,
  getWhatsappStatus,
  subscribeToWhatsappStatus,
  connectWhatsapp,
  connectWhatsappManual,
  disconnectWhatsapp,
  getFacebookPageStatus,
  subscribeToFacebookPageStatus,
  connectFacebookPageManual,
  disconnectFacebookPage,
} from "../data/integrationsStore";
import { startWhatsappEmbeddedSignup, isEmbeddedSignupConfigured } from "../lib/whatsappEmbeddedSignup";

const ROLE_BADGE = {
  owner: "bg-brand-navy text-white",
  assistant: "bg-blue-100 text-blue-700",
  agent: "bg-emerald-100 text-emerald-700",
};

/**
 * "/admin/ayarlar" — Kullanıcılar (gerçek Firebase Auth + Firestore
 * hesapları, sadece admin yönetebilir) ve Yetkiler (rol -> bölüm erişimi,
 * hâlâ yerel/kozmetik bir referans tablosu).
 */
export default function Settings() {
  const isOwner = getSession()?.role === "owner";
  const [users, setUsers] = useState(getUsers());
  const [permissions, setPermissions] = useState(getRolePermissions());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => subscribeToUsers(() => setUsers(getUsers())), []);
  useEffect(() => subscribeToSettings(() => setPermissions(getRolePermissions())), []);

  // OAuth callback backend'den `?instagram=connected|error` ile geri
  // döndüğünde bir kere toast göster, sonra query param'ı temizle (F5'te
  // tekrar tekrar toast çıkmasın diye).
  useEffect(() => {
    const result = searchParams.get("instagram");
    if (!result) return;
    if (result === "connected") toast.success("Instagram hesabı bağlandı.");
    if (result === "error") toast.error("Instagram hesabı bağlanamadı, lütfen tekrar deneyin.");
    setSearchParams((params) => {
      params.delete("instagram");
      return params;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete() {
    try {
      await deleteUser(deleteTarget.id);
      toast.success("Kullanıcı silindi.");
    } catch (error) {
      toast.error(error.message || "Kullanıcı silinemedi.");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggleStatus(user) {
    try {
      await updateUser(user.id, { status: user.status === "active" ? "passive" : "active" });
      toast.success(user.status === "active" ? "Kullanıcı pasif yapıldı." : "Kullanıcı aktif yapıldı.");
    } catch (error) {
      toast.error(error.message || "Durum güncellenemedi.");
    }
  }

  // Kullanıcı yönetimi/yetkiler sadece admin'in (owner) işi — Danışman ya da
  // Personel doğrudan /admin/ayarlar'a gitmeye çalışırsa (sidebar'da link
  // zaten yok, ama URL'i elle yazabilir) buradan çevrilir.
  if (!isOwner) return <Navigate to="/admin" replace />;

  return (
    <Tabs defaultValue="kullanicilar" className="max-w-3xl">
      <TabsList>
        <TabsTrigger value="kullanicilar">Kullanıcılar</TabsTrigger>
        <TabsTrigger value="yetkiler">Yetkiler</TabsTrigger>
        <TabsTrigger value="entegrasyonlar">Entegrasyonlar</TabsTrigger>
      </TabsList>

      <TabsContent value="kullanicilar" className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
            <Plus className="h-4 w-4" />
            Kullanıcı Ekle
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">E-posta</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{user.displayName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "owner" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {user.status === "active" ? "Aktif" : "Pasif"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {user.role !== "owner" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditTarget(user)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="yetkiler" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Her rolün hangi bölümlere erişebileceğini belirleyin.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {USER_ROLES.map((role) => (
            <div key={role} className="space-y-3 rounded-2xl border border-border p-4">
              <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {role}
              </span>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={permissions[role]?.includes(permission) ?? false}
                      onCheckedChange={() => togglePermission(role, permission)}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="entegrasyonlar" className="space-y-4">
        <InstagramIntegrationCard />
        <WhatsAppIntegrationCard />
        <FacebookPageIntegrationCard />
      </TabsContent>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditUserDialog user={editTarget} open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)} />
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Kullanıcıyı sil"
        description={`${deleteTarget?.displayName || deleteTarget?.email} hesabını kalıcı olarak silmek istediğinize emin misiniz? Hem giriş yetkisi hem kayıt tamamen silinir, geri alınamaz.`}
        onConfirm={handleDelete}
      />
    </Tabs>
  );
}

/** Ayarlar > Entegrasyonlar — Instagram DM bağlantısını kurma/kaldırma. */
function InstagramIntegrationCard() {
  const [status, setStatus] = useState(getInstagramStatus());
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => subscribeToInstagramStatus(() => setStatus(getInstagramStatus())), []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectInstagram();
      toast.success("Instagram bağlantısı kaldırıldı.");
    } catch (error) {
      toast.error(error.message || "Bağlantı kaldırılamadı.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <InstagramIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Instagram</p>
            <p className="text-xs text-muted-foreground">
              {status.connected ? `@${status.username} bağlı` : "Bağlı değil"}
            </p>
          </div>
        </div>

        {status.connected ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            <Link2Off className="h-4 w-4" />
            {disconnecting ? "Kaldırılıyor…" : "Bağlantıyı Kaldır"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={goToInstagramConnect}
            className="bg-brand-gold text-white hover:bg-brand-gold-dark"
          >
            Instagram Hesabını Bağla
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Bağlandığında bu Instagram hesabına gelen mesajlar Mesajlar sayfasında görünür, oradan cevap verebilirsiniz.
      </p>
    </div>
  );
}

/** Ayarlar > Entegrasyonlar — WhatsApp bağlantısını kurma/kaldırma. Instagram'dan farklı olarak tam sayfa yönlendirme değil, bir Embedded Signup popup'ı açar. */
function WhatsAppIntegrationCard() {
  const [status, setStatus] = useState(getWhatsappStatus());
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => subscribeToWhatsappStatus(() => setStatus(getWhatsappStatus())), []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await startWhatsappEmbeddedSignup();
      await connectWhatsapp(result);
      toast.success("WhatsApp hattı bağlandı.");
    } catch (error) {
      toast.error(error.message || "WhatsApp bağlanamadı.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectWhatsapp();
      toast.success("WhatsApp bağlantısı kaldırıldı.");
    } catch (error) {
      toast.error(error.message || "Bağlantı kaldırılamadı.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <WhatsAppIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            <p className="text-xs text-muted-foreground">
              {status.connected ? `${status.displayPhoneNumber} bağlı` : "Bağlı değil"}
            </p>
          </div>
        </div>

        {status.connected ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            <Link2Off className="h-4 w-4" />
            {disconnecting ? "Kaldırılıyor…" : "Bağlantıyı Kaldır"}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setManualOpen(true)}>
              Elle Bağla
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConnect}
              disabled={connecting || !isEmbeddedSignupConfigured}
              title={!isEmbeddedSignupConfigured ? "WhatsApp entegrasyonu henüz yapılandırılmadı" : undefined}
              className="bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60"
            >
              {connecting ? "Bağlanıyor…" : "WhatsApp Hattını Bağla"}
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Bağlandığında bu WhatsApp hattına gelen mesajlar Mesajlar sayfasında görünür, oradan cevap verebilirsiniz.
        {!status.connected && " Business Verification tamamlanana kadar \"Elle Bağla\"yı kullanın."}
      </p>
      <WhatsAppManualConnectDialog open={manualOpen} onOpenChange={setManualOpen} />
    </div>
  );
}

/**
 * "Elle Bağla" — her müşteri kendi Meta App'inde WhatsApp ürününü kurup
 * (Try it out / Production setup adımları) Access Token, WABA id ve Phone
 * Number id'sini bu forma yapıştırır. Business Verification tamamlanıp
 * Embedded Signup gerçekten kullanılabilir olana kadarki asıl bağlama yolu.
 */
function WhatsAppManualConnectDialog({ open, onOpenChange }) {
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setAccessToken("");
    setWabaId("");
    setPhoneNumberId("");
    setDisplayPhoneNumber("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await connectWhatsappManual({
        accessToken: accessToken.trim(),
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhoneNumber.trim() || undefined,
      });
      toast.success("WhatsApp hattı bağlandı.");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "WhatsApp bağlanamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>WhatsApp&apos;ı Elle Bağla</DialogTitle>
          <DialogDescription>
            Meta App Dashboard &gt; WhatsApp &gt; &quot;Try it out&quot; / &quot;Production setup&quot; sayfasındaki değerleri yapıştırın.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-token">Access Token</Label>
            <Input id="wa-token" required value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-waba">WhatsApp Business Account ID</Label>
            <Input id="wa-waba" required value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone-id">Phone Number ID</Label>
            <Input id="wa-phone-id" required value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone-display">
              Görünen Telefon Numarası <span className="font-normal text-muted-foreground">(opsiyonel)</span>
            </Label>
            <Input id="wa-phone-display" value={displayPhoneNumber} onChange={(e) => setDisplayPhoneNumber(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
              {isSubmitting ? "Bağlanıyor…" : "Bağla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ayarlar > Entegrasyonlar — Instagram reklamlarındaki (Lead Ads/Instant Form) başvuruları çekmek için Facebook Sayfası bağlantısı. */
function FacebookPageIntegrationCard() {
  const [status, setStatus] = useState(getFacebookPageStatus());
  const [manualOpen, setManualOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => subscribeToFacebookPageStatus(() => setStatus(getFacebookPageStatus())), []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectFacebookPage();
      toast.success("Facebook Sayfası bağlantısı kaldırıldı.");
    } catch (error) {
      toast.error(error.message || "Bağlantı kaldırılamadı.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FacebookIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Instagram Reklam Lead&apos;leri</p>
            <p className="text-xs text-muted-foreground">
              {status.connected ? `${status.pageName || status.pageId} bağlı` : "Bağlı değil"}
            </p>
          </div>
        </div>

        {status.connected ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            <Link2Off className="h-4 w-4" />
            {disconnecting ? "Kaldırılıyor…" : "Bağlantıyı Kaldır"}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => setManualOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
            Sayfayı Bağla
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Instagram/Facebook&apos;ta &quot;Instant Form&quot; (Lead Ads) tipi reklam verdiğinde, formu dolduranlar otomatik olarak Başvurular sayfasında görünür.
      </p>
      <FacebookPageManualConnectDialog open={manualOpen} onOpenChange={setManualOpen} />
    </div>
  );
}

/**
 * Facebook Sayfası bağlama formu — admin, Meta Graph API Explorer'dan
 * (developers.facebook.com/tools/explorer) aldığı Page Access Token'ı ve
 * Page ID'sini panelden yapıştırır.
 */
function FacebookPageManualConnectDialog({ open, onOpenChange }) {
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [pageName, setPageName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setPageId("");
    setPageAccessToken("");
    setPageName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await connectFacebookPageManual({
        pageId: pageId.trim(),
        pageAccessToken: pageAccessToken.trim(),
        pageName: pageName.trim() || undefined,
      });
      toast.success("Facebook Sayfası bağlandı.");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Sayfa bağlanamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Facebook Sayfasını Bağla</DialogTitle>
          <DialogDescription>
            Graph API Explorer&apos;dan (developers.facebook.com/tools/explorer) Sayfanı seçip{" "}
            <code>leads_retrieval</code>, <code>pages_manage_metadata</code> izinleriyle ürettiğin Page Access Token&apos;ı yapıştır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fb-page-id">Page ID</Label>
            <Input id="fb-page-id" required value={pageId} onChange={(e) => setPageId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-page-token">Page Access Token</Label>
            <Input id="fb-page-token" required value={pageAccessToken} onChange={(e) => setPageAccessToken(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-page-name">
              Sayfa Adı <span className="font-normal text-muted-foreground">(opsiyonel)</span>
            </Label>
            <Input id="fb-page-name" value={pageName} onChange={(e) => setPageName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
              {isSubmitting ? "Bağlanıyor…" : "Bağla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddUserDialog({ open, onOpenChange }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("assistant");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setRole("assistant");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await addUser({ displayName, email, password, role });
      toast.success(`${ROLE_LABELS[role]} hesabı oluşturuldu.`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Kullanıcı oluşturulamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kullanıcı Ekle</DialogTitle>
          <DialogDescription>Yeni bir Danışman ya da Personel hesabı açın — e-posta ve şifreyi siz belirlersiniz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Ad Soyad</Label>
            <Input id="u-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">E-posta</Label>
            <Input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">Şifre</Label>
            <Input
              id="u-password"
              type="text"
              required
              minLength={6}
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue>{ROLE_LABELS[role]}</SelectValue></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
              {isSubmitting ? "Oluşturuluyor…" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ad/e-posta/rol her zaman düzenlenebilir; şifre alanı boş bırakılırsa değişmez. */
function EditUserDialog({ user, open, onOpenChange }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("assistant");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setPassword("");
      setRole(user.role);
    }
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const updates = { displayName, email, role };
      if (password) updates.password = password;
      await updateUser(user.id, updates);
      toast.success("Kullanıcı güncellendi.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Kullanıcı güncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          <DialogDescription>E-posta, şifre ve rolü buradan değiştirebilirsiniz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eu-name">Ad Soyad</Label>
            <Input id="eu-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-email">E-posta</Label>
            <Input id="eu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-password">Yeni Şifre <span className="font-normal text-muted-foreground">(opsiyonel)</span></Label>
            <Input
              id="eu-password"
              type="text"
              minLength={6}
              placeholder="Değiştirmek istemiyorsanız boş bırakın"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue>{ROLE_LABELS[role]}</SelectValue></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
              {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
