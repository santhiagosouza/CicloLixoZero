import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Scale, Tags } from "lucide-react";

const MasterDashboard = () => {
  const [stats, setStats] = useState({ clients: 0, gravimetrias: 0, totalKg: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [c, g, w] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("gravimetrias").select("id", { count: "exact", head: true }),
        supabase.from("weighings").select("peso_kg"),
      ]);
      const total = (w.data ?? []).reduce((s: number, x: any) => s + Number(x.peso_kg), 0);
      setStats({ clients: c.count ?? 0, gravimetrias: g.count ?? 0, totalKg: total });

      const { data: gs } = await supabase.from("gravimetrias").select("id, numero, started_at, ended_at, client_id, clients(name)").order("started_at", { ascending: false }).limit(10);
      setRecent(gs ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Painel master administrativo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.clients}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gravimetrias</CardTitle><Tags className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.gravimetrias}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total pesado</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.totalKg.toFixed(2)} <span className="text-base text-muted-foreground">kg</span></p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Gravimetrias recentes</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma gravimetria ainda</p>}
          <div className="space-y-2">
            {recent.map((g) => (
              <div key={g.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium">{g.clients?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Gravimetria {g.numero} — {new Date(g.started_at).toLocaleString("pt-BR")}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${g.ended_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  {g.ended_at ? "Encerrada" : "Em andamento"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterDashboard;
