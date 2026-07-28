import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getRolePermissions,
  togglePermission,
  subscribeToSettings,
  USER_ROLES,
  ALL_PERMISSIONS,
} from "../data/settingsStore";

const ROLE_BADGE = {
  Admin: "bg-brand-navy text-white",
  Personel: "bg-blue-100 text-blue-700",
  Danışman: "bg-emerald-100 text-emerald-700",
};

/** "/admin/ayarlar" — Kullanıcılar (users + roles) and Yetkiler (role -> permission matrix). */
export default function Settings() {
  const [users, setUsers] = useState(getUsers());
  const [permissions, setPermissions] = useState(getRolePermissions());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() =>
    subscribeToSettings(() => {
      setUsers(getUsers());
      setPermissions(getRolePermissions());
    }),
  []);

  return (
    <Tabs defaultValue="kullanicilar" className="max-w-3xl">
      <TabsList>
        <TabsTrigger value="kullanicilar">Kullanıcılar</TabsTrigger>
        <TabsTrigger value="yetkiler">Yetkiler</TabsTrigger>
      </TabsList>

      <TabsContent value="kullanicilar" className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
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
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Select value={user.role} onValueChange={(role) => updateUser(user.id, { role })}>
                      <SelectTrigger className="w-32">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                          {user.role}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { deleteUser(user.id); toast.success("Kullanıcı silindi."); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[role]}`}>
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

      <AddUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Tabs>
  );
}

function AddUserDialog({ open, onOpenChange }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Personel");

  function handleSubmit(event) {
    event.preventDefault();
    addUser({ name, email, role });
    toast.success("Kullanıcı eklendi.");
    setName("");
    setEmail("");
    setRole("Personel");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kullanıcı Ekle</DialogTitle>
          <DialogDescription>Yeni bir ekip üyesi ve rolünü tanımlayın.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Ad Soyad</Label>
            <Input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">E-posta</Label>
            <Input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full"><SelectValue>{role}</SelectValue></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark">Ekle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
