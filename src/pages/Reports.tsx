import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2, TrendingUp, TrendingDown, Scale, Percent } from 'lucide-react';

interface GravimetriaReportRow {
  name: string;
  total_kg: number;
  diversion_rate: number;
}

const Reports: React.FC = () => {
  const { clientId } = useAuth();
  const [data, setData] = useState<GravimetriaReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const fetchReportsData = async () => {
      setLoading(true);
      try {
        // Fetch closed gravimetrias
        const { data: gravs, error: gError } = await supabase
          .from('gravimetrias')
          .select('id, numero, started_at')
          .eq('client_id', clientId)
          .not('ended_at', 'is', null)
          .order('numero');

        if (gError) throw gError;

        if (!gravs || gravs.length === 0) {
          setData([]);
          return;
        }

        const ids = gravs.map(g => g.id);

        // Fetch weighings for all these gravimetrias
        const { data: ws, error: wError } = await supabase
          .from('weighings')
          .select('gravimetria_id, peso_kg, category_id')
          .in('gravimetria_id', ids);

        if (wError) throw wError;

        // Fetch category names to identify Orgânico and Reciclável for diversion rate
        const { data: cats, error: cError } = await supabase
          .from('categories')
          .select('id, name');

        if (cError) throw cError;

        const recyclableCatIds = new Set(
          (cats || []).filter(c => c.name.toLowerCase() === 'reciclável').map(c => c.id)
        );
        const organicCatIds = new Set(
          (cats || []).filter(c => c.name.toLowerCase() === 'orgânico').map(c => c.id)
        );

        // Accumulate weights and rates
        const statsMap: Record<string, { total: number; diverted: number }> = {};
        ids.forEach(id => {
          statsMap[id] = { total: 0, diverted: 0 };
        });

        (ws || []).forEach(w => {
          const kg = Number(w.peso_kg);
          if (statsMap[w.gravimetria_id]) {
            statsMap[w.gravimetria_id].total += kg;
            if (recyclableCatIds.has(w.category_id) || organicCatIds.has(w.category_id)) {
              statsMap[w.gravimetria_id].diverted += kg;
            }
          }
        });

        const reportRows = gravs.map(g => {
          const stat = statsMap[g.id] || { total: 0, diverted: 0 };
          const diversionRate = stat.total > 0 ? (stat.diverted / stat.total) * 100 : 0;
          return {
            name: `Estudo #${g.numero}`,
            total_kg: Number(stat.total.toFixed(2)),
            diversion_rate: Number(diversionRate.toFixed(1))
          };
        });

        setData(reportRows);
      } catch (err: any) {
        console.error('Erro ao buscar dados do relatório comparativo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [clientId]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando comparativo histórico...</p>
      </div>
    );
  }

  // Calculate trends if we have at least 2 studies
  let weightTrend = 0;
  let diversionTrend = 0;
  if (data.length >= 2) {
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    weightTrend = last.total_kg - prev.total_kg;
    diversionTrend = last.diversion_rate - prev.diversion_rate;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Relatórios Comparativos</h1>
        <p className="text-muted text-sm font-medium">Compare a geração de resíduos e a taxa de reciclagem ao longo do tempo</p>
      </div>

      {data.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem', marginTop: '1rem' }}>
          <BarChart2 size={40} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5, margin: '0 auto 1rem' }} />
          <h3>Dados comparativos indisponíveis</h3>
          <p className="text-muted text-sm mt-2" style={{ maxWidth: '450px', margin: '0 auto' }}>
            Para ver o comparativo, é necessário possuir pelo menos um estudo de gravimetria encerrado e com pesagens lançadas no histórico.
          </p>
        </div>
      ) : (
        <>
          {/* Trend Summary Cards */}
          {data.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: '0.5rem' }}>
              {/* Weight trend card */}
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider">Evolução da Geração (Massa)</p>
                  <p className="font-semibold text-lg mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    {weightTrend < 0 
                      ? `Redução de ${Math.abs(weightTrend).toFixed(1)} kg` 
                      : `Aumento de ${weightTrend.toFixed(1)} kg`}
                  </p>
                  <p className="text-muted text-xs mt-1">Comparado ao penúltimo estudo realizado</p>
                </div>
                <div 
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: weightTrend <= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: weightTrend <= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {weightTrend <= 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                </div>
              </div>

              {/* Diversion trend card */}
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider">Evolução do Desvio de Aterro</p>
                  <p className="font-semibold text-lg mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    {diversionTrend >= 0 
                      ? `Melhoria de +${diversionTrend.toFixed(1)}%` 
                      : `Queda de ${diversionTrend.toFixed(1)}%`}
                  </p>
                  <p className="text-muted text-xs mt-1">Comparado ao penúltimo estudo realizado</p>
                </div>
                <div 
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: diversionTrend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: diversionTrend >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {diversionTrend >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
              </div>
            </div>
          )}

          {/* Historical Weight chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chart: Weight generated */}
            <div className="card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header flex items-center gap-2 mb-2">
                <Scale size={18} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Histórico de Geração Total (kg)</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)} kg`} />
                    <Bar dataKey="total_kg" name="Resíduos (kg)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {data.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" opacity={0.8 + (index / data.length) * 0.2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Diversion rate */}
            <div className="card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header flex items-center gap-2 mb-2">
                <Percent size={18} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Taxa de Desvio de Aterro (%)</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                    <Bar dataKey="diversion_rate" name="Desvio (%)" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {data.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill="#3b82f6" opacity={0.8 + (index / data.length) * 0.2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
