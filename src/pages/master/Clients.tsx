import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Client { id: string; name: string; cnpj: string | null; active: boolean; }

const Clients = () => {
  const [items, setItems] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("*").order("name")
      .then(({ data }) => setItems((data ?? []) as Client[]));
  }, [reload]);

  const create = async () => {
    if (!name.trim() || !adminEmail.trim() || !adminPassword) {
      toast.error("Preencha nome, e-mail e senha do admin"); return;
    }
    setBusy(true);
    const { data: client, error } = await supabase.from("clients").insert({ name: name.trim(), cnpj: cnpj.trim() || null }).select().single();
    if (error || !client) { setBusy(false); toast.error(error?.message ?? "Erro"); return; }

    const { data: signup, error: suErr } = await supabase.auth.signUp({
      email: adminEmail.trim(),
      password: adminPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: adminName.trim(), client_id: client.id },
      },
    });
    if (suErr || !signup.user) { setBusy(false); toast.error(suErr?.message ?? "Erro ao criar admin"); return; }

    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: signup.user.id, role: "client_admin", client_id: client.id,
    });
    setBusy(false);
    if (roleErr) toast.error(roleErr.message);
    else {
      toast.success("Cliente e admin criados");
      setName(""); setCnpj(""); setAdminEmail(""); setAdminPassword(""); setAdminName("");
      setOpen(false); setReload((k) => k + 1);
    }
  };

  const toggle = async (c: Client) => {
    const { error } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (error) toast.error(error.message); else setReload((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Empresas que utilizam o sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo cliente</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Crie a empresa e o primeiro administrador.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2"><Label>Nome da empresa</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>CNPJ (opcional)</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2 pt-2 border-t"><p className="text-sm font-medium">Primeiro administrador</p></div>
              <div className="space-y-2 sm:col-span-2"><Label>Nome</Label><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Senha</Label><Input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={busy}>{busy ? "Criando..." : "Criar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead><TableHead>Ativo</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum cliente</TableCell></TableRow>}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.cnpj || "—"}</TableCell>
                <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell><Switch checked={c.active} onCheckedChange={() => toggle(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default Clients;
