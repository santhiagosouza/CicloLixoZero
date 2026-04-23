import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as Recharts from "recharts";
const { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } = Recharts as any;

const Reports = () => {
  const { clientId } = useAuth();
  const [data, setData] = useState<{ name: string; total: number }[]>([]);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: gs } = await supabase.from("gravimetrias").select("id, numero").eq("client_id", clientId).order("numero");
      const ids = (gs ?? []).map((g: any) => g.id);
      if (!ids.length) { setData([]); return; }
      const { data: ws } = await supabase.from("weighings").select("gravimetria_id, peso_kg").in("gravimetria_id", ids);
      const byG: Record<string, number> = {};
      (ws ?? []).forEach((w: any) => { byG[w.gravimetria_id] = (byG[w.gravimetria_id] ?? 0) + Number(w.peso_kg); });
      setData((gs ?? []).map((g: any) => ({ name: `Gravimetria ${g.numero}`, total: byG[g.id] ?? 0 })));
    })();
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Comparativo entre gravimetrias</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Total gerado por Gravimetria (kg)</CardTitle></CardHeader>
        <CardContent style={{ height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} kg`} />
              <Legend />
              <Bar dataKey="total" name="kg" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
