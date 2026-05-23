import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as Recharts from "recharts";
const { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } = Recharts as any;

const Reports = () => {
  const { clientId } = useAuth();
  const [data, setData] = useState<{ name: string; total: number; pct: number }[]>([]);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: gs } = await supabase.from("gravimetrias").select("id, numero").eq("client_id", clientId).order("numero");
      const ids = (gs ?? []).map((g: any) => g.id);
      if (!ids.length) { setData([]); return; }
      const { data: ws } = await supabase.from("weighings").select("gravimetria_id, peso_kg").in("gravimetria_id", ids);
      const byG: Record<string, number> = {};
      (ws ?? []).forEach((w: any) => { byG[w.gravimetria_id] = (byG[w.gravimetria_id] ?? 0) + Number(w.peso_kg); });
      const rows = (gs ?? []).map((g: any) => ({ name: `Gravimetria ${g.numero}`, total: byG[g.id] ?? 0 }));
      const sum = rows.reduce((s, r) => s + r.total, 0);
      setData(rows.map((r) => ({ ...r, pct: sum > 0 ? (r.total / sum) * 100 : 0 })));
    })();
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Comparativo entre gravimetrias</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Total gerado por Gravimetria (kg e % do total)</CardTitle></CardHeader>
        <CardContent style={{ height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(v: any, _n: any, item: any) => [
                  `${Number(v).toFixed(1)} kg (${Number(item?.payload?.pct ?? 0).toFixed(1)}%)`,
                  "Total",
                ]}
              />
              <Legend />
              <Bar dataKey="total" name="kg" fill="hsl(var(--primary))">
                <LabelList
                  dataKey="pct"
                  position="top"
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  className="fill-foreground"
                  style={{ fontSize: 12 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
