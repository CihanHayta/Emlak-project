import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
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

  useEffect(() => subscribeToUsers(() => setUsers(getUsers())), []);
  useEffect(() => subscribeToSettings(() => setPermissions(getRolePermissions())), []);

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
