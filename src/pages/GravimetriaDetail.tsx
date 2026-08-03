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
  Calendar,
  Share2,
  ChevronDown,
  User,
  Activity,
  LayoutGrid,
  Truck
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
interface Type { id: string; name: string; color: string | null; subcategory_id?: string; default_classification_id?: string | null }
interface Subcategory { id: string; name: string; category_id?: string }

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

  // Edit Days dialog state
  const [editDaysOpen, setEditDaysOpen] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [editDaysValue, setEditDaysValue] = useState('');
  const [previsaoPeriodo, setPrevisaoPeriodo] = useState<'mes' | 'ano'>('ano');
  const [selectedSubcatCategoryFilter, setSelectedSubcatCategoryFilter] = useState<string>('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [selectedSectorCategoryFilter, setSelectedSectorCategoryFilter] = useState<string>('all');
  const [financeiroPeriodo, setFinanceiroPeriodo] = useState<'mes' | 'ano'>('ano');
  const [setorPeriodo, setSetorPeriodo] = useState<'mes' | 'ano'>('ano');
  const [tipoClassePeriodo, setTipoClassePeriodo] = useState<'mes' | 'ano'>('ano');

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        let gRes = await supabase
          .from('gravimetrias')
          .select('*, clients(name, uf, people_count, total_area_m2)')
          .eq('id', id)
          .maybeSingle();

        if (gRes.error && (gRes.error.message?.includes('uf') || gRes.error.code === '42703')) {
          console.warn('Coluna clients.uf não existe no banco de dados remoto. Buscando sem UF e usando fallback...');
          gRes = await supabase
            .from('gravimetrias')
            .select('*, clients(name, people_count, total_area_m2)')
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
            supabase.from('types').select('id, subcategory_id, name, color, default_classification_id').eq('client_id', g.client_id).eq('active', true).order('name'),
            supabase.from('subcategories').select('id, category_id, name').eq('active', true).order('name')
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

  useEffect(() => {
    const sectors = Object.values(
      weighings.reduce((acc: Record<string, { id: string; name: string; value: number }>, w) => {
        const key = w.sector_id || 'outros';
        const name = sectorMap[w.sector_id] || 'Outros';
        if (!acc[key]) {
          acc[key] = { id: w.sector_id || '', name, value: 0 };
        }
        acc[key].value += Number(w.peso_kg);
        return acc;
      }, {})
    ).sort((a, b) => b.value - a.value);

    if (sectors.length > 0 && !selectedSectorId) {
      setSelectedSectorId(sectors[0].id || 'outros');
    }
  }, [weighings, sectorMap, selectedSectorId]);

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

  // Mapeamento de cores oficiais conforme feedback visual
  const getCategoryColor = (name: string, defaultColor: string) => {
    const cleanName = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (cleanName.includes('organico')) return '#A88465';
    if (cleanName.includes('reciclavel')) return '#10B981';
    if (cleanName.includes('perigoso') || cleanName.includes('toxico')) return '#F08B27';
    if (cleanName.includes('rejeito')) return '#CCCCCC';
    return defaultColor || '#888888';
  };

  const getSubcategoryColor = (name: string, defaultColor: string) => {
    const cleanName = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (cleanName.includes('papel') || cleanName.includes('papelao') || cleanName.includes('cartao')) return '#1e40af'; // Azul escuro
    if (cleanName.includes('plast') || cleanName.includes('embalagem')) return '#ef4444'; // Vermelho
    if (cleanName.includes('vidro')) return '#10b981'; // Verde
    if (cleanName.includes('metal') || cleanName.includes('alumin') || cleanName.includes('ferro')) return '#f59e0b'; // Amarelo/Dourado
    if (cleanName.includes('organico') || cleanName.includes('aliment') || cleanName.includes('poda')) return '#A88465'; // Marrom
    if (cleanName.includes('perigoso') || cleanName.includes('toxico')) return '#f97316'; // Laranja
    if (cleanName.includes('rejeito') || cleanName.includes('sanit') || cleanName.includes('limpeza')) return '#888888'; // Cinza
    return defaultColor || '#9ca3af';
  };

  // Group weighings by Category
  const byCategory = Object.values(
    weighings.reduce((acc: Record<string, { id: string; name: string; value: number; color: string }>, w) => {
      const c = categoryMap[w.category_id];
      const key = w.category_id;
      if (!acc[key]) {
        const catName = c?.name || '—';
        acc[key] = { 
          id: key, 
          name: catName, 
          value: 0, 
          color: getCategoryColor(catName, c?.color || '') 
        };
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

  // Group weighings by Subcategory (salvando categoryId para filtros reativos)
  const bySubcategory = Object.values(
    weighings.reduce((acc: Record<string, { id: string; name: string; value: number; categoryId: string }>, w) => {
      const subName = subMap[w.subcategory_id] || 'Outros';
      const key = w.subcategory_id || 'outros';
      if (!acc[key]) {
        acc[key] = { id: key, name: subName, value: 0, categoryId: w.category_id };
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

  // Lista de itens do painel "Valor do Material"
  const financeiroItens = (() => {
    const precosUF = (residuosFinanceiro.precos as any)[clientUf] || {};
    let metalVal = 0;
    let plasticoVal = 0;
    let papelVal = 0;
    let vidroVal = 0;

    weighings.forEach(w => {
      const subName = subMap[w.subcategory_id] || '';
      const catName = categoryMap[w.category_id]?.name || '';
      
      if (catName.toLowerCase() === 'reciclável') {
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

        const nameLower = subName.toLowerCase();
        if (nameLower.includes('metal') || nameLower.includes('aluminio') || nameLower.includes('aço') || nameLower.includes('ferro')) {
          metalVal += itemVal;
        } else if (nameLower.includes('plást') || nameLower.includes('plast')) {
          plasticoVal += itemVal;
        } else if (nameLower.includes('papel') || nameLower.includes('papelão') || nameLower.includes('cartão')) {
          papelVal += itemVal;
        } else if (nameLower.includes('vidro')) {
          vidroVal += itemVal;
        } else {
          plasticoVal += itemVal;
        }
      }
    });

    const custoRejeitoKg = precosUF['Custo Destinação RSU'] ?? 0.15;
    const organicoVal = organicWeight * custoRejeitoKg;

    const totalVal = metalVal + plasticoVal + papelVal + vidroVal + organicoVal || 1;

    return [
      { name: 'Metal', value: metalVal, pct: (metalVal / totalVal) * 100, color: 'var(--color-metal)' },
      { name: 'Plástico', value: plasticoVal, pct: (plasticoVal / totalVal) * 100, color: 'var(--color-plastico)' },
      { name: 'Papel', value: papelVal, pct: (papelVal / totalVal) * 100, color: 'var(--color-papel)' },
      { name: 'Vidro', value: vidroVal, pct: (vidroVal / totalVal) * 100, color: 'var(--color-vidro)' },
      { name: 'Orgânico', value: organicoVal, pct: (organicoVal / totalVal) * 100, color: 'var(--color-organico)' }
    ];
  })();

  // Dados do setor selecionado
  const selectedSectorWeighings = weighings.filter(w => (w.sector_id || 'outros') === selectedSectorId);
  const sectorTotalWeight = selectedSectorWeighings.reduce((sum, w) => sum + Number(w.peso_kg), 0);



  const financeiroMultiplier = days > 0 ? (financeiroPeriodo === 'mes' ? 30 / days : 365 / days) : 1;
  const setorMultiplier = days > 0 ? (setorPeriodo === 'mes' ? 30 / days : 365 / days) : 1;
  const tipoClasseMultiplier = days > 0 ? (tipoClassePeriodo === 'mes' ? 30 / days : 365 / days) : 1;

  // Agrupamento dos Tipos por Grupo e classificação
  const tiposPorGrupo = (() => {
    const grupos: Record<string, { typeName: string; weight: number; className: string; color: string }[]> = {
      'Plástico': [],
      'Papel': [],
      'Vidro': [],
      'Metal': [],
      'Perigoso': [],
      'Rejeito': [],
      'Outros': []
    };

    weighings.forEach(w => {
      const typeObj = typeMap[w.type_id];
      const typeName = typeObj?.name || 'Outros';
      const catName = categoryMap[w.category_id]?.name || '';
      const subName = subMap[w.subcategory_id] || '';
      const classId = typeObj?.default_classification_id;
      const classText = classMap[classId || ''] || 'II A- Não Inerte';

      const grupo = (() => {
        const cName = catName.toLowerCase();
        const sName = subName.toLowerCase();
        const tName = typeName.toLowerCase();

        if (cName.includes('perigoso') || tName.includes('perigoso')) return 'Perigoso';
        if (cName.includes('rejeito') || tName.includes('rejeito')) return 'Rejeito';
        if (sName.includes('plást') || sName.includes('plast') || tName.includes('plast') || tName.includes('ps ') || tName.includes('pead') || tName.includes('pet ') || tName.includes('pvc')) return 'Plástico';
        if (sName.includes('papel') || sName.includes('jornal') || sName.includes('papelão') || sName.includes('cartão') || tName.includes('papel') || tName.includes('jornal')) return 'Papel';
        if (sName.includes('vidro') || tName.includes('vidro') || tName.includes('cacos')) return 'Vidro';
        if (sName.includes('metal') || sName.includes('ferro') || sName.includes('alumin') || sName.includes('cobre') || sName.includes('aço') || tName.includes('alumin') || tName.includes('cobre')) return 'Metal';
        return 'Outros';
      })();

      let targetList = grupos[grupo];
      if (!targetList) {
        grupos[grupo] = [];
        targetList = grupos[grupo];
      }

      let exist = targetList.find(i => i.typeName === typeName);
      if (!exist) {
        exist = {
          typeName,
          weight: 0,
          className: classText,
          color: typeObj?.color || categoryMap[w.category_id]?.color || '#888'
        };
        targetList.push(exist);
      }
      exist.weight += Number(w.peso_kg);
    });

    // Ordena cada lista por peso decrescente
    Object.keys(grupos).forEach(key => {
      grupos[key].sort((a, b) => b.weight - a.weight);
    });

    return grupos;
  })();



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

  const peopleCount = grav?.clients?.people_count || 0;
  const totalArea = grav?.clients?.total_area_m2 || 0;
  const mediaHab = peopleCount > 0 ? (totalWeight / peopleCount) : 0;

  const renderGrupoCard = (titulo: string, bgHeader: string, colorTextHeader: string, itens: { typeName: string; weight: number; className: string; color: string }[]) => {
    if (itens.length === 0) return null;
    return (
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '10px', 
        overflow: 'hidden', 
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Cabeçalho do Card Menor */}
        <div style={{ 
          backgroundColor: bgHeader, 
          padding: '8px 12px', 
          textAlign: 'center',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: 800, 
            color: colorTextHeader, 
            letterSpacing: '0.02em' 
          }}>{titulo}</span>
        </div>

        {/* Corpo do Card Menor */}
        <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Cabeçalho discreto de colunas */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '4px', paddingBottom: '2px', borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#9ca3af', width: '45px', textAlign: 'right' }}>Peso</span>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#9ca3af', width: '90px', textAlign: 'left' }}>Classe</span>
          </div>

          {/* Lista de itens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {itens.map((item, idx) => {
              const scaledWeight = item.weight * tipoClasseMultiplier;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
                  {/* Bolinha e Nome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', flex: 1 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                    <span 
                      style={{ 
                        fontSize: '0.725rem', 
                        color: '#4b5563', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={item.typeName}
                    >
                      {item.typeName}
                    </span>
                  </div>
                  {/* Peso */}
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#1f2937', width: '45px', textAlign: 'right', flexShrink: 0 }}>
                    {scaledWeight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  {/* Classe */}
                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      color: '#9ca3af', 
                      width: '90px', 
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexShrink: 0 
                    }}
                    title={item.className}
                  >
                    {item.className}
                  </span>
                </div>
              );
            })}
            {itens.length === 0 && (
              <span style={{ fontSize: '0.725rem', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', margin: '1rem 0' }}>Sem registros</span>
            )}
          </div>
        </div>
      </div>
    );
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
            <p className="text-muted text-sm flex items-center gap-2 mt-1.5 flex-wrap">
              Arquivo {String(grav.numero).padStart(2, '0')}
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

      {/* SEÇÃO B — PROJEÇÃO DE GERAÇÃO (5 cards premium) */}
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <h2 className="report-section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', margin: 0 }}>
              <Calendar size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
              <span>{new Date(grav.started_at).toLocaleDateString('pt-BR')} — {grav.ended_at ? new Date(grav.ended_at).toLocaleDateString('pt-BR') : 'Em andamento'}</span>
              <span className="text-muted" style={{ opacity: 0.35 }}>•</span>
              <span style={{ 
                backgroundColor: 'hsl(var(--accent))', 
                color: 'hsl(var(--accent-foreground))',
                padding: '0.2rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.8rem', 
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
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
                    <Pencil size={11} />
                  </button>
                )}
              </span>
            </h2>
            <InfoTooltip text="Painel de indicadores de volume de resíduos, desvio de aterro e emissões de carbono calculados a partir das pesagens registradas nesta gravimetria." />
          </div>

          {/* Dados de Operação do Local (Canto Direito) */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nº de Pessoas */}
            <div style={{ 
              border: '1px solid #e7ece7', 
              borderRadius: '8px', 
              backgroundColor: '#ffffff', 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
            }}>
              <User size={16} style={{ color: '#2f8f43', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.2 }}>Nº de Pessoas</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
                  {peopleCount > 0 ? peopleCount.toLocaleString('pt-BR') : '—'}
                </span>
              </div>
            </div>

            {/* Média Resíduos / Hab. */}
            <div style={{ 
              border: '1px solid #e7ece7', 
              borderRadius: '8px', 
              backgroundColor: '#ffffff', 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
            }}>
              <Activity size={16} style={{ color: '#2f8f43', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.2 }}>Média Resíduos / Hab.</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
                  {mediaHab > 0 ? `${mediaHab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/hab.` : '—'}
                </span>
              </div>
            </div>

            {/* Área Total */}
            <div style={{ 
              border: '1px solid #e7ece7', 
              borderRadius: '8px', 
              backgroundColor: '#ffffff', 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
            }}>
              <LayoutGrid size={16} style={{ color: '#2f8f43', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.2 }}>Área Total</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
                  {totalArea > 0 ? `${totalArea.toLocaleString('pt-BR')} m²` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* Card 1: Total Pesagem */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px', 
            backgroundColor: '#006633', 
            border: 'none',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 10px rgba(0, 102, 51, 0.15)',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#006633', 
                flexShrink: 0 
              }}>
                <Scale size={16} />
              </span>
              <span style={{ color: '#ffffff', fontSize: '0.825rem', fontWeight: 800 }}>Total Pesagem</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>kg</span>
              </p>
            </div>
          </div>

          {/* Card 2: Recicláveis */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Recycle size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Recicláveis</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {((recyclableWeight + organicWeight) / (totalWeight || 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>%</span>
              </p>
            </div>
          </div>

          {/* Card 3: Emissões CO2eq / Ano */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Leaf size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Emissões CO₂eq / Ano</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {((organicWeight * 1.2) + (recyclableWeight * 0.5)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>kg</span>
              </p>
            </div>
          </div>

          {/* Card 4: Desvio de Aterro (Ocupa 2 colunas e 2 linhas no desktop) */}
          <div className="card md:col-span-2 md:row-span-2" style={{ 
            padding: '1.5rem 1.15rem', 
            minHeight: '290px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Truck size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Desvio de Aterro</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flex: 1, marginTop: '1.25rem', marginBottom: '0.75rem' }}>
              {/* Gráfico Donut/Velocímetro */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', width: '220px' }}>
                <svg width="220" height="115" viewBox="0 0 100 55" style={{ display: 'block' }}>
                  {/* Arco Vermelho (0-30%) */}
                  <path d="M 10 50 A 40 40 0 0 1 34 26" fill="none" stroke="#ef4444" strokeWidth="13" strokeLinecap="round" />
                  {/* Arco Amarelo (30-70%) */}
                  <path d="M 34 26 A 40 40 0 0 1 66 26" fill="none" stroke="#eab308" strokeWidth="13" />
                  {/* Arco Verde (70-100%) */}
                  <path d="M 66 26 A 40 40 0 0 1 90 50" fill="none" stroke="#006633" strokeWidth="13" strokeLinecap="round" />
                  
                  {/* Agulha */}
                  <g transform={`translate(50, 50) rotate(${(diversionRate / 100) * 180 - 180})`}>
                    <line x1="0" y1="0" x2="36" y2="0" stroke="#1f2937" strokeWidth="4.5" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="5.5" fill="#1f2937" />
                  </g>
                </svg>
              </div>

              {/* Informações centralizadas à direita */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '3.2rem', fontWeight: 800, color: '#4b5563', lineHeight: 1.1 }}>
                  {diversionRate.toFixed(0)}%
                </span>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1f2937', marginTop: '6px', lineHeight: 1.1 }}>
                  {(recyclableWeight + organicWeight).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span style={{ fontSize: '1.25rem', color: '#4b5563', fontWeight: 700 }}>Kg</span>
                </span>
              </div>
            </div>
          </div>

          {/* LINHA 2 (MÉDIAS) */}
          {/* Card 5: Média / DIA */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Calendar size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Média / DIA</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {dailyAvg.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>kg</span>
              </p>
            </div>
          </div>

          {/* Card 6: Média / MÊS */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Calendar size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Média / MÊS</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {monthlyProjection.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>kg</span>
              </p>
            </div>
          </div>

          {/* Card 7: Média / ANO */}
          <div className="card" style={{ 
            padding: '1.25rem 1.15rem', 
            minHeight: '135px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '6px', 
                backgroundColor: '#006633', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                flexShrink: 0 
              }}>
                <Calendar size={16} />
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.825rem', fontWeight: 800, opacity: 0.85 }}>Média / ANO</span>
            </div>
            <div>
              <p className="font-semibold mt-3" style={{ fontSize: '1.75rem', lineHeight: '1.1', display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: 0 }}>
                {yearlyProjection.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>kg</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO C — GERAÇÃO POR CATEGORIA E SUBCATEGORIA COM FILTROS DE PREVISÃO */}
      {totalWeight > 0 && (() => {
        const scaleMultiplier = days > 0 ? (previsaoPeriodo === 'mes' ? 30 / days : 365 / days) : 1;

        // Gerar arcos do Donut unificado
        let accumulatedPct = 0;
        const donutArcs = byCategory.map(c => {
          const pct = totalWeight > 0 ? (c.value / totalWeight) * 100 : 0;
          const currentOffset = accumulatedPct;
          accumulatedPct += pct;
          return {
            ...c,
            pct,
            strokeDasharray: `${pct} ${100 - pct}`,
            offset: currentOffset
          };
        });

        // Filtrar subcategorias com base na seleção
        const filteredSubcategory = selectedSubcatCategoryFilter === 'all'
          ? bySubcategory
          : bySubcategory.filter(sub => sub.categoryId === selectedSubcatCategoryFilter);

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginTop: '1.25rem' }}>
            {/* Card Esquerdo: Por Categoria */}
            <div className="card" style={{ 
              padding: '1.5rem', 
              minHeight: '350px', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 800, opacity: 0.85 }}>Por Categoria</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Previsão:</span>
                  <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <button 
                      onClick={() => setPrevisaoPeriodo('mes')}
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previsaoPeriodo === 'mes' ? '#006633' : 'transparent',
                        color: previsaoPeriodo === 'mes' ? '#ffffff' : '#6b7280',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Mês
                    </button>
                    <button 
                      onClick={() => setPrevisaoPeriodo('ano')}
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previsaoPeriodo === 'ano' ? '#006633' : 'transparent',
                        color: previsaoPeriodo === 'ano' ? '#ffffff' : '#6b7280',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Ano
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5rem', flex: 1, flexWrap: 'wrap', width: '100%' }}>
                {/* Donut Chart */}
                <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                    {/* Círculo de fundo */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="4.0" />
                    {donutArcs.map(arc => (
                      <circle 
                        key={arc.id}
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke={arc.color} 
                        strokeWidth="4.5" 
                        strokeDasharray={arc.strokeDasharray} 
                        strokeDashoffset={-arc.offset}
                        strokeLinecap="butt"
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.1 }}>
                      {(totalWeight * scaleMultiplier).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 700, marginTop: '2px' }}>kg</span>
                  </div>
                </div>

                {/* Legendas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '180px' }}>
                  {byCategory.map(c => {
                    const pct = totalWeight > 0 ? (c.value / totalWeight) * 100 : 0;
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: '0.925rem', fontWeight: 800, color: '#1f2937', marginTop: '1px' }}>
                            {pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>({(c.value * scaleMultiplier).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kg)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card Direito: Por Sub Categoria */}
            <div className="card" style={{ 
              padding: '1.5rem', 
              minHeight: '350px', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 800, opacity: 0.85 }}>Por Sub Categoria</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Previsão:</span>
                  <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <button 
                      onClick={() => setPrevisaoPeriodo('mes')}
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previsaoPeriodo === 'mes' ? '#006633' : 'transparent',
                        color: previsaoPeriodo === 'mes' ? '#ffffff' : '#6b7280',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Mês
                    </button>
                    <button 
                      onClick={() => setPrevisaoPeriodo('ano')}
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previsaoPeriodo === 'ano' ? '#006633' : 'transparent',
                        color: previsaoPeriodo === 'ano' ? '#ffffff' : '#6b7280',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Ano
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro Dropdown de Categorias */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
                <select
                  value={selectedSubcatCategoryFilter}
                  onChange={(e) => setSelectedSubcatCategoryFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#374151',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all">Todas as Categorias</option>
                  {byCategory.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', justifyContent: 'center', flex: 1 }}>
                {filteredSubcategory.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '150px', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
                    Nenhuma subcategoria lançada para este filtro.
                  </div>
                ) : (
                  filteredSubcategory.slice(0, 5).map(sub => {
                    const maxSubValue = filteredSubcategory.length > 0 ? filteredSubcategory[0].value : 1;
                    const barPct = maxSubValue > 0 ? (sub.value / maxSubValue) * 100 : 0;
                    
                    const catObj = categoryMap[sub.categoryId];
                    const rawColor = catObj?.color || '';
                    const catName = catObj?.name || '';
                    // Obter a cor sólida correspondente à categoria pai
                    const barColor = getCategoryColor(catName, rawColor);

                    return (
                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ width: '110px', fontSize: '0.85rem', fontWeight: 800, color: '#4b5563', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.name}>
                          {sub.name}
                        </span>
                        <div style={{ flex: 1, height: '20px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: barColor, borderRadius: '6px', transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ width: '85px', fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', textAlign: 'left' }}>
                          {(sub.value * scaleMultiplier).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span style={{ fontSize: '0.725rem', color: '#6b7280', fontWeight: 500 }}>kg</span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SEÇÃO E — VALOR DO MATERIAL E RESÍDUOS POR SETOR (lado a lado) */}
      {totalWeight > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-10 gap-5" style={{ marginTop: '1.25rem' }}>
          {/* Valor do Material */}
          <div className="card md:col-span-3" style={{ 
            padding: '1.5rem', 
            minHeight: '380px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', display: 'inline-block' }}></span>
                <span style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 800, opacity: 0.85 }}>Valor do Material</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Previsão:</span>
                <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <button 
                    onClick={() => setFinanceiroPeriodo('mes')}
                    style={{
                      padding: '5px 15px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: financeiroPeriodo === 'mes' ? '#2f8f43' : 'transparent',
                      color: financeiroPeriodo === 'mes' ? '#ffffff' : '#6b7280',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Mês
                  </button>
                  <button 
                    onClick={() => setFinanceiroPeriodo('ano')}
                    style={{
                      padding: '5px 15px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: financeiroPeriodo === 'ano' ? '#2f8f43' : 'transparent',
                      color: financeiroPeriodo === 'ano' ? '#ffffff' : '#6b7280',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Ano
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', width: '65px', textAlign: 'right' }}>$</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', width: '45px', textAlign: 'right' }}>%</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem', justifyContent: 'center', flex: 1 }}>
              {financeiroItens.map(item => {
                const maxVal = Math.max(...financeiroItens.map(i => i.value)) || 1;
                const barPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                const scaledVal = item.value * financeiroMultiplier;
                return (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Legenda com bolinha colorida */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '85px', flexShrink: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#4b5563' }}>{item.name}</span>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ flex: 1, height: '11px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: item.color, borderRadius: '6px', transition: 'width 0.4s ease' }} />
                    </div>

                    {/* Valor e Porcentagem */}
                    <span style={{ width: '65px', fontSize: '0.825rem', fontWeight: 700, color: '#1f2937', textAlign: 'right' }}>
                      R$ {scaledVal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span style={{ width: '45px', fontSize: '0.825rem', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>
                      {item.pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total Financeiro */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937' }}>
                Total: R$ {financeiroItens.reduce((sum, item) => sum + (item.value * financeiroMultiplier), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Resíduos por Setor */}
          <div className="card md:col-span-7" style={{ 
            padding: '1.5rem', 
            minHeight: '380px', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', display: 'inline-block' }}></span>
                <span style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 800, opacity: 0.85 }}>Resíduos por Setor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Previsão:</span>
                <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <button 
                    onClick={() => setSetorPeriodo('mes')}
                    style={{
                      padding: '5px 15px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: setorPeriodo === 'mes' ? '#006633' : 'transparent',
                      color: setorPeriodo === 'mes' ? '#ffffff' : '#6b7280',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Mês
                  </button>
                  <button 
                    onClick={() => setSetorPeriodo('ano')}
                    style={{
                      padding: '5px 15px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: setorPeriodo === 'ano' ? '#006633' : 'transparent',
                      color: setorPeriodo === 'ano' ? '#ffffff' : '#6b7280',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Ano
                  </button>
                </div>
              </div>
            </div>

            {/* Filtros horizontais de Setor e Categoria */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginTop: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select 
                  value={selectedSectorId} 
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  style={{
                    padding: '6px 28px 6px 12px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    outline: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px 16px',
                    backgroundRepeat: 'no-repeat',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                >
                  {bySector.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Total: <strong style={{ fontWeight: 800 }}>{(sectorTotalWeight * setorMultiplier).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Categoria</span>
                <select 
                  value={selectedSectorCategoryFilter} 
                  onChange={(e) => setSelectedSectorCategoryFilter(e.target.value)}
                  style={{
                    padding: '6px 28px 6px 12px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    outline: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px 16px',
                    backgroundRepeat: 'no-repeat',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                >
                  <option value="all">Todas</option>
                  {byCategory.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listagem das subcategorias no setor e categoria selecionados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1.25rem', justifyContent: 'center', flex: 1 }}>
              {(() => {
                const sectorCategoryWeighings = selectedSectorCategoryFilter === 'all'
                  ? selectedSectorWeighings
                  : selectedSectorWeighings.filter(w => w.category_id === selectedSectorCategoryFilter);

                const subcategoriasSetor = Object.values(
                  sectorCategoryWeighings.reduce((acc: Record<string, { id: string; name: string; value: number; categoryId: string }>, w) => {
                    const subName = subMap[w.subcategory_id] || 'Outros';
                    const key = w.subcategory_id || 'outros';
                    if (!acc[key]) {
                      acc[key] = { id: key, name: subName, value: 0, categoryId: w.category_id };
                    }
                    acc[key].value += Number(w.peso_kg);
                    return acc;
                  }, {})
                ).sort((a, b) => b.value - a.value);

                if (subcategoriasSetor.length === 0) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '150px', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
                      Nenhum registro encontrado para este filtro.
                    </div>
                  );
                }

                return subcategoriasSetor.slice(0, 5).map(sub => {
                  const maxSubVal = subcategoriasSetor.length > 0 ? subcategoriasSetor[0].value : 1;
                  const barPct = maxSubVal > 0 ? (sub.value / maxSubVal) * 100 : 0;
                  
                  const catObj = categoryMap[sub.categoryId];
                  const rawColor = catObj?.color || '';
                  const barColor = getSubcategoryColor(sub.name, rawColor);

                  return (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '110px', flexShrink: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: barColor, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.name}>
                          {sub.name}
                        </span>
                      </div>
                      <div style={{ flex: 1, height: '18px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: barColor, borderRadius: '6px', transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ width: '90px', fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', textAlign: 'right' }}>
                        {(sub.value * setorMultiplier).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style={{ fontSize: '0.725rem', color: '#6b7280', fontWeight: 500 }}>kg</span>
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO F — RESÍDUOS POR TIPO / CLASSE (4 colunas) */}
      {totalWeight > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.25rem' }}>
          {/* Cabeçalho principal */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 800, opacity: 0.85 }}>Resíduos por Tipo / Classe</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.825rem', color: '#6b7280', fontWeight: 700 }}>Previsão:</span>
              <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <button 
                  onClick={() => setTipoClassePeriodo('mes')}
                  style={{
                    padding: '5px 15px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tipoClassePeriodo === 'mes' ? '#2f8f43' : 'transparent',
                    color: tipoClassePeriodo === 'mes' ? '#ffffff' : '#6b7280',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Mês
                </button>
                <button 
                  onClick={() => setTipoClassePeriodo('ano')}
                  style={{
                    padding: '5px 15px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tipoClassePeriodo === 'ano' ? '#2f8f43' : 'transparent',
                    color: tipoClassePeriodo === 'ano' ? '#ffffff' : '#6b7280',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Ano
                </button>
              </div>
            </div>
          </div>

          {/* Grid de 4 colunas */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.25rem',
            alignItems: 'start'
          }}>
            {/* Coluna 1: Plástico & Papel */}
            {((tiposPorGrupo['Plástico'] || []).length > 0 || (tiposPorGrupo['Papel'] || []).length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {renderGrupoCard('Plástico', '#fcf3e8', '#c05a10', tiposPorGrupo['Plástico'] || [])}
                {renderGrupoCard('Papel', '#eef7f2', '#2f8f43', tiposPorGrupo['Papel'] || [])}
              </div>
            )}

            {/* Coluna 2: Vidro & Metal */}
            {((tiposPorGrupo['Vidro'] || []).length > 0 || (tiposPorGrupo['Metal'] || []).length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {renderGrupoCard('Vidro', '#eef7f2', '#2f8f43', tiposPorGrupo['Vidro'] || [])}
                {renderGrupoCard('Metal', '#eef7f2', '#2f8f43', tiposPorGrupo['Metal'] || [])}
              </div>
            )}

            {/* Coluna 3: Perigoso (Ocupa a altura inteira) */}
            {(tiposPorGrupo['Perigoso'] || []).length > 0 && (
              <div>
                {renderGrupoCard('Perigoso', '#eff3fa', '#3b82c4', tiposPorGrupo['Perigoso'] || [])}
              </div>
            )}

            {/* Coluna 4: Rejeito & Outros */}
            {((tiposPorGrupo['Rejeito'] || []).length > 0 || (tiposPorGrupo['Outros'] || []).length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {renderGrupoCard('Rejeito', '#f9f5f0', '#6b7280', tiposPorGrupo['Rejeito'] || [])}
                {renderGrupoCard('Outros', '#eef7f2', '#2f8f43', tiposPorGrupo['Outros'] || [])}
              </div>
            )}
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
