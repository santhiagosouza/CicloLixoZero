import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Pencil, 
  Scale, 
  Leaf, 
  Recycle, 
  AlertTriangle, 
  Ban, 
  ChevronRight, 
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Share2,
  ChevronDown
} from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';
import * as XLSX from 'xlsx';
import { residuosFinanceiro } from '../data/residuosFinanceiro';

interface Weighing {
  id: string;
  data: string;
  peso_kg: number;
  sector_id: string;
  category_id: string;
  type_id: string;
  subcategory_id: string;
  classification_id: string;
}

interface Sector { id: string; name: string }
interface Classification { id: string; name: string }
interface Category { id: string; name: string; color: string | null }
interface Type { id: string; name: string; color: string | null; category_id?: string; default_classification_id?: string | null }
interface Subcategory { id: string; name: string; type_id?: string }

const GravimetriaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isClientAdmin, isMasterAdmin } = useAuth();
  const canEdit = isClientAdmin || isMasterAdmin;

  const [grav, setGrav] = useState<any>(null);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);


  // Maps
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [typeMap, setTypeMap] = useState<Record<string, Type>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // View state
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  // Edit Days dialog state
  const [editDaysOpen, setEditDaysOpen] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [editDaysValue, setEditDaysValue] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        let gRes = await supabase
          .from('gravimetrias')
          .select('*, clients(name, uf)')
          .eq('id', id)
          .maybeSingle();

        if (gRes.error && (gRes.error.message?.includes('uf') || gRes.error.code === '42703')) {
          console.warn('Coluna clients.uf não existe no banco de dados remoto. Buscando sem UF e usando fallback...');
          gRes = await supabase
            .from('gravimetrias')
            .select('*, clients(name)')
            .eq('id', id)
            .maybeSingle();
          
          if (gRes.data) {
            (gRes.data as any).clients = {
              ...(gRes.data as any).clients,
              uf: 'SP'
            };
          }
        }

        if (gRes.error) throw gRes.error;
        const g = gRes.data;
        setGrav(g);

        if (g) {
          const [wRes, secRes, classRes, catRes, typeRes, subRes] = await Promise.all([
            supabase.from('weighings').select('*').eq('gravimetria_id', id).order('data'),
            supabase.from('sectors').select('id, name').eq('client_id', g.client_id).eq('active', true).order('name'),
            supabase.from('classifications').select('id, name'),
            supabase.from('categories').select('id, name, color').order('name'),
            supabase.from('types').select('id, category_id, name, color, default_classification_id').order('name'),
            supabase.from('subcategories').select('id, type_id, name').or(`client_id.is.null,client_id.eq.${g.client_id}`).order('name')
          ]);

          const ws = (wRes.data || []) as Weighing[];
          setWeighings(ws);

          const secs = (secRes.data || []) as Sector[];
          const classes = (classRes.data || []) as Classification[];
          const cats = (catRes.data || []) as Category[];
          const typs = (typeRes.data || []) as Type[];
          const subs = (subRes.data || []) as Subcategory[];


          setSectorMap(Object.fromEntries(secs.map(s => [s.id, s.name])));
          setCategoryMap(Object.fromEntries(cats.map(c => [c.id, c])));
          setTypeMap(Object.fromEntries(typs.map(t => [t.id, t])));
          setSubMap(Object.fromEntries(subs.map(s => [s.id, s.name])));
          setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da gravimetria:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, reloadKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando relatório analítico...</p>
      </div>
    );
  }

  if (!grav) {
    return (
      <div className="card text-center" style={{ margin: '3rem auto', maxWidth: '500px' }}>
        <h2 style={{ color: 'hsl(var(--destructive))' }}>Gravimetria não encontrada</h2>
        <p className="text-muted mt-2">O código do estudo especificado não existe ou você não possui permissão de leitura.</p>
        <Link to="/" className="btn btn-primary mt-4">Voltar</Link>
      </div>
    );
  }

  // Calculations
  const totalWeight = weighings.reduce((sum, w) => sum + Number(w.peso_kg), 0);

  // Group weighings by Category
  const byCategory = Object.values(
    weighings.reduce((acc: Record<string, { id: string; name: string; value: number; color: string }>, w) => {
      const c = categoryMap[w.category_id];
      const key = w.category_id;
      if (!acc[key]) {
        acc[key] = { id: key, name: c?.name || '—', value: 0, color: c?.color || '#888' };
      }
      acc[key].value += Number(w.peso_kg);
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  // Group weighings by Sector
  const bySector = Object.values(
    weighings.reduce((acc: Record<string, { id: string; name: string; value: number }>, w) => {
      const key = w.sector_id;
      if (!acc[key]) {
        acc[key] = { id: key, name: sectorMap[w.sector_id] || '—', value: 0 };
      }
      acc[key].value += Number(w.peso_kg);
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  // Calculate Landfill Diversion Rate (Orgânico + Reciclável) / Total * 100
  const recyclableWeight = weighings
    .filter(w => {
      const catName = categoryMap[w.category_id]?.name || '';
      return catName.toLowerCase() === 'reciclável';
    })
    .reduce((sum, w) => sum + Number(w.peso_kg), 0);

  const organicWeight = weighings
    .filter(w => {
      const catName = categoryMap[w.category_id]?.name || '';
      return catName.toLowerCase() === 'orgânico';
    })
    .reduce((sum, w) => sum + Number(w.peso_kg), 0);

  const diversionRate = totalWeight > 0 
    ? ((recyclableWeight + organicWeight) / totalWeight) * 100 
    : 0;

  // Projections
  const days = grav.sample_days || 0;
  const dailyAvg = days > 0 ? totalWeight / days : 0;
  const monthlyProjection = dailyAvg * 30;
  const yearlyProjection = dailyAvg * 365;

  // Valoração Financeira
  const clientUf = (grav?.clients?.uf || 'SP').toUpperCase();
  const custoRejeitoKg = (residuosFinanceiro.custo_rejeito as any)[clientUf] ?? 0.36;
  const economiaAterro = (recyclableWeight + organicWeight) * custoRejeitoKg;

  let receitaMateriais = 0;
  const receitaPorTipo: Record<string, { typeName: string; value: number; color: string }> = {};

  weighings.forEach(w => {
    const subName = subMap[w.subcategory_id];
    const typeObj = typeMap[w.type_id];
    const typeName = typeObj?.name || 'Outros';
    const catObj = categoryMap[w.category_id];
    const isRecyclableOrOrganic = catObj?.name.toLowerCase() === 'reciclável' || catObj?.name.toLowerCase() === 'orgânico';

    if (subName && isRecyclableOrOrganic) {
      const precosUF = (residuosFinanceiro.precos as any)[clientUf] || {};
      let precoUnitario = 0;
      const keys = Object.keys(precosUF);
      const matchKey = keys.find(
        k => k.toLowerCase() === subName.toLowerCase() || 
             subName.toLowerCase().startsWith(k.toLowerCase()) || 
             k.toLowerCase().startsWith(subName.toLowerCase())
      );
      
      if (matchKey) {
        precoUnitario = precosUF[matchKey] ?? 0;
      }

      const itemVal = Number(w.peso_kg) * precoUnitario;
      receitaMateriais += itemVal;

      if (itemVal > 0) {
        const key = w.type_id;
        if (!receitaPorTipo[key]) {
          receitaPorTipo[key] = {
            typeName,
            value: 0,
            color: typeObj?.color || catObj?.color || '#888'
          };
        }
        receitaPorTipo[key].value += itemVal;
      }
    }
  });

  const receitasDetalhadas = Object.values(receitaPorTipo).sort((a, b) => b.value - a.value);
  const impactoTotal = economiaAterro + receitaMateriais;

  // Financial projections (day/month/year)
  const financialDailyAvg = days > 0 ? impactoTotal / days : 0;
  const financialMonthly = financialDailyAvg * 30;
  const financialYearly = financialDailyAvg * 365;

  // Matrix calculations: Sector vs Category
  // We want to build: Sector -> Record<CategoryId, weight>
  const orderRef = ['Orgânico', 'Reciclável', 'Perigoso', 'Rejeito'];
  const allCatIds = Array.from(new Set(weighings.map(w => w.category_id)));
  const sortedCategories = allCatIds
    .map(id => ({ id, name: categoryMap[id]?.name || '—', color: categoryMap[id]?.color || '#888' }))
    .sort((a, b) => {
      const ai = orderRef.findIndex(o => o.toLowerCase() === a.name.toLowerCase());
      const bi = orderRef.findIndex(o => o.toLowerCase() === b.name.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  type MatrixRow = {
    sectorId: string;
    sectorName: string;
    total: number;
    byCat: Record<string, { total: number; types: Record<string, { name: string; total: number; subs: Record<string, { name: string; total: number }> }> }>;
  };

  const matrixMap = new Map<string, MatrixRow>();
  weighings.forEach(w => {
    let row = matrixMap.get(w.sector_id);
    if (!row) {
      row = {
        sectorId: w.sector_id,
        sectorName: sectorMap[w.sector_id] || '—',
        total: 0,
        byCat: {}
      };
      matrixMap.set(w.sector_id, row);
    }
    const kg = Number(w.peso_kg);
    row.total += kg;

    if (!row.byCat[w.category_id]) {
      row.byCat[w.category_id] = { total: 0, types: {} };
    }
    row.byCat[w.category_id].total += kg;

    // Deep nesting for expanded details: Type
    if (!row.byCat[w.category_id].types[w.type_id]) {
      row.byCat[w.category_id].types[w.type_id] = { name: typeMap[w.type_id]?.name || '—', total: 0, subs: {} };
    }
    row.byCat[w.category_id].types[w.type_id].total += kg;

    // Subcategory
    if (!row.byCat[w.category_id].types[w.type_id].subs[w.subcategory_id]) {
      row.byCat[w.category_id].types[w.type_id].subs[w.subcategory_id] = { name: subMap[w.subcategory_id] || '—', total: 0 };
    }
    row.byCat[w.category_id].types[w.type_id].subs[w.subcategory_id].total += kg;
  });

  const matrixRows = Array.from(matrixMap.values()).sort((a, b) => b.total - a.total);

  // Column totals
  const columnTotals: Record<string, number> = {};
  sortedCategories.forEach(c => {
    columnTotals[c.id] = matrixRows.reduce((sum, row) => sum + (row.byCat[c.id]?.total || 0), 0);
  });

  const handleToggleSectorExpand = (secId: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const handleSaveSampleDays = async () => {
    const n = parseInt(editDaysValue, 10);
    if (isNaN(n) || n < 1) {
      alert('Informe um número de dias válido.');
      return;
    }

    try {
      const { error } = await supabase
        .from('gravimetrias')
        .update({ sample_days: n })
        .eq('id', id);

      if (error) throw error;

      setEditDaysOpen(false);
      setEditDaysValue('');
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao atualizar dias amostrados: ' + err.message);
    }
  };

  // Export to Excel (XLSX)
  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();

    // 1. Resumo Sheet
    const summaryData: any[][] = [
      ['RELATÓRIO DE GRAVIMETRIA - RESUMO'],
      ['Estudo Código', id],
      ['Estudo Número', grav.numero],
      ['Data de Início', new Date(grav.started_at).toLocaleString('pt-BR')],
      ['Data de Fim', grav.ended_at ? new Date(grav.ended_at).toLocaleString('pt-BR') : 'Em andamento'],
      ['Dias Amostrados', grav.sample_days || 'Não informado'],
      ['Massa Total (kg)', Number(totalWeight.toFixed(2))],
      ['Taxa de Desvio de Aterro (%)', Number(diversionRate.toFixed(1)) + '%'],
      [],
      ['GERAÇÃO POR CATEGORIA'],
      ['Categoria', 'Massa Gerada (kg)', 'Porcentagem (%)'],
      ...byCategory.map(c => [
        c.name, 
        Number(c.value.toFixed(2)), 
        Number(((c.value / (totalWeight || 1)) * 100).toFixed(1))
      ]),
      [],
      ['GERAÇÃO POR SETOR'],
      ['Setor', 'Massa Gerada (kg)', 'Porcentagem (%)'],
      ...bySector.map(s => [
        s.name, 
        Number(s.value.toFixed(2)), 
        Number(((s.value / (totalWeight || 1)) * 100).toFixed(1))
      ])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    // 2. Detalhes Sheet
    const detailsData: any[][] = [
      ['Data', 'Setor', 'Categoria', 'Tipo', 'Subcategoria', 'Classificação', 'Peso (kg)']
    ];
    weighings.forEach(w => {
      detailsData.push([
        w.data,
        sectorMap[w.sector_id] || '',
        categoryMap[w.category_id]?.name || '',
        typeMap[w.type_id]?.name || '',
        subMap[w.subcategory_id] || '',
        classMap[w.classification_id] || '',
        Number(Number(w.peso_kg).toFixed(2))
      ]);
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Pesagens Detalhadas');

    XLSX.writeFile(wb, `analise-gravimetrica-${grav.numero}.xlsx`);
  };

  // Export to CSV
  const exportToCSV = () => {
    const rows = [
      ['Data', 'Setor', 'Categoria', 'Tipo', 'Subcategoria', 'Classificação', 'Peso (kg)']
    ];
    weighings.forEach(w => {
      rows.push([
        w.data,
        sectorMap[w.sector_id] || '',
        categoryMap[w.category_id]?.name || '',
        typeMap[w.type_id]?.name || '',
        subMap[w.subcategory_id] || '',
        classMap[w.classification_id] || '',
        Number(w.peso_kg).toFixed(3)
      ]);
    });
    const csvContent = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise-gravimetrica-${grav.numero}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 print-area">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between flex-wrap gap-2 no-print" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-ghost btn-icon" style={{ borderRadius: 'var(--radius-md)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Relatório Gravimetria
            </h1>
            <p className="text-muted text-sm flex items-center gap-2 mt-1 flex-wrap">
              Arquivo {String(grav.numero).padStart(2, '0')}
              <span className="text-muted" style={{ opacity: 0.5 }}>•</span>
              <Calendar size={13} style={{ flexShrink: 0 }} />
              <span>{new Date(grav.started_at).toLocaleDateString('pt-BR')} — {grav.ended_at ? new Date(grav.ended_at).toLocaleDateString('pt-BR') : 'Em andamento'}</span>
              <span className="text-muted" style={{ opacity: 0.5 }}>•</span>
              <span style={{ 
                backgroundColor: 'hsl(var(--accent))', 
                color: 'hsl(var(--accent-foreground))',
                padding: '0.15rem 0.6rem', 
                borderRadius: '9999px', 
                fontSize: '0.7rem', 
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                flexShrink: 0
              }}>
                Amostra {days || '—'} dias
                {canEdit && (
                  <button 
                    onClick={() => { setEditDaysValue(days ? String(days) : ''); setEditDaysOpen(true); }}
                    className="btn btn-ghost btn-icon no-print"
                    style={{ padding: '2px', width: 'auto', height: 'auto', display: 'inline-flex', color: 'inherit' }}
                    title="Editar dias"
                  >
                    <Pencil size={10} />
                  </button>
                )}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Link 
              to={`/gravimetria/${id}/lancamentos`}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Pencil size={15} />
              <span>Editar Lançamentos</span>
            </Link>
          )}

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShareDropdownOpen(!shareDropdownOpen)} 
              className="btn btn-outline" 
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Share2 size={15} />
              <span>Exportar</span>
              <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>
            {shareDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-50 no-print" 
                  onClick={() => setShareDropdownOpen(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                />
                <div 
                  className="card no-print"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)',
                    right: 0,
                    zIndex: 1000,
                    minWidth: '180px',
                    padding: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    border: '1px solid hsl(var(--card-border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                >
                  <button 
                    onClick={() => { window.print(); setShareDropdownOpen(false); }} 
                    className="btn btn-ghost" 
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.5rem 0.75rem', 
                      justifyContent: 'flex-start',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Printer size={15} />
                    <span>Imprimir</span>
                  </button>
                  <button 
                    onClick={() => { exportToXLSX(); setShareDropdownOpen(false); }} 
                    className="btn btn-ghost" 
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.5rem 0.75rem', 
                      justifyContent: 'flex-start',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Excel (XLSX)</span>
                  </button>
                  <button 
                    onClick={() => { exportToCSV(); setShareDropdownOpen(false); }} 
                    className="btn btn-ghost" 
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.5rem 0.75rem', 
                      justifyContent: 'flex-start',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Download size={15} />
                    <span>CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO B — PROJEÇÃO DE GERAÇÃO (5 cards) */}
      <div style={{ marginTop: '0.75rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
          <h2 className="report-section-title">
            Projeção de Geração
          </h2>
          <InfoTooltip text="Valores baseados na média diária de geração de resíduos extrapolados para períodos mensais (30 dias) e anuais (365 dias). Fórmula: Geração Total ÷ Dias Amostrados × Período." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* Total Pesagem */}
          <div className="card" style={{ padding: '1rem 1.25rem', minHeight: '90px' }}>
            <div className="flex items-center gap-3">
              <Scale size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Total Pesagem</span>
            </div>
            <p className="font-semibold mt-2" style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
              {totalWeight.toFixed(2)} <span className="text-sm text-muted font-normal">Kg.</span>
            </p>
          </div>

          {/* Recicláveis % */}
          <div className="card" style={{ padding: '1rem 1.25rem', minHeight: '90px' }}>
            <div className="flex items-center gap-3">
              <Recycle size={20} style={{ color: 'hsl(var(--secondary))', flexShrink: 0 }} />
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Recicláveis</span>
            </div>
            <p className="font-semibold mt-2" style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'var(--font-heading)', color: diversionRate >= 90 ? 'hsl(var(--primary))' : diversionRate >= 50 ? 'hsl(var(--foreground))' : 'hsl(var(--destructive))' }}>
              {diversionRate.toFixed(1)} <span className="text-sm text-muted font-normal">%</span>
            </p>
          </div>

          {/* Média/Dia */}
          <div className="card" style={{ padding: '1rem 1.25rem', minHeight: '90px' }}>
            <div className="flex items-center gap-3">
              <BarChart3 size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Média / Dia</span>
            </div>
            <p className="font-semibold mt-2" style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
              {dailyAvg.toFixed(2)} <span className="text-sm text-muted font-normal">Kg.</span>
            </p>
          </div>

          {/* Média/Mês */}
          <div className="card" style={{ padding: '1rem 1.25rem', minHeight: '90px' }}>
            <div className="flex items-center gap-3">
              <Calendar size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Média / Mês</span>
            </div>
            <p className="font-semibold mt-2" style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
              {monthlyProjection.toFixed(1)} <span className="text-sm text-muted font-normal">Kg.</span>
            </p>
          </div>

          {/* Média/Ano */}
          <div className="card" style={{ padding: '1rem 1.25rem', minHeight: '90px' }}>
            <div className="flex items-center gap-3">
              <TrendingUp size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Média / Ano</span>
            </div>
            <p className="font-semibold mt-2" style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
              {yearlyProjection.toFixed(1)} <span className="text-sm text-muted font-normal">Kg.</span>
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO C — GERAÇÃO POR CATEGORIA (4 cards com barras) */}
      {totalWeight > 0 && (
        <div style={{ marginTop: '2.25rem' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
            <h2 className="report-section-title">Geração por Categoria</h2>
            <InfoTooltip text="Distribuição do peso total por categoria de resíduo: Orgânico, Reciclável, Perigoso e Rejeito." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {byCategory.map(c => {
              const pct = (c.value / totalWeight) * 100;
              const nName = c.name.toLowerCase();
              const Icon = nName.includes('orgân') ? Leaf 
                : nName.includes('recicl') ? Recycle 
                : nName.includes('perig') ? AlertTriangle 
                : nName.includes('rejeit') ? Ban 
                : Scale;
              
              return (
                <div 
                  key={c.id} 
                  className="card"
                  style={{ 
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${c.color}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <Icon size={18} style={{ color: c.color, flexShrink: 0 }} />
                      {c.name}
                    </span>
                    <span className="text-xs font-bold" style={{ color: c.color }}>{pct.toFixed(1)}%</span>
                  </div>
                  <p className="font-semibold" style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', margin: '0.5rem 0 0.25rem' }}>
                    {c.value.toFixed(2)} <span className="text-xs text-muted font-normal">Kg.</span>
                  </p>
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'hsl(var(--muted))', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO D — PREVISÃO POR CATEGORIA (Tabela DIA/MÊS/ANO) */}
      {days > 0 ? (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginTop: '2.25rem' }}>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'transparent' }}>
            <table className="table" style={{ background: 'transparent' }}>
              <thead>
                <tr style={{ background: 'transparent', borderBottom: '1px solid hsl(var(--card-border))' }}>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.825rem', textAlign: 'left', backgroundColor: 'hsl(var(--card))' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textTransform: 'none', color: 'hsl(var(--foreground))', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      Previsão por Categoria
                      <InfoTooltip text="Projeção de geração por categoria baseada na média diária extrapolada para períodos mensais (30 dias) e anuais (365 dias). Útil para planejamento de caçambas, bombonas e frequência de coletas." position="down" />
                    </span>
                  </th>
                  <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>DIA</th>
                  <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>MÊS</th>
                  <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>ANO</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map(c => {
                  const cDailyAvg = c.value / days;
                  const cMonthly = cDailyAvg * 30;
                  const cYearly = cDailyAvg * 365;
                  const nName = c.name.toLowerCase();
                  const Icon = nName.includes('orgân') ? Leaf 
                    : nName.includes('recicl') ? Recycle 
                    : nName.includes('perig') ? AlertTriangle 
                    : nName.includes('rejeit') ? Ban 
                    : Scale;
                  return (
                    <tr key={c.id} style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>
                        <span className="flex items-center gap-2">
                          <span style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            backgroundColor: `${c.color}15`, color: c.color,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <Icon size={12} />
                          </span>
                          {c.name}
                        </span>
                      </td>
                      <td className="text-center font-medium text-sm text-muted" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>{cDailyAvg.toFixed(2)} Kg.</td>
                      <td className="text-center font-semibold text-sm" style={{ padding: '0.875rem 1rem', color: 'hsl(var(--primary))', textAlign: 'center' }}>{cMonthly.toFixed(1)} Kg.</td>
                      <td className="text-center font-semibold text-sm" style={{ padding: '0.875rem 1rem', color: 'hsl(var(--primary))', textAlign: 'center' }}>{cYearly.toFixed(1)} Kg.</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center" style={{ borderStyle: 'dashed', padding: '1.5rem' }}>
          <p className="text-muted text-sm">
            ⚠️ Para habilitar as previsões de geração mensal e anual, preencha o número de <strong>dias de coleta considerados</strong> (clique no lápis acima).
          </p>
        </div>
      )}

      {/* SEÇÃO E — FINANCEIRO & ECONÔMICO (integrado) */}
      {totalWeight > 0 && (
        <div style={{ marginTop: '2.25rem' }}>
          {/* Section header */}
          <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
            <h2 className="report-section-title">
              <DollarSign size={18} />
              Financeiro & Econômico
            </h2>
            <InfoTooltip text={`Estimativa calculada com base nos custos de destinação de RSU e preços médios de comercialização de sucata/compostos do estado de ${clientUf} para 2026.`} />
          </div>

          {/* 5 Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {/* Desvio de Aterro */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Desvio de Aterro</span>
              <p className="font-semibold mt-1" style={{ fontSize: '1.35rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
                R$ {economiaAterro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Valor do Material */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Valor do Material</span>
              <p className="font-semibold mt-1" style={{ fontSize: '1.35rem', lineHeight: '1', fontFamily: 'var(--font-heading)' }}>
                R$ {receitaMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Impacto Econômico */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Impacto Econômico</span>
              <p className="font-semibold mt-1" style={{ fontSize: '1.35rem', lineHeight: '1', fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>
                R$ {impactoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Impacto MÊS */}
            <div className="card" style={{ 
              padding: '1rem 1.25rem',
              border: '2px solid hsl(var(--primary))',
            }}>
              <div className="flex items-start justify-between">
                <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Impacto - MÊS</span>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: 'hsl(var(--primary))', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '-0.3rem', marginRight: '-0.3rem', flexShrink: 0
                }}>
                  <DollarSign size={15} />
                </span>
              </div>
              <p className="font-semibold mt-1" style={{ fontSize: '1.35rem', lineHeight: '1', fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>
                R$ {financialMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Impacto ANO */}
            <div className="card" style={{ 
              padding: '1rem 1.25rem',
              border: '2px solid hsl(var(--primary))',
            }}>
              <div className="flex items-start justify-between">
                <span className="text-muted text-xs font-semibold" style={{ lineHeight: 1.2 }}>Impacto - ANO</span>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: 'hsl(var(--primary))', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '-0.3rem', marginRight: '-0.3rem', flexShrink: 0
                }}>
                  <DollarSign size={15} />
                </span>
              </div>
              <p className="font-semibold mt-1" style={{ fontSize: '1.35rem', lineHeight: '1', fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>
                R$ {financialYearly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Detalhamento por Tipo de Material */}
          {receitasDetalhadas.length > 0 && (
            <>
              <div className="flex items-center" style={{ marginBottom: '1.25rem', marginTop: '2.25rem' }}>
                <h2 className="report-section-title">Detalhamento por Tipo de Material</h2>
              </div>

              <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <div className="table-container" style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'transparent' }}>
                  <table className="table" style={{ background: 'transparent' }}>
                    <thead>
                      <tr style={{ background: 'transparent', borderBottom: '1px solid hsl(var(--card-border))' }}>
                        <th style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.825rem', textAlign: 'left', backgroundColor: 'hsl(var(--card))' }}>TOTAL DA GERAÇÃO</th>
                        <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>DIA</th>
                        <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>MÊS</th>
                        <th className="text-center" style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.8rem', width: '20%', textAlign: 'center', backgroundColor: 'hsl(var(--card))' }}>ANO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receitasDetalhadas.map((item, idx) => {
                        const pctReceita = receitaMateriais > 0 ? (item.value / receitaMateriais) * 100 : 0;
                        const dailyVal = days > 0 ? item.value / days : 0;
                        const monthlyVal = dailyVal * 30;
                        const yearlyVal = dailyVal * 365;
                        return (
                          <tr key={idx} style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2 text-sm font-semibold">
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                    {item.typeName}
                                  </span>
                                  <span className="font-semibold" style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                                  <div style={{ flex: 1, height: '5px', backgroundColor: 'hsl(var(--muted))', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pctReceita}%`, backgroundColor: item.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                                  </div>
                                  <span className="text-xs text-muted font-semibold" style={{ minWidth: '35px', textAlign: 'right' }}>{pctReceita.toFixed(1)} %</span>
                                </div>
                              </div>
                            </td>
                            <td className="text-center text-sm text-muted" style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              R$ {dailyVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-center text-sm text-muted" style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              R$ {monthlyVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-center text-sm font-semibold" style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              R$ {yearlyVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MATRIX TABLE DISPLAY (ALWAYS VISIBLE) */}
      {matrixRows.length > 0 && (
        <div className="card" style={{ marginTop: '2.25rem' }}>
          <div className="card-header">
            <h2 className="card-title">Matriz de Geração: Setor vs Categoria</h2>
            <p className="card-description">Clique em um setor para ver o detalhamento completo por tipo e subcategoria de resíduo</p>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Setor</th>
                  {sortedCategories.map(c => {
                    const nName = c.name.toLowerCase();
                    const CategoryIcon = nName.includes('orgân') ? Leaf 
                      : nName.includes('recicl') ? Recycle 
                      : nName.includes('perig') ? AlertTriangle 
                      : nName.includes('rejeit') ? Ban 
                      : Scale;
                    return (
                      <th key={c.id} className="text-right" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                          <CategoryIcon size={14} style={{ color: c.color || 'inherit' }} />
                          {c.name.toUpperCase()}
                        </span>
                      </th>
                    );
                  })}
                  <th className="text-right">Total (kg)</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(row => {
                  const isOpen = expandedSectors.has(row.sectorId);
                  return (
                    <React.Fragment key={row.sectorId}>
                      <tr 
                        onClick={() => handleToggleSectorExpand(row.sectorId)} 
                        style={{ cursor: 'pointer' }}
                        className="hover-trigger-row"
                      >
                        <td className="font-semibold">
                          <span className="flex items-center gap-1.5">
                            <ChevronRight 
                              size={16} 
                              style={{ 
                                transition: 'transform 0.2s ease', 
                                transform: isOpen ? 'rotate(90deg)' : 'none',
                                color: 'hsl(var(--muted-foreground))'
                              }} 
                            />
                            {row.sectorName}
                          </span>
                        </td>
                        {sortedCategories.map(c => {
                          const val = row.byCat[c.id]?.total || 0;
                          return (
                            <td key={c.id} className="text-right text-sm">
                              {val > 0 ? `${val.toFixed(2)}` : '—'}
                            </td>
                          );
                        })}
                        <td className="text-right font-semibold">{row.total.toFixed(2)}</td>
                      </tr>

                      {/* Expandable detailed section */}
                      {isOpen && (
                        <tr>
                          <td colSpan={sortedCategories.length + 2} style={{ backgroundColor: 'rgba(56, 142, 60, 0.01)', padding: '1.25rem' }}>
                            <div className="flex flex-col gap-3">
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Detalhamento: {row.sectorName}</h4>
                              
                              <div className="flex flex-col gap-4">
                                {sortedCategories
                                  .filter(c => row.byCat[c.id])
                                  .map(c => {
                                    const catData = row.byCat[c.id];
                                    const typesInCat = Object.entries(catData.types).sort((a, b) => b[1].total - a[1].total);
                                    const nName = c.name.toLowerCase();
                                    const CategoryIcon = nName.includes('orgân') ? Leaf 
                                      : nName.includes('recicl') ? Recycle 
                                      : nName.includes('perig') ? AlertTriangle 
                                      : nName.includes('rejeit') ? Ban 
                                      : Scale;
                                    return (
                                      <div 
                                        key={c.id} 
                                        style={{ 
                                          border: '1px solid hsl(var(--card-border))', 
                                          borderRadius: 'var(--radius-md)', 
                                          padding: '1.25rem', 
                                          backgroundColor: 'hsl(var(--card))',
                                          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)'
                                        }}
                                      >
                                        <div className="flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                          <span className="flex items-center gap-2 text-sm font-semibold">
                                            <CategoryIcon size={16} style={{ color: c.color }} />
                                            {c.name}
                                          </span>
                                          <span className="text-sm text-muted font-semibold">{catData.total.toFixed(2)} kg</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {typesInCat.map(([typeId, typeVal]) => {
                                            const subItems = Object.entries(typeVal.subs).sort((a, b) => b[1].total - a[1].total);
                                            return (
                                              <div 
                                                key={typeId} 
                                                style={{ 
                                                  padding: '0.75rem', 
                                                  backgroundColor: 'hsl(var(--background))', 
                                                  borderRadius: 'var(--radius-sm)',
                                                  border: '1px solid hsl(var(--card-border))'
                                                }}
                                              >
                                                <div className="flex justify-between items-center text-xs font-semibold" style={{ borderBottom: '1px dashed hsl(var(--card-border))', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                                                  <span>{typeVal.name}</span>
                                                  <span className="text-muted">{typeVal.total.toFixed(2)} kg</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                  {subItems.map(([subId, subVal]) => (
                                                    <div key={subId} className="flex justify-between items-center text-xs text-muted" style={{ paddingLeft: '0.25rem' }}>
                                                      <span>&bull; {subVal.name}</span>
                                                      <span>{subVal.total.toFixed(2)} kg</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Column Totals Row */}
                <tr style={{ backgroundColor: 'hsl(var(--muted))', fontWeight: 600 }}>
                  <td>Total Geral</td>
                  {sortedCategories.map(c => (
                    <td key={c.id} className="text-right">
                      {columnTotals[c.id] > 0 ? columnTotals[c.id].toFixed(2) : '0.00'}
                    </td>
                  ))}
                  <td className="text-right">{totalWeight.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG: EDIT DAYS */}
      {editDaysOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title font-semibold">Editar dias de amostragem</h3>
              <button onClick={() => setEditDaysOpen(false)} className="modal-close">&times;</button>
            </div>
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label">Dias de coleta considerados</label>
              <input 
                type="number" 
                min="1" 
                step="1" 
                className="form-input" 
                value={editDaysValue} 
                onChange={e => setEditDaysValue(e.target.value)} 
              />
              <p className="text-xs text-muted mt-1">
                Altere o número de dias de coleta. Isso irá atualizar instantaneamente as previsões mensais e anuais.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditDaysOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSaveSampleDays} className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for print and row hover */}
      <style>{`
        @media print {
          .no-print, .btn, header, aside, .sidebar-backdrop, .modal-overlay, .flex.justify-center {
            display: none !important;
          }
          .main-content-el {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .content-container {
            max-width: none !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            backdrop-filter: none !important;
          }
          .table-container {
            border: none !important;
          }
          body {
            background-color: #fff !important;
            color: #000 !important;
          }
        }
        .hover-trigger-row:hover {
          background-color: rgba(56, 142, 60, 0.03) !important;
        }
      `}</style>

    </div>
  );
};

export default GravimetriaDetail;
