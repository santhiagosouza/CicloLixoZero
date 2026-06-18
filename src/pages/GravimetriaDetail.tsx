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
  Check, 
  X, 
  Trash2,
  Calendar,
  Eye,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as Recharts from 'recharts';
import { residuosFinanceiro } from '../data/residuosFinanceiro';

const { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } = Recharts as any;

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

  // Aux configuration
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Maps
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [typeMap, setTypeMap] = useState<Record<string, Type>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // View state
  const [showDetailed, setShowDetailed] = useState(true);
  const [showWeighings, setShowWeighings] = useState(false);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  // Edit states
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPeso, setEditPeso] = useState('');

  // Edit Days dialog state
  const [editDaysOpen, setEditDaysOpen] = useState(false);
  const [editDaysValue, setEditDaysValue] = useState('');

  // Delete dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

          setSectors(secs);
          setCategories(cats);
          setTypes(typs);
          setSubcategories(subs);

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
  weighings.forEach(w => {
    const subName = subMap[w.subcategory_id];
    if (subName) {
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
      receitaMateriais += Number(w.peso_kg) * precoUnitario;
    }
  });
  const impactoTotal = economiaAterro + receitaMateriais;

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

  const editFilteredTypes = types.filter(t => t.category_id === editCategory);
  const editFilteredSubs = subcategories.filter(s => s.type_id === editType);

  const handleToggleSectorExpand = (secId: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const handleStartInlineEdit = (w: Weighing) => {
    setEditId(w.id);
    setEditData(w.data);
    setEditSector(w.sector_id);
    setEditCategory(w.category_id);
    setEditType(w.type_id);
    setEditSub(w.subcategory_id);
    setEditClass(w.classification_id);
    setEditPeso(String(w.peso_kg));
  };

  const handleSaveInlineEdit = async (wid: string) => {
    if (!editSector || !editCategory || !editType || !editSub || !editClass || !editPeso) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const { error } = await supabase
        .from('weighings')
        .update({
          data: editData,
          sector_id: editSector,
          category_id: editCategory,
          type_id: editType,
          subcategory_id: editSub,
          classification_id: editClass,
          peso_kg: Number(editPeso)
        })
        .eq('id', wid);

      if (error) throw error;

      setEditId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao atualizar pesagem: ' + err.message);
    }
  };

  const handleRemoveWeighing = async (wid: string) => {
    try {
      const { error } = await supabase
        .from('weighings')
        .delete()
        .eq('id', wid);

      if (error) throw error;
      setDeleteConfirmId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao remover pesagem: ' + err.message);
    }
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
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Análise Gravimétrica #{grav.numero}</h1>
            <p className="text-muted text-sm flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date(grav.started_at).toLocaleDateString('pt-BR')} — {grav.ended_at ? new Date(grav.ended_at).toLocaleDateString('pt-BR') : 'Em andamento'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => window.print()} className="btn btn-outline">
            <Printer size={16} />
            <span>Imprimir Relatório</span>
          </button>
          <button onClick={exportToXLSX} className="btn btn-outline">
            <FileSpreadsheet size={16} />
            <span>Excel (XLSX)</span>
          </button>
          <button onClick={exportToCSV} className="btn btn-outline">
            <Download size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginTop: '0.5rem' }}>
        
        {/* Total Weight */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Massa Amostrada</p>
            <p className="font-semibold mt-1" style={{ fontSize: '2rem', lineHeight: '1.15', fontFamily: 'var(--font-heading)' }}>
              {totalWeight.toFixed(2)} <span className="text-sm text-muted font-normal">kg</span>
            </p>
          </div>
          <p className="text-muted text-xs mt-2 flex items-center gap-1">
            <Scale size={14} />
            Soma de todas as pesagens
          </p>
        </div>

        {/* Landfill Diversion Rate */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Desvio de Aterro</p>
            <p 
              className="font-semibold mt-1" 
              style={{ 
                fontSize: '2rem', 
                lineHeight: '1.15', 
                fontFamily: 'var(--font-heading)',
                color: diversionRate >= 90 ? 'hsl(var(--primary))' : diversionRate >= 50 ? 'hsl(var(--foreground))' : 'hsl(var(--destructive))' 
              }}
            >
              {diversionRate.toFixed(1)}%
            </p>
          </div>
          <p className="text-muted text-xs mt-2">
            <strong>{((recyclableWeight + organicWeight)).toFixed(1)} kg</strong> reciclados/compostados
          </p>
        </div>

        {/* Sample Days */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wider">Dias Amostrados</p>
              <p className="font-semibold mt-1" style={{ fontSize: '2rem', lineHeight: '1.15', fontFamily: 'var(--font-heading)' }}>
                {days || '—'} <span className="text-sm text-muted font-normal">{days === 1 ? 'dia' : 'dias'}</span>
              </p>
            </div>
            {canEdit && (
              <button 
                onClick={() => { setEditDaysValue(days ? String(days) : ''); setEditDaysOpen(true); }}
                className="btn btn-ghost btn-icon no-print"
                style={{ padding: '0.35rem' }}
                title="Editar dias"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          <p className="text-muted text-xs mt-2">
            Média diária: <strong>{dailyAvg.toFixed(2)} kg/dia</strong>
          </p>
        </div>

        {/* Number of categories */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Massa por Categoria</p>
            <div className="flex gap-2 items-end mt-1" style={{ overflow: 'hidden' }}>
              {byCategory.map(c => (
                <div key={c.id} className="flex flex-col items-center flex-1" style={{ minWidth: '35px' }}>
                  <span className="text-xs font-semibold" style={{ fontSize: '0.65rem' }}>{((c.value / (totalWeight || 1)) * 100).toFixed(0)}%</span>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '24px', 
                      backgroundColor: c.color, 
                      borderRadius: 'var(--radius-sm)',
                      opacity: 0.85 
                    }} 
                  />
                  <span className="text-muted text-xs truncate" style={{ fontSize: '0.55rem', width: '100%', textAlign: 'center', marginTop: '0.125rem' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROJECTIONS CARDS CONTAINER */}
      {days > 0 ? (
        <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'rgba(34,197,94,0.02)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }} className="mb-2">Projeções de Geração (Média Diária Geral: {dailyAvg.toFixed(2)} kg/dia)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Previsão Mensal (30 dias)</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{monthlyProjection.toFixed(1)} kg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Previsão Anual (365 dias)</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{yearlyProjection.toFixed(1)} kg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Fórmula de Extrapolação</span>
              <span className="text-muted text-xs mt-1">Geração Total / Dias Amostrados &times; Período</span>
            </div>
          </div>

          {/* Detailed projections by category for storage and logistics planning */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px dashed hsl(var(--card-border))', paddingTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }} className="mb-1">Dimensionamento e Logística por Categoria</h4>
            <p className="text-muted text-xs mb-3">Estime a geração de massa para planejar a capacidade de caçambas, bombonas, frequência de coletas e dimensionamento do armazenamento temporário.</p>
            
            <div className="table-container" style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'transparent' }}>
              <table className="table" style={{ background: 'transparent' }}>
                <thead>
                  <tr style={{ background: 'transparent', borderBottom: '1px solid hsl(var(--card-border))' }}>
                    <th style={{ padding: '0.5rem 0' }}>Categoria</th>
                    <th className="text-right" style={{ padding: '0.5rem 0' }}>Média Diária</th>
                    <th className="text-right" style={{ padding: '0.5rem 0' }}>Est. Mensal (30d)</th>
                    <th className="text-right" style={{ padding: '0.5rem 0' }}>Est. Anual (365d)</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map(c => {
                    const cDailyAvg = c.value / days;
                    const cMonthly = cDailyAvg * 30;
                    const cYearly = cDailyAvg * 365;
                    return (
                      <tr key={c.id} style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
                        <td style={{ padding: '0.625rem 0', fontWeight: 500 }}>
                          <span className="flex items-center gap-2">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color || '#888' }} />
                            {c.name}
                          </span>
                        </td>
                        <td className="text-right font-medium text-sm" style={{ padding: '0.625rem 0' }}>{cDailyAvg.toFixed(2)} kg/dia</td>
                        <td className="text-right font-semibold text-sm" style={{ padding: '0.625rem 0', color: 'hsl(var(--primary))' }}>{cMonthly.toFixed(1)} kg</td>
                        <td className="text-right font-semibold text-sm" style={{ padding: '0.625rem 0', color: 'hsl(var(--primary))' }}>{cYearly.toFixed(1)} kg</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center" style={{ borderStyle: 'dashed', padding: '1.5rem' }}>
          <p className="text-muted text-sm">
            ⚠️ Para habilitar as previsões de geração mensal e anual, preencha o número de <strong>dias de coleta considerados</strong> (clique no lápis acima).
          </p>
        </div>
      )}

      {/* PAINEL FINANCEIRO DE VALORAÇÃO */}
      {totalWeight > 0 && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'rgba(59,130,246,0.02)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--primary))' }} className="mb-2 flex items-center gap-2">
            💰 Estudo de Valoração Financeira & Economia (Referência UF: {clientUf})
          </h3>
          <p className="text-muted text-xs mb-3">
            Estimativa calculada com base nos custos de destinação de RSU e preços médios de comercialização de sucata/compostos do estado de {clientUf} para 2026.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Economia em Desvio de Aterro</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                R$ {economiaAterro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-muted mt-1" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                Evitou pagar tarifa de destinação de rejeitos ({((recyclableWeight + organicWeight)).toFixed(1)} kg &times; R$ {custoRejeitoKg.toFixed(4)}/kg)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Valor Comercial Potencial</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                R$ {receitaMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-muted mt-1" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                Receita estimada com venda de recicláveis/compostos orgânicos no mercado regional
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <span className="text-muted text-xs">Impacto Econômico Total</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                R$ {impactoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-muted mt-1" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                Soma da economia com desvio de aterro e receita potencial de comercialização
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED ANALYSIS TABS AND CHARTS */}
      {totalWeight > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Chart: Category Breakdown (Pie) */}
          <div className="card" style={{ height: '340px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.05rem' }} className="mb-2">Geração por Categoria</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {byCategory.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} kg`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart: Sector Breakdown (Bar) */}
          <div className="card" style={{ height: '340px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.05rem' }} className="mb-2">Geração por Setor (kg)</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySector} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} kg`} />
                  <Bar dataKey="value" name="Massa (kg)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="value" position="top" formatter={(v: any) => `${Number(v).toFixed(1)}`} style={{ fontSize: '10px' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY PROGRESS SUMMARY */}
      {totalWeight > 0 && (
        <div className="card">
          <h3 className="card-title">Resumo Físico por Categoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
                  className="flex flex-col gap-2.5" 
                  style={{ 
                    border: '1px solid hsl(var(--card-border))', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'hsl(var(--background))',
                    padding: '1.25rem',
                    boxShadow: '0 2px 6px -2px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span 
                        className="flex items-center justify-center" 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: `${c.color}15`, 
                          color: c.color,
                          flexShrink: 0
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      {c.name}
                    </span>
                    <span className="text-xs text-muted font-semibold">{pct.toFixed(1)}%</span>
                  </div>
                  <p className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)', marginTop: '0.25rem' }}>
                    {c.value.toFixed(2)} <span className="text-xs text-muted font-normal">kg</span>
                  </p>
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'hsl(var(--muted))', borderRadius: '9999px', overflow: 'hidden', marginTop: '0.125rem' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c.color, borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXPANDABLE MATRIX REPORT BY SECTOR */}
      <div className="flex justify-center gap-2 no-print" style={{ margin: '1rem 0' }}>
        <button 
          onClick={() => { setShowDetailed(!showDetailed); setShowWeighings(false); }}
          className={`btn ${showDetailed ? 'btn-primary' : 'btn-outline'}`}
        >
          <Eye size={16} />
          <span>Matriz por Setor</span>
        </button>
        <button 
          onClick={() => { setShowWeighings(!showWeighings); setShowDetailed(false); }}
          className={`btn ${showWeighings ? 'btn-primary' : 'btn-outline'}`}
        >
          <Settings size={16} />
          <span>Gerenciar Lançamentos</span>
        </button>
      </div>

      {/* MATRIX TABLE DISPLAY */}
      {showDetailed && matrixRows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Matriz de Geração: Setor vs Categoria</h2>
            <p className="card-description">Clique em um setor para ver o detalhamento completo por tipo e subcategoria de resíduo</p>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Setor</th>
                  {sortedCategories.map(c => (
                    <th key={c.id} className="text-right" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color || '#888', display: 'inline-block' }} />
                        {c.name.toUpperCase()}
                      </span>
                    </th>
                  ))}
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
                          <td colSpan={sortedCategories.length + 2} style={{ backgroundColor: 'rgba(34, 197, 94, 0.01)', padding: '1.25rem' }}>
                            <div className="flex flex-col gap-3">
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Detalhamento: {row.sectorName}</h4>
                              
                              <div className="flex flex-col gap-4">
                                {sortedCategories
                                  .filter(c => row.byCat[c.id])
                                  .map(c => {
                                    const catData = row.byCat[c.id];
                                    const typesInCat = Object.entries(catData.types).sort((a, b) => b[1].total - a[1].total);
                                    
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
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color }} />
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

      {/* WEIGHINGS MANAGEMENT SECTION */}
      {showWeighings && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Gestão de Lançamentos de Resíduos</h2>
            <p className="card-description">Edite pesagens realizadas neste estudo ou exclua lançamentos incorretos</p>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Setor</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Subcategoria</th>
                  <th>Classificação</th>
                  <th className="text-right">Peso (kg)</th>
                  {canEdit && <th style={{ width: '80px' }} />}
                </tr>
              </thead>
              <tbody>
                {weighings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem 0' }}>
                      Nenhum lançamento neste estudo.
                    </td>
                  </tr>
                ) : (
                  weighings.map(w => {
                    const isEditingThisRow = editId === w.id;

                    const handleEditTypeChange = (tid: string) => {
                      setEditType(tid);
                      const selectedT = types.find(t => t.id === tid);
                      if (selectedT && selectedT.default_classification_id) {
                        setEditClass(selectedT.default_classification_id);
                      } else {
                        setEditClass('');
                      }
                      setEditSub('');
                    };

                    if (isEditingThisRow) {
                      return (
                        <tr key={w.id} style={{ backgroundColor: 'rgba(34, 197, 94, 0.04)' }}>
                          <td><input type="date" className="form-input" style={{ padding: '0.25rem 0.5rem', minWidth: '110px' }} value={editData} onChange={e => setEditData(e.target.value)} /></td>
                          <td>
                            <select className="form-select" style={{ padding: '0.25rem 0.5rem', minWidth: '100px' }} value={editSector} onChange={e => setEditSector(e.target.value)}>
                              <option value="">Selecione...</option>
                              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-select" style={{ padding: '0.25rem 0.5rem', minWidth: '100px' }} value={editCategory} onChange={e => { setEditCategory(e.target.value); handleEditTypeChange(''); }}>
                              <option value="">Selecione...</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-select" style={{ padding: '0.25rem 0.5rem', minWidth: '100px' }} value={editType} onChange={e => handleEditTypeChange(e.target.value)} disabled={!editCategory}>
                              <option value="">Selecione...</option>
                              {editFilteredTypes.map((t: Type) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-select" style={{ padding: '0.25rem 0.5rem', minWidth: '100px' }} value={editSub} onChange={e => setEditSub(e.target.value)} disabled={!editType}>
                              <option value="">Selecione...</option>
                              {editFilteredSubs.map((s: Subcategory) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <span className="text-sm font-medium">{classMap[editClass] || '—'}</span>
                          </td>
                          <td><input type="number" step="0.001" min="0.001" className="form-input text-right" style={{ padding: '0.25rem 0.5rem', width: '80px', display: 'inline-block' }} value={editPeso} onChange={e => setEditPeso(e.target.value)} /></td>
                          <td>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleSaveInlineEdit(w.id)} className="btn btn-ghost btn-icon" style={{ color: 'hsl(var(--primary))' }} title="Salvar"><Check size={16} /></button>
                              <button onClick={() => setEditId(null)} className="btn btn-ghost btn-icon" style={{ color: 'hsl(var(--destructive))' }} title="Cancelar"><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const catColor = categoryMap[w.category_id]?.color || '#888';
                    return (
                      <tr key={w.id}>
                        <td>{new Date(w.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td><span className="font-medium">{sectorMap[w.sector_id] || '—'}</span></td>
                        <td>
                          <span className="flex items-center font-medium" style={{ gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: catColor, display: 'inline-block' }} />
                            {categoryMap[w.category_id]?.name || '—'}
                          </span>
                        </td>
                        <td>{typeMap[w.type_id]?.name || '—'}</td>
                        <td>{subMap[w.subcategory_id] || '—'}</td>
                        <td><span className="text-muted text-xs font-semibold">{classMap[w.classification_id] || '—'}</span></td>
                        <td className="text-right font-semibold">{Number(w.peso_kg).toFixed(2)} kg</td>
                        {canEdit && (
                          <td>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleStartInlineEdit(w)} className="btn btn-ghost btn-icon" title="Editar"><Pencil size={15} /></button>
                              <button onClick={() => setDeleteConfirmId(w.id)} className="btn btn-ghost btn-icon" style={{ color: 'hsl(var(--destructive))' }} title="Remover"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
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

      {/* DIALOG: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <AlertTriangle size={20} />
                Excluir Lançamento
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Tem certeza que deseja excluir permanentemente esta pesagem? Esta ação não pode ser desfeita.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleRemoveWeighing(deleteConfirmId)} className="btn btn-danger">Excluir</button>
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
          background-color: rgba(34, 197, 94, 0.03) !important;
        }
      `}</style>

    </div>
  );
};

export default GravimetriaDetail;
