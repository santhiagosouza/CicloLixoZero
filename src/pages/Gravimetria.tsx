import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Calendar, Trash2, Play, Square, Pencil, Check, X, Leaf, Recycle, AlertTriangle, Ban, Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import * as XLSX from "xlsx";

interface Gravimetria {
  id: string;
  numero: number;
  started_at: string;
  ended_at: string | null;
  sample_days: number | null;
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
  gravimetria_id?: string;
}
interface CategoryTotal { category_id: string; peso_kg: number }
interface SamplingStats { days: number; totalKg: number }

const Gravimetria = () => {
  const { clientId, isClientAdmin, isMasterAdmin, user, loading } = useAuth();
  const [active, setActive] = useState<Gravimetria | null>(null);
  const [history, setHistory] = useState<Gravimetria[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [samplingStats, setSamplingStats] = useState<SamplingStats>({ days: 0, totalKg: 0 });
  const [allWeighings, setAllWeighings] = useState<Weighing[]>([]);
  const [reportFilter, setReportFilter] = useState<string>("all");
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

  // end gravimetria dialog
  const [endOpen, setEndOpen] = useState(false);
  const [endDays, setEndDays] = useState<string>("");

  // edit sample_days dialog (history)
  const [editDaysOpen, setEditDaysOpen] = useState<Gravimetria | null>(null);
  const [editDaysValue, setEditDaysValue] = useState<string>("");

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [g, s, c, sc, allW] = await Promise.all([
        supabase.from("gravimetrias").select("*").eq("client_id", clientId).order("numero", { ascending: false }),
        supabase.from("sectors").select("id, name").eq("client_id", clientId).eq("active", true).order("name"),
        supabase.from("categories").select("id, name, color").order("name"),
        supabase.from("subcategories").select("id, name, category_id").eq("client_id", clientId).eq("active", true).order("name"),
        supabase.from("weighings").select("id, gravimetria_id, sector_id, category_id, subcategory_id, peso_kg, data").eq("client_id", clientId),
      ]);
      const all = (g.data ?? []) as Gravimetria[];
      const act = all.find((x) => !x.ended_at) ?? null;
      setActive(act);
      setHistory(all.filter((x) => x.ended_at));
      setSectors((s.data ?? []) as Sector[]);
      setCategories((c.data ?? []) as Category[]);
      setSubcategories((sc.data ?? []) as Subcategory[]);

      const rows = (allW.data ?? []) as (Weighing & { gravimetria_id: string })[];
      setAllWeighings(rows as Weighing[]);
      const totalsMap = new Map<string, number>();
      const dayset = new Set<string>();
      let totalKg = 0;
      for (const w of rows) {
        const kg = Number(w.peso_kg);
        totalsMap.set(w.category_id, (totalsMap.get(w.category_id) ?? 0) + kg);
        if (w.data) dayset.add(w.data);
        totalKg += kg;
      }
      setCategoryTotals(Array.from(totalsMap.entries()).map(([category_id, peso_kg]) => ({ category_id, peso_kg })));
      setSamplingStats({ days: dayset.size, totalKg });
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

  const deleteGravimetria = async (id: string) => {
    const { error } = await supabase.from("gravimetrias").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Gravimetria excluída"); setReloadKey((k) => k + 1); }
  };

  const endGravimetria = async () => {
    if (!active) return;
    const n = parseInt(endDays, 10);
    if (!n || n < 1) { toast.error("Informe quantos dias de separação foram considerados"); return; }
    const { error } = await supabase.from("gravimetrias")
      .update({ ended_at: new Date().toISOString(), sample_days: n })
      .eq("id", active.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Gravimetria encerrada");
      setEndOpen(false);
      setEndDays("");
      setReloadKey((k) => k + 1);
    }
  };

  const saveSampleDays = async () => {
    if (!editDaysOpen) return;
    const n = parseInt(editDaysValue, 10);
    if (!n || n < 1) { toast.error("Informe um número de dias válido"); return; }
    const { error } = await supabase.from("gravimetrias")
      .update({ sample_days: n })
      .eq("id", editDaysOpen.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dias atualizados");
      setEditDaysOpen(null);
      setEditDaysValue("");
      setReloadKey((k) => k + 1);
    }
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
                <span className="flex items-center gap-1"><Scale className="h-4 w-4" />{totalKg.toFixed(1)} kg</span>
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
                      <TableCell className="text-right tabular-nums">{Number(w.peso_kg).toFixed(1)}</TableCell>
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

      <Card className="print-area">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Resumo geral por categoria</CardTitle>
              <CardDescription>Soma de todas as gravimetrias deste cliente</CardDescription>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const grandTotal = categoryTotals.reduce((s, t) => s + t.peso_kg, 0);
                const days = samplingStats.days;
                const dailyAvg = days > 0 ? grandTotal / days : 0;
                const wb = XLSX.utils.book_new();
                const resumo: any[][] = [
                  ["Resumo geral por categoria"],
                  [],
                  ["Categoria", "Peso (kg)", "% do total"],
                  ...categories
                    .map((c) => ({ name: c.name, kg: categoryTotals.find((t) => t.category_id === c.id)?.peso_kg ?? 0 }))
                    .filter((r) => r.kg > 0)
                    .map((r) => [r.name, Number(r.kg.toFixed(1)), grandTotal ? Number(((r.kg / grandTotal) * 100).toFixed(1)) : 0]),
                  ["Total geral", Number(grandTotal.toFixed(1)), 100],
                  [],
                  ["Dias amostrados", days],
                  ["Média diária (kg)", Number(dailyAvg.toFixed(1))],
                  ["Previsão mensal (kg)", Number((dailyAvg * 30).toFixed(1))],
                  ["Previsão anual (kg)", Number((dailyAvg * 365).toFixed(1))],
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");
                XLSX.writeFile(wb, `resumo-gravimetria.xlsx`);
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar XLSX
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const grandTotal = categoryTotals.reduce((s, t) => s + t.peso_kg, 0);
            if (grandTotal === 0) {
              return <div className="text-center text-muted-foreground py-6">Nenhuma pesagem registrada ainda</div>;
            }
            const order = ["Orgânico", "Reciclável", "Perigoso", "Rejeito"];
            const orderIdx = (name: string) => {
              const i = order.findIndex((o) => o.toLowerCase() === name.toLowerCase());
              return i === -1 ? 999 : i;
            };
            const rows = categories
              .map((c) => ({
                cat: c,
                kg: categoryTotals.find((t) => t.category_id === c.id)?.peso_kg ?? 0,
              }))
              .filter((r) => r.kg > 0)
              .sort((a, b) => orderIdx(a.cat.name) - orderIdx(b.cat.name));
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {rows.map((r) => {
                    const pct = (r.kg / grandTotal) * 100;
                    const color = r.cat.color ?? "hsl(var(--primary))";
                    const n = r.cat.name.toLowerCase();
                    const Icon = n.startsWith("orgân") ? Leaf
                      : n.startsWith("recicl") ? Recycle
                      : n.startsWith("perig") ? AlertTriangle
                      : n.startsWith("rejeit") ? Ban
                      : Scale;
                    return (
                      <div key={r.cat.id} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                              style={{ background: `${color}20`, color }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            {r.cat.name}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="text-xl font-semibold tabular-nums">{r.kg.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kg</span></div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end text-sm text-muted-foreground">
                  Total geral: <span className="ml-2 font-semibold text-foreground tabular-nums">{grandTotal.toFixed(1)} kg</span>
                </div>
                {(() => {
                  const days = samplingStats.days;
                  const daysInMonth = 30;
                  const samplePct = (days / daysInMonth) * 100;
                  const dailyAvg = days > 0 ? grandTotal / days : 0;
                  const monthly = dailyAvg * 30;
                  const yearly = dailyAvg * 365;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Dias de separação amostrados</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums">
                          {days} <span className="text-xs text-muted-foreground font-normal">{days === 1 ? "dia" : "dias"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {samplePct.toFixed(1)}% do mês (base 30 dias)
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Previsão mensal</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums">
                          {monthly.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kg</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Média diária de {dailyAvg.toFixed(1)} kg × 30
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Previsão anual</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums">
                          {yearly.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kg</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Média diária de {dailyAvg.toFixed(1)} kg × 365
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
                      <div className="inline-flex items-center gap-1">
                        <Button variant="link" asChild><Link to={`/gravimetria/${g.id}`}>Ver detalhes</Link></Button>
                        {(isClientAdmin || isMasterAdmin) && (
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Excluir gravimetria">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title={`Excluir Gravimetria ${g.numero}?`}
                            description="Esta ação removerá a gravimetria e todas as pesagens vinculadas. Não pode ser desfeita."
                            destructive
                            confirmLabel="Excluir"
                            onConfirm={() => deleteGravimetria(g.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const filtered = reportFilter === "all"
          ? allWeighings
          : allWeighings.filter((w) => w.gravimetria_id === reportFilter);
        const total = filtered.reduce((s, w) => s + Number(w.peso_kg), 0);

        const sectorMap: Record<string, string> = Object.fromEntries(sectors.map((s) => [s.id, s.name]));
        const categoryMap: Record<string, { name: string; color: string | null }> = Object.fromEntries(
          categories.map((c) => [c.id, { name: c.name, color: c.color }])
        );
        const subMap: Record<string, string> = Object.fromEntries(subcategories.map((s) => [s.id, s.name]));

        type Agg = { sectorId: string; sectorName: string; total: number; byCat: Record<string, { name: string; color: string; total: number; subs: Record<string, { name: string; total: number }> }> };
        const map = new Map<string, Agg>();
        for (const w of filtered) {
          const sName = sectorMap[w.sector_id] ?? "—";
          const cInfo = categoryMap[w.category_id];
          const cName = cInfo?.name ?? "—";
          const cColor = cInfo?.color ?? "hsl(var(--primary))";
          const subName = subMap[w.subcategory_id] ?? "—";
          const kg = Number(w.peso_kg);
          let agg = map.get(w.sector_id);
          if (!agg) { agg = { sectorId: w.sector_id, sectorName: sName, total: 0, byCat: {} }; map.set(w.sector_id, agg); }
          agg.total += kg;
          if (!agg.byCat[w.category_id]) agg.byCat[w.category_id] = { name: cName, color: cColor, total: 0, subs: {} };
          agg.byCat[w.category_id].total += kg;
          if (!agg.byCat[w.category_id].subs[w.subcategory_id]) agg.byCat[w.category_id].subs[w.subcategory_id] = { name: subName, total: 0 };
          agg.byCat[w.category_id].subs[w.subcategory_id].total += kg;
        }
        const sectorsAgg = Array.from(map.values()).sort((a, b) => b.total - a.total);
        const catOrderRef = ["Orgânico", "Reciclável", "Perigoso", "Rejeito"];
        const allCatIds = Array.from(new Set(filtered.map((w) => w.category_id)));
        const allCats = allCatIds
          .map((id) => ({ id, name: categoryMap[id]?.name ?? "—", color: categoryMap[id]?.color ?? "hsl(var(--primary))" }))
          .sort((a, b) => {
            const ai = catOrderRef.findIndex((o) => o.toLowerCase() === a.name.toLowerCase());
            const bi = catOrderRef.findIndex((o) => o.toLowerCase() === b.name.toLowerCase());
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });
        const catTotals: Record<string, number> = {};
        allCats.forEach((c) => { catTotals[c.id] = sectorsAgg.reduce((s, sec) => s + (sec.byCat[c.id]?.total ?? 0), 0); });

        const allGravs = [active, ...history].filter(Boolean) as Gravimetria[];

        return (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Relatório por Setor</CardTitle>
                  <CardDescription>Geração por setor, categoria e subcategoria</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Gravimetria:</Label>
                  <Select value={reportFilter} onValueChange={setReportFilter}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas (resumo geral)</SelectItem>
                      {allGravs.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          Gravimetria {g.numero}{!g.ended_at ? " (em andamento)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {sectorsAgg.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">Sem dados para o filtro selecionado</div>
              ) : (
                <>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Setor</TableHead>
                          {allCats.map((c) => (
                            <TableHead key={c.id} className="text-right">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                                {c.name}
                              </span>
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectorsAgg.map((s) => (
                          <TableRow key={s.sectorId}>
                            <TableCell className="font-medium">{s.sectorName}</TableCell>
                            {allCats.map((c) => {
                              const v = s.byCat[c.id]?.total ?? 0;
                              return <TableCell key={c.id} className="text-right tabular-nums">{v ? v.toFixed(1) : "—"}</TableCell>;
                            })}
                            <TableCell className="text-right tabular-nums font-semibold">{s.total.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40">
                          <TableCell className="font-semibold">Total geral</TableCell>
                          {allCats.map((c) => (
                            <TableCell key={c.id} className="text-right tabular-nums font-semibold">{(catTotals[c.id] ?? 0).toFixed(1)}</TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums font-semibold">{total.toFixed(1)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Detalhamento por setor</p>
                    <Accordion type="multiple" className="border rounded-md">
                      {sectorsAgg.map((s) => (
                        <AccordionItem key={s.sectorId} value={s.sectorId} className="px-4">
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-4">
                              <span className="font-medium">{s.sectorName}</span>
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {s.total.toFixed(1)} kg · {total ? ((s.total / total) * 100).toFixed(1) : "0.0"}%
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pb-2">
                              {allCats
                                .filter((c) => s.byCat[c.id])
                                .map((c) => {
                                  const cAgg = s.byCat[c.id];
                                  const subs = Object.values(cAgg.subs).sort((a, b) => b.total - a.total);
                                  return (
                                    <div key={c.id} className="rounded-md border p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                                          {c.name}
                                        </span>
                                        <span className="text-sm tabular-nums text-muted-foreground">
                                          {cAgg.total.toFixed(1)} kg · {((cAgg.total / s.total) * 100).toFixed(1)}% do setor
                                        </span>
                                      </div>
                                      <Table>
                                        <TableBody>
                                          {subs.map((sub, i) => (
                                            <TableRow key={i}>
                                              <TableCell className="py-1.5">{sub.name}</TableCell>
                                              <TableCell className="py-1.5 text-right tabular-nums w-32">{sub.total.toFixed(1)} kg</TableCell>
                                              <TableCell className="py-1.5 text-right tabular-nums w-20 text-muted-foreground">{((sub.total / cAgg.total) * 100).toFixed(1)}%</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  );
                                })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
};

export default Gravimetria;
