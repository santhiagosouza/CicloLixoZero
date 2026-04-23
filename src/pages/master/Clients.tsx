import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface CompanyType { id: string; name: string }
interface Client {
  id: string; name: string; cnpj: string | null; active: boolean;
  license_number: string | null; company_type_id: string | null;
  responsible_name: string | null; phone: string | null; email: string | null;
  city: string | null; state: string | null;
}

const WEEKDAYS = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const initialForm = {
  name: "", cnpj: "", license_number: "", company_type_id: "",
  responsible_name: "", address: "", city: "", state: "", zip_code: "",
  phone: "", email: "",
  people_count: "", team_count: "", total_area_m2: "",
  gas_consumption_m3: "", energy_consumption_kwh: "",
  operating_days: [] as string[],
  // admin
  adminName: "", adminEmail: "", adminPassword: "",
};

const Clients = () => {
  const navigate = useNavigate();
  const { setImpersonatedClient } = useAuth();
  const [items, setItems] = useState<Client[]>([]);
  const [types, setTypes] = useState<CompanyType[]>([]);
  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  const accessAs = (c: Client) => {
    setImpersonatedClient(c.id);
    toast.success(`Acessando como ${c.name}`);
    navigate("/");
  };

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, name, cnpj, active, license_number, company_type_id, responsible_name, phone, email, city, state").order("name"),
      supabase.from("company_types").select("*").order("name"),
    ]).then(([c, t]) => {
      setItems((c.data ?? []) as Client[]);
      setTypes((t.data ?? []) as CompanyType[]);
    });
  }, [reload]);

  const setF = (k: keyof typeof initialForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      operating_days: f.operating_days.includes(day)
        ? f.operating_days.filter((d) => d !== day)
        : [...f.operating_days, day],
    }));
  };

  const create = async () => {
    if (!form.name.trim() || !form.adminEmail.trim() || !form.adminPassword) {
      toast.error("Nome do cliente, e-mail e senha do admin são obrigatórios"); return;
    }
    setBusy(true);

    const payload = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim() || null,
      license_number: form.license_number.trim() || null,
      company_type_id: form.company_type_id || null,
      responsible_name: form.responsible_name.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      zip_code: form.zip_code.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      people_count: form.people_count ? Number(form.people_count) : null,
      team_count: form.team_count ? Number(form.team_count) : null,
      total_area_m2: form.total_area_m2 ? Number(form.total_area_m2) : null,
      gas_consumption_m3: form.gas_consumption_m3 ? Number(form.gas_consumption_m3) : null,
      energy_consumption_kwh: form.energy_consumption_kwh ? Number(form.energy_consumption_kwh) : null,
      operating_days: form.operating_days,
    };

    const { data: client, error } = await supabase.from("clients").insert(payload).select().single();
    if (error || !client) { setBusy(false); toast.error(error?.message ?? "Erro"); return; }

    const { data: signup, error: suErr } = await supabase.auth.signUp({
      email: form.adminEmail.trim(),
      password: form.adminPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.adminName.trim(), client_id: client.id },
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
      setForm(initialForm);
      setOpen(false); setReload((k) => k + 1);
    }
  };

  const toggle = async (c: Client) => {
    const { error } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (error) toast.error(error.message); else setReload((k) => k + 1);
  };

  const remove = async (c: Client) => {
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Cliente excluído"); setReload((k) => k + 1); }
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Cadastre a empresa, dados do local e o primeiro administrador.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Identificação */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identificação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2 md:col-span-2"><Label>Nome da empresa *</Label><Input value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                  <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setF("cnpj", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Número da Licença</Label><Input value={form.license_number} onChange={(e) => setF("license_number", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Tipo de Empresa</Label>
                    <Select value={form.company_type_id} onValueChange={(v) => setF("company_type_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Nome do Responsável</Label><Input value={form.responsible_name} onChange={(e) => setF("responsible_name", e.target.value)} /></div>
                </div>
              </section>

              {/* Contato e endereço */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço e Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="space-y-2 md:col-span-4"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setF("address", e.target.value)} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>CEP</Label><Input value={form.zip_code} onChange={(e) => setF("zip_code", e.target.value)} /></div>
                  <div className="space-y-2 md:col-span-3"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setF("city", e.target.value)} /></div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>UF</Label>
                    <Select value={form.state} onValueChange={(v) => setF("state", v)}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setF("phone", e.target.value)} /></div>
                  <div className="space-y-2 md:col-span-3"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} /></div>
                </div>
              </section>

              {/* Dados do local */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Local</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Nº de Pessoas</Label><Input type="number" min="0" value={form.people_count} onChange={(e) => setF("people_count", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Nº da Equipe</Label><Input type="number" min="0" value={form.team_count} onChange={(e) => setF("team_count", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Área Total (m²)</Label><Input type="number" step="0.01" min="0" value={form.total_area_m2} onChange={(e) => setF("total_area_m2", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Consumo Gás (m³/mês)</Label><Input type="number" step="0.01" min="0" value={form.gas_consumption_m3} onChange={(e) => setF("gas_consumption_m3", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Consumo Energia (kWh/mês)</Label><Input type="number" step="0.01" min="0" value={form.energy_consumption_kwh} onChange={(e) => setF("energy_consumption_kwh", e.target.value)} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Dias de Funcionamento</Label>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {WEEKDAYS.map((d) => (
                      <label key={d.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={form.operating_days.includes(d.key)} onCheckedChange={() => toggleDay(d.key)} />
                        <span className="text-sm">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* Admin */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Primeiro Administrador</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Nome</Label><Input value={form.adminName} onChange={(e) => setF("adminName", e.target.value)} /></div>
                  <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={form.adminEmail} onChange={(e) => setF("adminEmail", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Senha *</Label><Input type="text" value={form.adminPassword} onChange={(e) => setF("adminPassword", e.target.value)} /></div>
                </div>
              </section>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={create} disabled={busy}>{busy ? "Criando..." : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum cliente</TableCell></TableRow>}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{types.find((t) => t.id === c.company_type_id)?.name ?? "—"}</TableCell>
                <TableCell>{c.responsible_name || "—"}</TableCell>
                <TableCell>{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</TableCell>
                <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell><Switch checked={c.active} onCheckedChange={() => toggle(c)} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="outline" size="sm" onClick={() => accessAs(c)}>
                      <LogIn className="h-3.5 w-3.5 mr-1" /> Acessar
                    </Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                      title={`Excluir ${c.name}?`}
                      description="Esta ação removerá o cliente e todos os dados vinculados (setores, subcategorias, gravimetrias, pesagens). Não pode ser desfeita."
                      confirmLabel="Excluir"
                      destructive
                      onConfirm={() => remove(c)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default Clients;
