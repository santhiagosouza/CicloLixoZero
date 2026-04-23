import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Calendar, Trash2, Play, Square, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Gravimetria {
  id: string;
  numero: number;
  started_at: string;
  ended_at: string | null;
}
interface Sector { id: string; name: string }
interface Category { id: string; name: string; color: string | null }
interface Subcategory { id: string; name: string; category_id: string }
interface Weighing {
  id: string;
  data: string;
  peso_kg: number;
  sector_id: string;
  category_id: string;
  subcategory_id: string;
}
interface CategoryTotal { category_id: string; peso_kg: number }

const Gravimetria = () => {
  const { clientId, isClientAdmin, isMasterAdmin, user, loading } = useAuth();
  const [active, setActive] = useState<Gravimetria | null>(null);
  const [history, setHistory] = useState<Gravimetria[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // form state
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(today);
  const [sectorId, setSectorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [peso, setPeso] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editPeso, setEditPeso] = useState("");

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [g, s, c, sc] = await Promise.all([
        supabase.from("gravimetrias").select("*").eq("client_id", clientId).order("numero", { ascending: false }),
        supabase.from("sectors").select("id, name").eq("client_id", clientId).eq("active", true).order("name"),
        supabase.from("categories").select("id, name, color").order("name"),
        supabase.from("subcategories").select("id, name, category_id").eq("client_id", clientId).eq("active", true).order("name"),
      ]);
      const all = (g.data ?? []) as Gravimetria[];
      const act = all.find((x) => !x.ended_at) ?? null;
      setActive(act);
      setHistory(all.filter((x) => x.ended_at));
      setSectors((s.data ?? []) as Sector[]);
      setCategories((c.data ?? []) as Category[]);
      setSubcategories((sc.data ?? []) as Subcategory[]);
    })();
  }, [clientId, reloadKey]);

  useEffect(() => {
    if (!active) { setWeighings([]); return; }
    supabase.from("weighings").select("*").eq("gravimetria_id", active.id).order("created_at", { ascending: false })
      .then(({ data }) => setWeighings((data ?? []) as Weighing[]));
  }, [active, reloadKey]);

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!clientId && isMasterAdmin) return <Navigate to="/master" replace />;
  if (!clientId) return <div className="text-muted-foreground">Sua conta ainda não está vinculada a um cliente. Contate o administrador.</div>;

  const startGravimetria = async () => {
    const { error } = await supabase.from("gravimetrias").insert({
      client_id: clientId, numero: 0, started_by: user!.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Gravimetria iniciada"); setReloadKey((k) => k + 1); }
  };

  const endGravimetria = async () => {
    if (!active) return;
    const { error } = await supabase.from("gravimetrias").update({ ended_at: new Date().toISOString() }).eq("id", active.id);
    if (error) toast.error(error.message);
    else { toast.success("Gravimetria encerrada"); setReloadKey((k) => k + 1); }
  };

  const submitWeighing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!sectorId || !categoryId || !subcategoryId || !peso) {
      toast.error("Preencha todos os campos"); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("weighings").insert({
      gravimetria_id: active.id,
      client_id: clientId,
      data,
      sector_id: sectorId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      peso_kg: Number(peso),
      created_by: user!.id,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Pesagem registrada");
      setPeso(""); setReloadKey((k) => k + 1);
    }
  };

  const removeWeighing = async (id: string) => {
    const { error } = await supabase.from("weighings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Pesagem removida"); setReloadKey((k) => k + 1); }
  };

  const startEdit = (w: Weighing) => {
    setEditId(w.id);
    setEditData(w.data);
    setEditSector(w.sector_id);
    setEditCategory(w.category_id);
    setEditSub(w.subcategory_id);
    setEditPeso(String(w.peso_kg));
  };
  const cancelEdit = () => setEditId(null);
  const saveEdit = async (id: string) => {
    if (!editSector || !editCategory || !editSub || !editPeso) {
      toast.error("Preencha todos os campos"); return;
    }
    const { error } = await supabase.from("weighings").update({
      data: editData,
      sector_id: editSector,
      category_id: editCategory,
      subcategory_id: editSub,
      peso_kg: Number(editPeso),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Pesagem atualizada"); setEditId(null); setReloadKey((k) => k + 1); }
  };

  const filteredSubs = subcategories.filter((s) => !categoryId || s.category_id === categoryId);
  const editFilteredSubs = subcategories.filter((s) => !editCategory || s.category_id === editCategory);
  const totalKg = weighings.reduce((sum, w) => sum + Number(w.peso_kg), 0);

  const sectorById = (id: string) => sectors.find((x) => x.id === id)?.name ?? "—";
  const categoryById = (id: string) => categories.find((x) => x.id === id)?.name ?? "—";
  const subcategoryById = (id: string) => subcategories.find((x) => x.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gravimetria</h1>
          <p className="text-sm text-muted-foreground">Registre as pesagens de resíduos da sua operação</p>
        </div>
        {isClientAdmin && (
          active ? (
            <ConfirmDialog
              trigger={<Button variant="destructive"><Square className="h-4 w-4 mr-2" />Encerrar Gravimetria</Button>}
              title="Encerrar gravimetria?"
              description={`A Gravimetria ${active.numero} será encerrada. Você não poderá mais registrar pesagens nela.`}
              destructive
              confirmLabel="Encerrar"
              onConfirm={endGravimetria}
            />
          ) : (
            <Button onClick={startGravimetria} className="shadow-[var(--shadow-elegant)]">
              <Play className="h-4 w-4 mr-2" />Iniciar Gravimetria
            </Button>
          )
        )}
      </div>

      {active && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary pulse-active" />
                Gravimetria {active.numero}
                <Badge variant="secondary">Em andamento</Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(active.started_at).toLocaleString("pt-BR")}</span>
                <span className="flex items-center gap-1"><Scale className="h-4 w-4" />{totalKg.toFixed(3)} kg</span>
                <span>{weighings.length} pesagens</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitWeighing} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label>Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label>Setor</Label>
                <Select value={sectorId} onValueChange={setSectorId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label>Subcategoria</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.001" min="0.001" value={peso} onChange={(e) => setPeso(e.target.value)} required placeholder="0,000" />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">Registrar</Button>
              </div>
            </form>

            <div className="mt-6 border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Subcategoria</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weighings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pesagem registrada ainda</TableCell></TableRow>
                  )}
                  {weighings.map((w) => editId === w.id ? (
                    <TableRow key={w.id}>
                      <TableCell><Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} className="h-8" /></TableCell>
                      <TableCell>
                        <Select value={editSector} onValueChange={setEditSector}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={editCategory} onValueChange={(v) => { setEditCategory(v); setEditSub(""); }}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={editSub} onValueChange={setEditSub}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{editFilteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="0.001" min="0.001" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} className="h-8 text-right" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => saveEdit(w.id)}><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={w.id}>
                      <TableCell>{new Date(w.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{sectorById(w.sector_id)}</TableCell>
                      <TableCell>{categoryById(w.category_id)}</TableCell>
                      <TableCell>{subcategoryById(w.subcategory_id)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(w.peso_kg).toFixed(3)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(w)}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDialog
                            trigger={<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            title="Remover pesagem?"
                            description="Esta ação não pode ser desfeita."
                            destructive
                            confirmLabel="Remover"
                            onConfirm={() => removeWeighing(w.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!active && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhuma gravimetria em andamento.
            {isClientAdmin ? " Clique em \"Iniciar Gravimetria\" para começar." : " Aguarde o admin iniciar uma nova gravimetria."}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Gravimetrias encerradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Encerramento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem histórico</TableCell></TableRow>
                )}
                {history.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>Gravimetria {g.numero}</TableCell>
                    <TableCell>{new Date(g.started_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{g.ended_at ? new Date(g.ended_at).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" asChild><Link to={`/gravimetria/${g.id}`}>Ver detalhes</Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Gravimetria;
