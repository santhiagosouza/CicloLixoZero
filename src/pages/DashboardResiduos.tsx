import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  Users, 
  Maximize2, 
  Pencil, 
  Download, 
  TrendingUp
} from 'lucide-react';
import { calcularPegadaCarbono, type CarbonMetrics } from '../utils/carbonCalculations';
import { calcularMetricasFinanceiras, type FinancialMetrics } from '../utils/financialCalculations';

interface WasteLaunchRow {
  id: string;
  data: string;
  peso_kg: number;
  destino: string;
  sector_id: string;
  category_id: string;
  type_id: string;
  category_name?: string;
  type_name?: string;
  sector_name?: string;
}

export const DashboardResiduos: React.FC = () => {
  const { clientId } = useAuth();

  // Active Tab State: 1 = Resíduos, 2 = Econômico, 3 = Pegada Carbono
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(2);

  // Filters
  // Filters
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');

  // Client context metrics
  const [clientInfo, setClientInfo] = useState({
    nome: '',
    uf: 'SP',
    numPessoas: 600,
    areaTotalM2: 4000
  });

  const [utilityLog, setUtilityLog] = useState({
    energiaKwh: 4280,
    aguaM3: 230,
    kmAterro: 528.8,
    kmReciclagem: 164.1
  });

  // Computed totals & statistics
  const [pesosCategorias, setPesosCategorias] = useState({
    organicoKg: 1450.5,
    reciclavelKg: 915,
    especialKg: 15,
    aterroKg: 195,
    totalKg: 2575.5
  });

  const [destinosData, setDestinosData] = useState([
    { name: 'ATERRO', percent: 7.6, color: '#9ca3af' },
    { name: 'COMPOSTAGEM', percent: 56.3, color: '#157a43' },
    { name: 'COOPERATIVA', percent: 36.1, color: '#9bbb59' }
  ]);

  const [geracaoMensal, setGeracaoMensal] = useState([
    { mes: 'JAN', kg: 1548, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1548 },
    { mes: 'FEV', kg: 1678, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1678 },
    { mes: 'MAR', kg: 1752, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1752 },
    { mes: 'ABR', kg: 1695, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1695 },
    { mes: 'MAI', kg: 1736, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1736 },
    { mes: 'JUN', kg: 945, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 945 },
    { mes: 'JUL', kg: 933, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 933 },
    { mes: 'AGO', kg: 1845, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1845 },
    { mes: 'SET', kg: 1900, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1900 },
    { mes: 'OUT', kg: 1645, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1645 },
    { mes: 'NOV', kg: 1590, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 1590 },
    { mes: 'DEZ', kg: 968, valor: 2000, labelValor: 'R$ 2000', co2Evitado: 968 }
  ]);

  const [geracaoSetor, setGeracaoSetor] = useState([
    { item: 'Papel', kg: 14469, color: '#157a43' },
    { item: 'Plástico', kg: 2625, color: '#157a43' },
    { item: 'Vidro', kg: 2418, color: '#9ca3af' },
    { item: 'Metal', kg: 2294, color: '#157a43' }
  ]);

  // Derived metrics
  const [carbonMetrics, setCarbonMetrics] = useState<CarbonMetrics>({
    emissoesAterroKg: 3444.0,
    emissoesReciclagemKg: 1242.0,
    emissoesEvitadasKg: 2202.0,
    creditoCarbonoR$: 58.35,
    arvoresPoupadas: 242,
    emissaoEnergiaKg: 4109.0,
    emissaoAguaKg: 0.8,
    emissaoTransporteAterroKg: 3938.7,
    emissaoTransporteReciclagemKg: 248.0,
    detalhePorMaterial: {}
  });

  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    saldoEconomico: 4927,
    valorMaterialTotal: 3535,
    aterroEvitadoTotal: 1392,
    custoConsumoTotal: 3243,
    valorLiquido: 1684,
    valorPorMaterial: {
      'ORGÂNICO': 1450,
      'PLÁSTICO': 915,
      'PAPEL': 500,
      'METAL': 400,
      'VIDRO': 270
    }
  });

  // Fetch client information & launches from Supabase
  useEffect(() => {
    if (!clientId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Client profile/UF
        const { data: cData } = await supabase
          .from('clients')
          .select('name, uf')
          .eq('id', clientId)
          .maybeSingle();

        if (cData) {
          setClientInfo(prev => ({
            ...prev,
            nome: cData.name || '',
            uf: cData.uf || 'SP'
          }));
        }

        // 2. Fetch Utility logs
        const { data: uData } = await supabase
          .from('utility_logs')
          .select('energia_kwh, agua_m3, km_aterro, km_reciclagem')
          .eq('client_id', clientId)
          .order('periodo_mes', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (uData) {
          setUtilityLog({
            energiaKwh: Number(uData.energia_kwh || 4280),
            aguaM3: Number(uData.agua_m3 || 230),
            kmAterro: Number(uData.km_aterro || 528.8),
            kmReciclagem: Number(uData.km_reciclagem || 164.1)
          });
        }

        // 3. Fetch Waste Launches
        const { data: wLaunches } = await supabase
          .from('waste_launches')
          .select(`
            id, data, peso_kg, destino, sector_id, category_id, type_id,
            categories(name),
            types(name),
            sectors(name)
          `)
          .eq('client_id', clientId)
          .gte('data', dataInicio)
          .lte('data', dataFim);

        if (wLaunches && wLaunches.length > 0) {
          const parsed: WasteLaunchRow[] = wLaunches.map((item: any) => ({
            id: item.id,
            data: item.data,
            peso_kg: Number(item.peso_kg),
            destino: item.destino,
            sector_id: item.sector_id,
            category_id: item.category_id,
            type_id: item.type_id,
            category_name: item.categories?.name,
            type_name: item.types?.name,
            sector_name: item.sectors?.name
          }));
          recalcularPainel(parsed, cData?.uf || 'SP');
        } else {
          recalcularPainel([], cData?.uf || 'SP');
        }
      } catch (err) {
        console.error('Erro ao buscar lançamentos:', err);
      }
    };

    fetchData();
  }, [clientId, dataInicio, dataFim]);

  // Funções de recálculo com dados do banco ou fallback proporcional
  const recalcularPainel = (dados: WasteLaunchRow[], uf: string) => {
    if (dados.length === 0) {
      // Cálculo proporcional baseado no protótipo das imagens fornecidas
      const pCat = { organicoKg: 1450.5, reciclavelKg: 915, especialKg: 15, aterroKg: 195, totalKg: 2575.5 };
      const pMat = { 'ORGÂNICO': 1450.5, 'PLÁSTICO': 400, 'PAPEL': 315, 'VIDRO': 100, 'METAL': 100, 'REJEITO': 195, 'PERIGOSO': 15 };
      const pTipos = { 'Composto Orgânico': 1450.5, 'Reciclável Diverso': 915, 'Resíduo Especial': 15 };

      setPesosCategorias(pCat);

      const carbon = calcularPegadaCarbono(pCat, pMat, utilityLog);
      setCarbonMetrics(carbon);

      const fin = calcularMetricasFinanceiras(uf, pTipos, pCat);
      setFinancialMetrics(fin);
      return;
    }

    // Processamento real dos lançamentos do banco
    let totalKg = 0;
    let organicoKg = 0;
    let reciclavelKg = 0;
    let especialKg = 0;
    let aterroKg = 0;

    const matMap: Record<string, number> = {
      'ORGÂNICO': 0, 'PLÁSTICO': 0, 'PAPEL': 0, 'VIDRO': 0, 'METAL': 0, 'REJEITO': 0, 'PERIGOSO': 0
    };
    const tiposNomeMap: Record<string, number> = {};
    const mesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mensalMap: Record<number, { kg: number; valor: number; co2: number }> = {};
    const setorMap: Record<string, number> = {};
    const destinoMap: Record<string, number> = {};

    dados.forEach(row => {
      const kg = row.peso_kg;
      totalKg += kg;

      const catLower = (row.category_name || '').toLowerCase();
      if (catLower.includes('orgânic')) organicoKg += kg;
      else if (catLower.includes('reciclável')) reciclavelKg += kg;
      else if (catLower.includes('perigoso') || catLower.includes('especial')) especialKg += kg;
      else aterroKg += kg;

      const typeName = row.type_name || 'Diversos';
      tiposNomeMap[typeName] = (tiposNomeMap[typeName] || 0) + kg;

      const sector = row.sector_name || 'Geral';
      setorMap[sector] = (setorMap[sector] || 0) + kg;

      const dest = (row.destino || 'OUTROS').toUpperCase();
      destinoMap[dest] = (destinoMap[dest] || 0) + kg;

      if (row.data) {
        const d = new Date(row.data);
        const mIdx = d.getMonth();
        if (!isNaN(mIdx)) {
          if (!mensalMap[mIdx]) mensalMap[mIdx] = { kg: 0, valor: 0, co2: 0 };
          mensalMap[mIdx].kg += kg;
          mensalMap[mIdx].co2 += Math.round(kg * 0.85);
        }
      }

      const tLower = typeName.toLowerCase();
      if (tLower.includes('orgânic') || catLower.includes('orgânic')) matMap['ORGÂNICO'] += kg;
      else if (tLower.includes('plástic') || tLower.includes('pet')) matMap['PLÁSTICO'] += kg;
      else if (tLower.includes('papel') || tLower.includes('jornal')) matMap['PAPEL'] += kg;
      else if (tLower.includes('vidro')) matMap['VIDRO'] += kg;
      else if (tLower.includes('metal') || tLower.includes('ferro') || tLower.includes('alumínio')) matMap['METAL'] += kg;
      else if (tLower.includes('perigoso') || catLower.includes('perigoso')) matMap['PERIGOSO'] += kg;
      else matMap['REJEITO'] += kg;
    });

    const pCat = { organicoKg, reciclavelKg, especialKg, aterroKg, totalKg };
    setPesosCategorias(pCat);

    const carbon = calcularPegadaCarbono(pCat, matMap, utilityLog);
    setCarbonMetrics(carbon);

    const fin = calcularMetricasFinanceiras(uf, tiposNomeMap, pCat);
    setFinancialMetrics(fin);

    // Atualizar mensal dinâmico
    const novasMensal = mesNomes.map((mes, idx) => {
      const item = mensalMap[idx] || { kg: 0, valor: 0, co2: 0 };
      const val = Math.round(item.kg * 1.15);
      return {
        mes,
        kg: Math.round(item.kg),
        valor: val,
        labelValor: `R$ ${val}`,
        co2Evitado: item.co2
      };
    });
    setGeracaoMensal(novasMensal);

    // Atualizar setores dinâmicos
    const novasSetor = Object.keys(setorMap).map(s => ({
      item: s,
      kg: Math.round(setorMap[s]),
      color: '#157a43'
    }));
    if (novasSetor.length > 0) setGeracaoSetor(novasSetor);

    // Atualizar destinos dinâmicos
    if (totalKg > 0) {
      const novasDestino = Object.keys(destinoMap).map(d => ({
        name: d,
        percent: Number(((destinoMap[d] / totalKg) * 100).toFixed(1)),
        color: d.includes('ATERRO') ? '#9ca3af' : d.includes('COMPOST') ? '#157a43' : '#9bbb59'
      }));
      setDestinosData(novasDestino);
    }
  };

  const mediaPerCapita = clientInfo.numPessoas > 0 
    ? (pesosCategorias.totalKg / clientInfo.numPessoas).toFixed(1) 
    : '30,4';

  const taxaDesvioAterro = pesosCategorias.totalKg > 0 
    ? Math.round(((pesosCategorias.organicoKg + pesosCategorias.reciclavelKg) / pesosCategorias.totalKg) * 100) 
    : 85;

  const kgDesviadoAterro = (pesosCategorias.organicoKg + pesosCategorias.reciclavelKg).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  // Custom Dot para renderizar "R$ 2000" acima dos pontos no gráfico de linhas
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill="#157a43" stroke="#ffffff" strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#475569" fontSize={9} fontWeight={700}>
          {payload.labelValor || `R$ ${payload.valor}`}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* HEADER SUPERIOR COM AÇÕES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link 
            to="/lancamentos-reais" 
            className="btn btn-outline" 
            style={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#e2e8f0', 
              color: '#1e293b', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          >
            <Pencil size={15} style={{ color: '#157a43' }} />
            <span>Editar Lançamentos</span>
          </Link>
          <button 
            className="btn btn-outline" 
            style={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#e2e8f0', 
              color: '#1e293b', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          >
            <Download size={15} style={{ color: '#157a43' }} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS GLOBAIS E CONTEXTO DO CLIENTE */}
      <div 
        style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '1.25rem 1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        {/* Período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#157a43' }}>Selecione o período desejado:</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Início</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.375rem 0.75rem',
                fontSize: '0.85rem',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fim</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.375rem 0.75rem',
                fontSize: '0.85rem',
                color: '#1e293b'
              }}
            />
          </div>
        </div>

        {/* Badges de Contexto do Cliente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Nº Pessoas */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={18} style={{ color: '#157a43' }} />
            <div>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>Nº DE PESSOAS</p>
              <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{clientInfo.numPessoas}</p>
            </div>
          </div>

          {/* Média Per Capita */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TrendingUp size={18} style={{ color: '#157a43' }} />
            <div>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>Média Per Capita</p>
              <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{mediaPerCapita} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Kg/Pessoa.</span></p>
            </div>
          </div>

          {/* Área Total */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Maximize2 size={18} style={{ color: '#157a43' }} />
            <div>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>ÁREA TOTAL</p>
              <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{clientInfo.areaTotalM2.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>m²</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO ENTRE AS 3 ABAS DO DASHBOARD */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.25rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 1 ? '#0c4a24' : 'transparent',
            color: activeTab === 1 ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ 
            backgroundColor: activeTab === 1 ? '#ffffff' : '#e2e8f0', 
            color: activeTab === 1 ? '#0c4a24' : '#64748b',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 800
          }}>1</span>
          <span>RESÍDUOS</span>
        </button>

        <button
          onClick={() => setActiveTab(2)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 2 ? '#0c4a24' : 'transparent',
            color: activeTab === 2 ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ 
            backgroundColor: activeTab === 2 ? '#ffffff' : '#e2e8f0', 
            color: activeTab === 2 ? '#0c4a24' : '#64748b',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 800
          }}>2</span>
          <span>ECONÔMICO</span>
        </button>

        <button
          onClick={() => setActiveTab(3)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 3 ? '#0c4a24' : 'transparent',
            color: activeTab === 3 ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ 
            backgroundColor: activeTab === 3 ? '#ffffff' : '#e2e8f0', 
            color: activeTab === 3 ? '#0c4a24' : '#64748b',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 800
          }}>3</span>
          <span>PEGADA CARBONO</span>
        </button>
      </div>

      {/* =========================================================================
          ABA 1: RESÍDUOS (OPERACIONAL E FÍSICO)
          ========================================================================= */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0c4a24' }}>Resíduos</h2>

          {/* LINHA SUPERIOR DE KPIS DE PESO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Total Resíduos */}
            <div style={{ backgroundColor: '#0c4a24', color: '#ffffff', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a01.png" alt="Total Resíduos" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700 }}>Total Resíduos</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{pesosCategorias.totalKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>kg</span></p>
              </div>
            </div>

            {/* Orgânico */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a02.png" alt="Orgânico" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Orgânico</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{pesosCategorias.organicoKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>kg</span></p>
              </div>
            </div>

            {/* Reciclável */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a03.png" alt="Reciclável" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Reciclável</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{pesosCategorias.reciclavelKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>kg</span></p>
              </div>
            </div>

            {/* Especial */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a04.png" alt="Especial" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Especial</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{pesosCategorias.especialKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>kg</span></p>
              </div>
            </div>

            {/* Aterro */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a05.png" alt="Aterro" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Aterro</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{pesosCategorias.aterroKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>kg</span></p>
              </div>
            </div>

          </div>

          {/* LINHA INTERMEDIÁRIA: GRÁFICO DE EVOLUÇÃO, DESVIO DE ATERRO E ÁRVORES */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem' }}>
            
            {/* Gráfico de Linha: Geração de Resíduos kg/Ano */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24' }}>• Geração de Resíduos kg / Ano</h3>
              </div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={geracaoMensal}>
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                    <YAxis hide />
                    <Tooltip formatter={(val: any) => [`${val} kg`, 'Geração']} />
                    <Line type="monotone" dataKey="kg" stroke="#157a43" strokeWidth={3} dot={{ r: 4, fill: '#157a43' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gauge: Desvio de Aterro */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0c4a24', letterSpacing: '0.05em', marginBottom: '1rem' }}>DESVIO DE ATERRO</h3>
              
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart width={120} height={120}>
                  <Pie
                    data={[
                      { name: 'Desviado', value: taxaDesvioAterro, fill: '#10b981' },
                      { name: 'Aterro', value: 100 - taxaDesvioAterro, fill: '#e2e8f0' }
                    ]}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{taxaDesvioAterro}</span>
                </div>
              </div>

              <p style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{kgDesviadoAterro} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>kg</span></p>
            </div>

            {/* Árvores Poupada */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0c4a24', letterSpacing: '0.05em', marginBottom: '1rem' }}>ÁRVORES POUPADA</h3>
              
              <img src="/icones/a24.png" alt="Árvores Poupadas" style={{ width: '54px', height: '54px', objectFit: 'contain', marginBottom: '0.75rem' }} />

              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.arvoresPoupadas.toLocaleString('pt-BR')}</p>
            </div>

          </div>

          {/* LINHA INFERIOR: DESTINO, COMPOSIÇÃO E POR SETOR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            
            {/* Destino dos Resíduos */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24', marginBottom: '1.25rem' }}>Destino dos Resíduos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {destinosData.map(item => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem' }}>
                      <span>{item.name}</span>
                      <span>{item.percent}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, backgroundColor: item.color, height: '100%', borderRadius: '6px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Composição dos Resíduos (Rosca + Legenda) */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24', marginBottom: '1rem' }}>Composição dos Resíduos</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '110px', height: '110px' }}>
                  <PieChart width={110} height={110}>
                    <Pie
                      data={[
                        { name: 'ORGÂNICO', val: 54, fill: '#b45309' },
                        { name: 'PLÁSTICO', val: 13, fill: '#ef4444' },
                        { name: 'PAPEL', val: 10, fill: '#2563eb' },
                        { name: 'VIDRO', val: 2.5, fill: '#10b981' },
                        { name: 'METAL', val: 5, fill: '#eab308' },
                        { name: 'REJEITO', val: 15, fill: '#64748b' },
                        { name: 'PERIGOSO', val: 0.5, fill: '#0f172a' }
                      ]}
                      cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="val"
                    />
                  </PieChart>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#b45309' }}></span><span>ORGÂNICO: 54,0%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444' }}></span><span>PLÁSTICO: 13,0%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#2563eb' }}></span><span>PAPEL: 10,0%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981' }}></span><span>VIDRO: 2,5%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#eab308' }}></span><span>METAL: 5,0%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#64748b' }}></span><span>REJEITO: 15,0%</span></div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#0f172a' }}></span><span>PERIGOSO: 0,5%</span></div>
                </div>
              </div>
            </div>

            {/* Geração por Setor */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24' }}>• Geração por Setor</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Total: 14.469 kg</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {geracaoSetor.map(item => (
                  <div key={item.item}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      <span>{item.item}</span>
                      <span>{item.kg.toLocaleString('pt-BR')} kg</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (item.kg / 14469) * 100)}%`, backgroundColor: item.color, height: '100%', borderRadius: '5px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          ABA 2: ECONÔMICO & FINANCEIRO
          ========================================================================= */}
      {activeTab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0c4a24' }}>Econômico & Financeiro</h2>

          {/* KPIS FINANCEIROS SUPERIORES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Saldo Econômico (Verde Destacado) */}
            <div style={{ backgroundColor: '#0c4a24', color: '#ffffff', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a06.png" alt="Saldo Econômico" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700 }}>Saldo Econômico</p>
                <p style={{ fontSize: '1.65rem', fontWeight: 800 }}>R$ {financialMetrics.saldoEconomico.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Valor do Material */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a07.png" alt="Valor do Material" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Valor do Material</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>R$ {financialMetrics.valorMaterialTotal.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Aterro Evitado */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a08.png" alt="Aterro Evitado" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Aterro Evitado</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>R$ {financialMetrics.aterroEvitadoTotal.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Consumo */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a09.png" alt="Consumo" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Consumo</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626' }}>R$ {financialMetrics.custoConsumoTotal.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Valor Líquido */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a10.png" alt="Valor Líquido" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Valor Líquido</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb' }}>R$ {financialMetrics.valorLiquido.toLocaleString('pt-BR')}</p>
              </div>
            </div>

          </div>

          {/* LINHA INTERMEDIÁRIA: VALOR ESTIMADO ACUMULADO E CONSUMO OPERACIONAL */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            
            {/* Gráfico de Linha: Valor Estimado / R$ / mês */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#157a43' }}>• Valor Estimado / R$ / mês</h3>
              </div>

              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={geracaoMensal} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                    <YAxis hide />
                    <Tooltip formatter={(val: any) => [`R$ ${val}`, 'Valor']} />
                    <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} dot={renderCustomDot} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card de Consumo & Logística */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#157a43' }}>Consumo</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a11.png" alt="Energia" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ENERGIA</span>
                </div>
                <div style={{ flex: 1, borderBottom: '1px dashed #cbd5e1', margin: '0 0.75rem' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{utilityLog.energiaKwh.toLocaleString('pt-BR')} kWh</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a12.png" alt="Água" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ÁGUA</span>
                </div>
                <div style={{ flex: 1, borderBottom: '1px dashed #cbd5e1', margin: '0 0.75rem' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{utilityLog.aguaM3.toLocaleString('pt-BR')} m³</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a13.png" alt="Km Aterro" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>KM / ATERRO</span>
                </div>
                <div style={{ flex: 1, borderBottom: '1px dashed #cbd5e1', margin: '0 0.75rem' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{utilityLog.kmAterro.toLocaleString('pt-BR')} km</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a14.png" alt="Km Reciclagem" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>KM / RECICLAGEM</span>
                </div>
                <div style={{ flex: 1, borderBottom: '1px dashed #cbd5e1', margin: '0 0.75rem' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{utilityLog.kmReciclagem.toLocaleString('pt-BR')} km</span>
              </div>

            </div>

          </div>

          {/* LINHA INFERIOR: VALOR DO MATERIAL POR CATEGORIA */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#157a43' }}>Valor do Material</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
              
              {/* Orgânico */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/icones/a15.png" alt="Orgânico" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>ORGÂNICO</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>R$ {(financialMetrics.valorPorMaterial['ORGÂNICO'] || 10000).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Plástico */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/icones/a16.png" alt="Plástico" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>PLÁSTICO</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>R$ {(financialMetrics.valorPorMaterial['PLÁSTICO'] || 10000).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Papel */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/icones/a17.png" alt="Papel" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>PAPEL</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>R$ {(financialMetrics.valorPorMaterial['PAPEL'] || 10000).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Metal */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/icones/a18.png" alt="Metal" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>METAL</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>R$ {(financialMetrics.valorPorMaterial['METAL'] || 10000).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Vidro */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/icones/a19.png" alt="Vidro" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>VIDRO</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>R$ {(financialMetrics.valorPorMaterial['VIDRO'] || 10000).toLocaleString('pt-BR')}</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          ABA 3: PEGADA CARBONO (GHG PROTOCOL)
          ========================================================================= */}
      {activeTab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0c4a24' }}>Nossa Pegada Carbono</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.375rem 0.875rem', borderRadius: '9999px' }}>
              <img src="/icones/logo ghg protocol.png" alt="GHG Protocol" style={{ height: '24px', objectFit: 'contain' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Metodologia adotada: Programa Brasileiro GHG Protocol</span>
            </div>
          </div>

          {/* KPIS DE CARBONO SUPERIORES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Emissões Evitadas */}
            <div style={{ backgroundColor: '#0c4a24', color: '#ffffff', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a20.png" alt="Emissões Evitadas" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700 }}>Emissões Evitadas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{carbonMetrics.emissoesEvitadasKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kg</span></p>
              </div>
            </div>

            {/* Emissões Aterro */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a21.png" alt="Emissões Aterro" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Emissões Aterro</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissoesAterroKg.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Emissões Reciclagem */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a22.png" alt="Emissões Reciclagem" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Emissões Reciclagem</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissoesReciclagemKg.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Estima Crédito Carbono */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/icones/a23.png" alt="Estima Crédito Carbono" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Estima Crédito Carbono</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0c4a24' }}>R$ {carbonMetrics.creditoCarbonoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

          </div>

          {/* LINHA INTERMEDIÁRIA: EVOLUÇÃO E COMPARATIVO DE CENÁRIOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1.5rem' }}>
            
            {/* Gráfico de Linha: Evolução das emissões evitadas */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0c4a24', marginBottom: '1rem' }}>Evolução mensal das emissões evitadas (kg CO²eq)</h3>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={geracaoMensal}>
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                    <YAxis hide />
                    <Tooltip formatter={(val: any) => [`${val} kg CO2eq`, 'Evitado']} />
                    <Line type="monotone" dataKey="co2Evitado" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cenário 01 Aterro */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c4a24', marginBottom: '1rem' }}>Cenário 01 Aterro</h3>
              <div style={{ marginBottom: '0.75rem' }}>
                <img src="/icones/a21.png" alt="Cenário Aterro" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissoesAterroKg.toLocaleString('pt-BR')}</p>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CO²eq/kg</span>
            </div>

            {/* Cenário 02 Reciclagem */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c4a24', marginBottom: '1rem' }}>Cenário 02 Reciclagem</h3>
              <div style={{ marginBottom: '0.75rem' }}>
                <img src="/icones/a22.png" alt="Cenário Reciclagem" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissoesReciclagemKg.toLocaleString('pt-BR')}</p>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CO²eq/kg</span>
            </div>

            {/* Árvores Poupada */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c4a24', marginBottom: '1rem' }}>Resultado Comparativo</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <img src="/icones/a24.png" alt="Árvores Poupadas" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#157a43' }}>ÁRVORES POUPADA</span>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{carbonMetrics.arvoresPoupadas.toLocaleString('pt-BR')}</p>
            </div>

          </div>

          {/* LINHA INFERIOR: EMISSÕES POR MATERIAL E DE CONSUMO/TRANSPORTE */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            
            {/* Emissões Co²eq / Resíduos por Material */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24', marginBottom: '1rem' }}>Emissões Co²eq / Resíduos</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a15.png" alt="Orgânico" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Orgânico</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '75%', backgroundColor: '#b45309', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>6.498,96 kg</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a16.png" alt="Plástico" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Plástico</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '45%', backgroundColor: '#ef4444', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>2.844,7 kg</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a17.png" alt="Papel" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Papel</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '35%', backgroundColor: '#2563eb', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>1.732,3 kg</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a19.png" alt="Vidro" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Vidro</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '15%', backgroundColor: '#10b981', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>159,6 kg</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a18.png" alt="Metal" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Metal</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '85%', backgroundColor: '#eab308', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>8.324,7 kg</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '140px' }}>
                    <img src="/icones/a04.png" alt="Perigoso" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Perigoso</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '10px', borderRadius: '5px', margin: '0 1rem', overflow: 'hidden' }}>
                    <div style={{ width: '12%', backgroundColor: '#0f172a', height: '100%', borderRadius: '5px' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>163,8 kg</span>
                </div>

              </div>
            </div>

            {/* Emissões Co²eq / Consumo | Transporte */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a24' }}>Emissões Co²eq / Consumo | Transporte</h3>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a11.png" alt="Energia" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>ENERGIA</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissaoEnergiaKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Co²eq / kWh</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a12.png" alt="Água" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>ÁGUA</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissaoAguaKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Co²eq / m³</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a13.png" alt="Aterro" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>ATERRO</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissaoTransporteAterroKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Co²eq / Km</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/icones/a14.png" alt="Reciclagem" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>RECICLAGEM</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{carbonMetrics.emissaoTransporteReciclagemKg.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Co²eq / Km</span></span>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default DashboardResiduos;
