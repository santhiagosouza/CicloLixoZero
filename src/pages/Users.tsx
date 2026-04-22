import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string; full_name: string | null; email: string | null;
  role: string;
}

const Users = () => {
  const { clientId } = useAuth();
  const [items, setItems] = useState<UserRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").eq("client_id", clientId);
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = ids.length ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids).eq("client_id", clientId) : { data: [] as any[] };
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      setItems((profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "client_user" })));
    })();
  }, [clientId, reload]);

  const create = async () => {
    if (!email.trim() || !password || !clientId) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim(), client_id: clientId },
      },
    });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? "Erro ao criar usuário"); return;
    }
    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: data.user.id, role: "client_user", client_id: clientId,
    });
    setBusy(false);
    if (roleErr) toast.error(roleErr.message);
    else {
      toast.success("Usuário criado");
      setName(""); setEmail(""); setPassword(""); setOpen(false); setReload((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Convide usuários da sua empresa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Senha temporária</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">O usuário poderá alterar a senha depois.</p>
            </div>
            <DialogFooter><Button onClick={create} disabled={busy}>{busy ? "Criando..." : "Criar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum usuário</TableCell></TableRow>}
            {items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant="secondary">{u.role === "client_admin" ? "Admin" : "Usuário"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default Users;
