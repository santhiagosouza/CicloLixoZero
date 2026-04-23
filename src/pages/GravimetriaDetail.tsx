import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import * as Recharts from "recharts";
const { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } = Recharts as any;

interface Weighing {
  id: string; data: string; peso_kg: number;
  sector_id: string; category_id: string; subcategory_id: string;
}

const GravimetriaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [grav, setGrav] = useState<any>(null);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, { name: string; color: string | null }>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});

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
          supabase.from("sectors").select("id, name").eq("client_id", g.client_id),
          supabase.from("categories").select("id, name, color"),
          supabase.from("subcategories").select("id, name").eq("client_id", g.client_id),
        ]);
        setSectorMap(Object.fromEntries((sec.data ?? []).map((s: any) => [s.id, s.name])));
        setCategoryMap(Object.fromEntries((cat.data ?? []).map((c: any) => [c.id, { name: c.name, color: c.color }])));
        setSubMap(Object.fromEntries((sub.data ?? []).map((s: any) => [s.id, s.name])));
      }
    })();
  }, [id]);

  const total = weighings.reduce((s, w) => s + Number(w.peso_kg), 0);

  const byCategory = Object.values(weighings.reduce((acc: Record<string, { name: string; value: number; color: string }>, w) => {
    const c = categoryMap[w.category_id];
    const key = w.category_id;
    if (!acc[key]) acc[key] = { name: c?.name ?? "—", value: 0, color: c?.color ?? "#8884d8" };
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
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
          <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar XLSX</Button>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{total.toFixed(1)} <span className="text-base text-muted-foreground">kg</span></p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Pesagens</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{weighings.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{byCategory.length}</p></CardContent></Card>
      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {weighings.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{sectorMap[w.sector_id] ?? "—"}</TableCell>
                    <TableCell>{categoryMap[w.category_id]?.name ?? "—"}</TableCell>
                    <TableCell>{subMap[w.subcategory_id] ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(w.peso_kg).toFixed(1)}</TableCell>
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

export default GravimetriaDetail;
