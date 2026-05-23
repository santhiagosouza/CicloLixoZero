import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, FileSpreadsheet, Scale, Leaf, Recycle, AlertTriangle, Ban, Pencil, Check, X, Trash2, CalendarCog, Search } from "lucide-react";
import * as XLSX from "xlsx";
import * as Recharts from "recharts";
const { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } = Recharts as any;

interface Weighing {
  id: string; data: string; peso_kg: number;
  sector_id: string; category_id: string; subcategory_id: string;
}

const GravimetriaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isClientAdmin, isMasterAdmin } = useAuth();
  const canEdit = isClientAdmin || isMasterAdmin;
  const [grav, setGrav] = useState<any>(null);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, { name: string; color: string | null }>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  // edit modes
  const [showDetailed, setShowDetailed] = useState(false);
  const [showLanc, setShowLanc] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editPeso, setEditPeso] = useState("");

  // edit days dialog
  const [editDaysOpen, setEditDaysOpen] = useState(false);
  const [editDaysValue, setEditDaysValue] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: g } = await supabase.from("gravimetrias").select("*").eq("id", id).maybeSingle();
      setGrav(g);
      const { data: w } = await supabase.from("weighings").select("*").eq("gravimetria_id", id).order("data");
      const ws = (w ?? []) as Weighing[];
      setWeighings(ws);
      if (g) {
        const [sec, cat, sub] = await Promise.all([
          supabase.from("sectors").select("id, name").eq("client_id", g.client_id).eq("active", true).order("name"),
          supabase.from("categories").select("id, name, color").order("name"),
          supabase.from("subcategories").select("id, name, category_id").eq("client_id", g.client_id).eq("active", true).order("name"),
        ]);
        const secs = (sec.data ?? []) as any[];
        const cats = (cat.data ?? []) as any[];
        const subs = (sub.data ?? []) as any[];
        setSectors(secs);
        setCategories(cats);
        setSubcategories(subs);
        setSectorMap(Object.fromEntries(secs.map((s: any) => [s.id, s.name])));
        setCategoryMap(Object.fromEntries(cats.map((c: any) => [c.id, { name: c.name, color: c.color }])));
        setSubMap(Object.fromEntries(subs.map((s: any) => [s.id, s.name])));
      }
    })();
  }, [id, reloadKey]);

  const startEdit = (w: Weighing) => {
    setEditId(w.id);
    setEditData(w.data);
    setEditSector(w.sector_id);
    setEditCategory(w.category_id);
    setEditSub(w.subcategory_id);
    setEditPeso(String(w.peso_kg));
  };
  const cancelEdit = () => setEditId(null);
  const saveEdit = async (wid: string) => {
    if (!editSector || !editCategory || !editSub || !editPeso) {
      toast.error("Preencha todos os campos"); return;
    }
    const { error } = await supabase.from("weighings").update({
      data: editData,
      sector_id: editSector,
      category_id: editCategory,
      subcategory_id: editSub,
      peso_kg: Number(editPeso),
    }).eq("id", wid);
    if (error) toast.error(error.message);
    else { toast.success("Pesagem atualizada"); setEditId(null); setReloadKey((k) => k + 1); }
  };
  const removeWeighing = async (wid: string) => {
    const { error } = await supabase.from("weighings").delete().eq("id", wid);
    if (error) toast.error(error.message);
    else { toast.success("Pesagem removida"); setReloadKey((k) => k + 1); }
  };
  const saveSampleDays = async () => {
    const n = parseInt(editDaysValue, 10);
    if (!n || n < 1) { toast.error("Informe um número de dias válido"); return; }
    const { error } = await supabase.from("gravimetrias").update({ sample_days: n }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Dias atualizados"); setEditDaysOpen(false); setEditDaysValue(""); setReloadKey((k) => k + 1); }
  };

  const editFilteredSubs = subcategories.filter((s) => !editCategory || s.category_id === editCategory);

  const total = weighings.reduce((s, w) => s + Number(w.peso_kg), 0);

  const byCategory = Object.values(weighings.reduce((acc: Record<string, { id: string; name: string; value: number; color: string }>, w) => {
    const c = categoryMap[w.category_id];
    const key = w.category_id;
    if (!acc[key]) acc[key] = { id: key, name: c?.name ?? "—", value: 0, color: c?.color ?? "#8884d8" };
    acc[key].value += Number(w.peso_kg);
    return acc;
  }, {}));

  const bySector = Object.values(weighings.reduce((acc: Record<string, { name: string; value: number }>, w) => {
    const key = w.sector_id;
    if (!acc[key]) acc[key] = { name: sectorMap[w.sector_id] ?? "—", value: 0 };
    acc[key].value += Number(w.peso_kg);
    return acc;
  }, {}));

  const exportCSV = () => {
    const rows = [["Data", "Setor", "Categoria", "Subcategoria", "Peso (kg)"]];
    weighings.forEach((w) => {
      rows.push([
        w.data,
        sectorMap[w.sector_id] ?? "",
        categoryMap[w.category_id]?.name ?? "",
        subMap[w.subcategory_id] ?? "",
        Number(w.peso_kg).toFixed(1),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gravimetria-${grav?.numero ?? id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const resumo = [
      ["Gravimetria", grav?.numero ?? ""],
      ["Início", grav?.started_at ? new Date(grav.started_at).toLocaleString("pt-BR") : ""],
      ["Encerramento", grav?.ended_at ? new Date(grav.ended_at).toLocaleString("pt-BR") : "em andamento"],
      ["Total (kg)", Number(total.toFixed(1))],
      ["Pesagens", weighings.length],
      [],
      ["Categoria", "Peso (kg)"],
      ...byCategory.map((c: any) => [c.name, Number(c.value.toFixed(1))]),
      [],
      ["Setor", "Peso (kg)"],
      ...bySector.map((s: any) => [s.name, Number(s.value.toFixed(1))]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");
    const detalhe = [
      ["Data", "Setor", "Categoria", "Subcategoria", "Peso (kg)"],
      ...weighings.map((w) => [
        w.data,
        sectorMap[w.sector_id] ?? "",
        categoryMap[w.category_id]?.name ?? "",
        subMap[w.subcategory_id] ?? "",
        Number(Number(w.peso_kg).toFixed(1)),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalhe), "Pesagens");
    XLSX.writeFile(wb, `gravimetria-${grav?.numero ?? id}.xlsx`);
  };

  if (!grav) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 print-area">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="no-print"><Link to="/"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-semibold">Gravimetria {grav.numero}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(grav.started_at).toLocaleString("pt-BR")} — {grav.ended_at ? new Date(grav.ended_at).toLocaleString("pt-BR") : "em andamento"}
              {grav.sample_days ? ` · ${grav.sample_days} ${grav.sample_days === 1 ? "dia" : "dias"} de separação` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print flex-wrap">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
          <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar XLSX</Button>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{total.toFixed(1)} <span className="text-base text-muted-foreground">kg</span></p></CardContent></Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pesagens</CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 no-print"
                aria-label="Editar dias"
                onClick={() => { setEditDaysValue(grav.sample_days ? String(grav.sample_days) : ""); setEditDaysOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{grav.sample_days ?? "—"} <span className="text-base text-muted-foreground font-normal">{grav.sample_days === 1 ? "dia" : "dias"}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Dias de separação informados</p>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{byCategory.length}</p></CardContent></Card>
      </div>

      {(() => {
        const grandTotal = total;
        if (grandTotal === 0) return null;
        const order = ["Orgânico", "Reciclável", "Perigoso", "Rejeito"];
        const orderIdx = (name: string) => {
          const i = order.findIndex((o) => o.toLowerCase() === name.toLowerCase());
          return i === -1 ? 999 : i;
        };
        const rows = (byCategory as any[])
          .filter((r) => r.value > 0)
          .sort((a, b) => orderIdx(a.name) - orderIdx(b.name));
        return (
          <Card className="print-area">
            <CardHeader>
              <CardTitle>Resumo por categoria</CardTitle>
              <p className="text-sm text-muted-foreground">Geração desta gravimetria</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {rows.map((r: any) => {
                    const pct = (r.value / grandTotal) * 100;
                    const color = r.color ?? "hsl(var(--primary))";
                    const n = String(r.name).toLowerCase();
                    const Icon = n.startsWith("orgân") ? Leaf
                      : n.startsWith("recicl") ? Recycle
                      : n.startsWith("perig") ? AlertTriangle
                      : n.startsWith("rejeit") ? Ban
                      : Scale;
                    return (
                      <div key={r.id} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                              style={{ background: `${color}20`, color }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            {r.name}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="text-xl font-semibold tabular-nums">{r.value.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kg</span></div>
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
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="flex justify-center gap-2 no-print flex-wrap">
        <Button variant={showDetailed ? "outline" : "default"} onClick={() => setShowDetailed((v) => !v)}>
          <Search className="h-4 w-4 mr-2" />{showDetailed ? "Ocultar Relatório Detalhado" : "Relatório Detalhado"}
        </Button>
        <Button variant={showLanc ? "outline" : "default"} onClick={() => setShowLanc((v) => !v)}>
          <Pencil className="h-4 w-4 mr-2" />{showLanc ? "Ocultar Lançamentos de Resíduos" : "Lançamentos de Resíduos"}
        </Button>
      </div>

      {showDetailed && (<>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Por Categoria</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name}: ${e.value.toFixed(1)}kg`}>
                  {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} kg`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Por Setor</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={bySector}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} kg`} />
                <Legend />
                <Bar dataKey="value" name="kg" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {(() => {
        const days = grav.sample_days ?? 0;
        if (days === 0) {
          return (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Para ver previsões mensal e anual desta gravimetria, informe os <strong>dias de separação considerados</strong> (no histórico, botão de editar).
            </div>
          );
        }
        const dailyAvg = total / days;
        const monthly = dailyAvg * 30;
        const yearly = dailyAvg * 365;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Dias de separação</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{days} <span className="text-base text-muted-foreground">{days === 1 ? "dia" : "dias"}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Média diária: {dailyAvg.toFixed(1)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Previsão mensal</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{monthly.toFixed(1)} <span className="text-base text-muted-foreground">kg</span></p>
                <p className="text-xs text-muted-foreground mt-1">{dailyAvg.toFixed(1)} kg/dia × 30</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Previsão anual</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{yearly.toFixed(1)} <span className="text-base text-muted-foreground">kg</span></p>
                <p className="text-xs text-muted-foreground mt-1">{dailyAvg.toFixed(1)} kg/dia × 365</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {(() => {
        type Agg = { sectorId: string; sectorName: string; total: number; byCat: Record<string, { name: string; color: string; total: number; subs: Record<string, { name: string; total: number }> }> };
        const map = new Map<string, Agg>();
        for (const w of weighings) {
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
        const allCatIds = Array.from(new Set(weighings.map((w) => w.category_id)));
        const allCats = allCatIds
          .map((id) => ({ id, name: categoryMap[id]?.name ?? "—", color: categoryMap[id]?.color ?? "hsl(var(--primary))" }))
          .sort((a, b) => {
            const ai = catOrderRef.findIndex((o) => o.toLowerCase() === a.name.toLowerCase());
            const bi = catOrderRef.findIndex((o) => o.toLowerCase() === b.name.toLowerCase());
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });
        const catTotals: Record<string, number> = {};
        allCats.forEach((c) => { catTotals[c.id] = sectorsAgg.reduce((s, sec) => s + (sec.byCat[c.id]?.total ?? 0), 0); });
        if (sectorsAgg.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório por Setor</CardTitle>
              <p className="text-sm text-muted-foreground">Geração por setor, categoria e subcategoria</p>
            </CardHeader>
            <CardContent className="space-y-6">
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
            </CardContent>
          </Card>
        );
      })()}

      </>)}

      {showLanc && (
      <Card>
        <CardHeader><CardTitle>Pesagens</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  {canEdit && <TableHead className="w-24 text-right no-print">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {weighings.length === 0 && (
                  <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-6">Sem pesagens</TableCell></TableRow>
                )}
                {weighings.map((w) => canEdit && editId === w.id ? (
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
                    <TableCell className="text-right no-print">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => saveEdit(w.id)}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{sectorMap[w.sector_id] ?? "—"}</TableCell>
                    <TableCell>{categoryMap[w.category_id]?.name ?? "—"}</TableCell>
                    <TableCell>{subMap[w.subcategory_id] ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(w.peso_kg).toFixed(1)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right no-print">
                        <div className="inline-flex gap-1">
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
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      <Dialog open={editDaysOpen} onOpenChange={(o) => { if (!o) { setEditDaysOpen(false); setEditDaysValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dias de amostragem</DialogTitle>
            <DialogDescription>
              Atualize o número de dias de separação considerados para a Gravimetria {grav?.numero}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-sample-days">Dias de separação</Label>
            <Input id="edit-sample-days" type="number" min={1} step={1} value={editDaysValue} onChange={(e) => setEditDaysValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDaysOpen(false); setEditDaysValue(""); }}>Cancelar</Button>
            <Button onClick={saveSampleDays}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GravimetriaDetail;
