import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { 
  Building2, 
  Save, 
  Zap, 
  Droplet, 
  Truck, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Pencil,
  Trash2,
  Users,
  FileText
} from 'lucide-react';

interface CompanyType {
  id: string;
  name: string;
}

interface UtilityLog {
  id: string;
  client_id: string;
  periodo_mes: string;
  energia_kwh: number;
  agua_m3: number;
  km_aterro: number;
  km_reciclagem: number;
  updated_at?: string;
}

export const CadastroEmpresa: React.FC = () => {
  const { clientId, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'cadastrais' | 'utilidades'>('cadastrais');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // -------------------------------------------------------------------------
  // ESTADOS DOS DADOS CADASTRAIS
  // -------------------------------------------------------------------------
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [uf, setUf] = useState('SP');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [companyTypeId, setCompanyTypeId] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [peopleCount, setPeopleCount] = useState('');
  const [teamCount, setTeamCount] = useState('');
  const [totalAreaM2, setTotalAreaM2] = useState('');

  // -------------------------------------------------------------------------
  // ESTADOS DE CONSUMO & LOGÍSTICA
  // -------------------------------------------------------------------------
  const [utilityLogs, setUtilityLogs] = useState<UtilityLog[]>([]);
  const [utilityForm, setUtilityForm] = useState({
    id: '',
    periodo_mes: new Date().toISOString().substring(0, 7) + '-01',
    energia_kwh: '',
    agua_m3: '',
    km_aterro: '',
    km_reciclagem: ''
  });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    loadAllData();
  }, [clientId]);

  const loadAllData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      // 1. Tipos de Empresa
      const { data: typesData } = await supabase.from('company_types').select('*').order('name');
      setCompanyTypes((typesData || []) as CompanyType[]);

      // 2. Dados do Cliente
      let { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (clientErr) {
        console.warn('Fallback basico para cliente...', clientErr);
        const fb = await supabase.from('clients').select('id, name, cnpj, uf').eq('id', clientId).single();
        client = fb.data;
      }

      if (client) {
        setName(client.name || '');
        setCnpj(client.cnpj || '');
        setUf(client.uf || 'SP');
        setCity(client.city || '');
        setAddress(client.address || '');
        setZipCode(client.zip_code || '');
        setLicenseNumber(client.license_number || '');
        setCompanyTypeId(client.company_type_id || '');
        setResponsibleName(client.responsible_name || '');
        setPhone(client.phone || '');
        setEmail(client.email || '');
        setPeopleCount(client.people_count ? String(client.people_count) : '');
        setTeamCount(client.team_count ? String(client.team_count) : '');
        setTotalAreaM2(client.total_area_m2 ? String(client.total_area_m2) : '');
      }

      // 3. Registros de Consumo & Logística
      const { data: logsData } = await supabase
        .from('utility_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('periodo_mes', { ascending: false });

      setUtilityLogs((logsData || []) as UtilityLog[]);

    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao carregar dados da empresa: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // SALVAR DADOS CADASTRAIS
  // -------------------------------------------------------------------------
  const handleSaveCadastrais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !name.trim()) return;

    setSubmitting(true);
    setMsg(null);

    const payload = {
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      uf,
      city: city.trim() || null,
      address: address.trim() || null,
      zip_code: zipCode.trim() || null,
      license_number: licenseNumber.trim() || null,
      company_type_id: companyTypeId || null,
      responsible_name: responsibleName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      people_count: peopleCount ? Number(peopleCount) : null,
      team_count: teamCount ? Number(teamCount) : null,
      total_area_m2: totalAreaM2 ? Number(totalAreaM2) : null,
    };

    try {
      let { error } = await supabase.from('clients').update(payload).eq('id', clientId);

      if (error && (error.message?.includes('column') || error.code === '42703')) {
        // Fallback para colunas básicas
        const basic = { name: payload.name, cnpj: payload.cnpj, uf: payload.uf, company_type_id: payload.company_type_id };
        const ret = await supabase.from('clients').update(basic).eq('id', clientId);
        error = ret.error;
      }

      if (error) throw error;

      setMsg({ type: 'success', text: 'Dados cadastrais da empresa atualizados com sucesso!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao atualizar dados: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // SALVAR CONSUMO & LOGÍSTICA MENSAL
  // -------------------------------------------------------------------------
  const handleSaveUtilityLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !utilityForm.periodo_mes) return;

    setSubmitting(true);
    setMsg(null);

    try {
      const payload = {
        client_id: clientId,
        periodo_mes: utilityForm.periodo_mes,
        energia_kwh: parseFloat(utilityForm.energia_kwh || '0'),
        agua_m3: parseFloat(utilityForm.agua_m3 || '0'),
        km_aterro: parseFloat(utilityForm.km_aterro || '0'),
        km_reciclagem: parseFloat(utilityForm.km_reciclagem || '0'),
        created_by: user?.id || null
      };

      const { error } = await supabase.from('utility_logs').upsert(payload, { onConflict: 'client_id,periodo_mes' });

      if (error) throw error;

      setMsg({ type: 'success', text: 'Registro de Consumo & Logística salvo com sucesso!' });
      
      // Limpar formulário e recarregar histórico
      setEditingLogId(null);
      setUtilityForm({
        id: '',
        periodo_mes: new Date().toISOString().substring(0, 7) + '-01',
        energia_kwh: '',
        agua_m3: '',
        km_aterro: '',
        km_reciclagem: ''
      });
      loadAllData();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao salvar consumo & logística: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUtilityLog = (log: UtilityLog) => {
    setEditingLogId(log.id);
    setUtilityForm({
      id: log.id,
      periodo_mes: log.periodo_mes,
      energia_kwh: String(log.energia_kwh || ''),
      agua_m3: String(log.agua_m3 || ''),
      km_aterro: String(log.km_aterro || ''),
      km_reciclagem: String(log.km_reciclagem || '')
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteUtilityLog = async (id: string) => {
    if (!confirm('Deseja remover este registro de consumo do histórico?')) return;
    try {
      const { error } = await supabase.from('utility_logs').delete().eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Registro removido com sucesso!' });
      loadAllData();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao excluir registro: ' + err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando dados da empresa...</p>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="card text-center" style={{ margin: '3rem auto', maxWidth: '500px' }}>
        <h2 style={{ color: 'hsl(var(--destructive))' }}>Empresa não identificada</h2>
        <p className="text-muted mt-2">Nenhum cliente ativo selecionado na sessão.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" style={{ paddingBottom: '3rem' }}>
      
      {/* HEADER PAGE */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: '#157a43', color: '#ffffff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(21, 122, 67, 0.25)' }}>
            <Building2 size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>Cadastro da Empresa</h1>
            <p className="text-muted text-sm">Gerencie os dados cadastrais, estrutura operacional e os índices mensais de Consumo & Logística</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('cadastrais')}
            className={`btn ${activeTab === 'cadastrais' ? 'btn-primary' : 'btn-outline'}`}
            style={activeTab === 'cadastrais' ? { backgroundColor: '#157a43', borderColor: '#157a43', color: '#fff', fontWeight: 700 } : {}}
          >
            <FileText size={16} className="mr-1.5" />
            Dados Cadastrais & Estrutura
          </button>
          <button
            onClick={() => setActiveTab('utilidades')}
            className={`btn ${activeTab === 'utilidades' ? 'btn-primary' : 'btn-outline'}`}
            style={activeTab === 'utilidades' ? { backgroundColor: '#157a43', borderColor: '#157a43', color: '#fff', fontWeight: 700 } : {}}
          >
            <Zap size={16} className="mr-1.5" />
            Consumo & Logística (Mensal)
          </button>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2" style={{
          padding: '0.85rem 1.15rem',
          borderRadius: '8px',
          backgroundColor: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: DADOS CADASTRAIS DA EMPRESA */}
      {/* ========================================================================= */}
      {activeTab === 'cadastrais' && (
        <form onSubmit={handleSaveCadastrais} className="card" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 className="m-0 text-lg font-bold" style={{ color: '#0c4a24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#157a43' }} />
              Informações Gerais da Empresa
            </h2>
            <p className="text-muted text-xs mt-1">Preencha os dados institucionais, de contato e capacidade operacional da empresa</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nome da Empresa / Razão Social */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Razão Social / Nome Fantasia *</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>

            {/* CNPJ */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>CNPJ</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="00.000.000/0000-00" 
                value={cnpj} 
                onChange={e => setCnpj(e.target.value)} 
              />
            </div>

            {/* Licença Ambiental */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Inscrição / Licença Ambiental</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: LAO nº 123456" 
                value={licenseNumber} 
                onChange={e => setLicenseNumber(e.target.value)} 
              />
            </div>

            {/* Tipo de Empresa */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Tipo de Empresa / Ramo</label>
              <select 
                className="form-select" 
                value={companyTypeId} 
                onChange={e => setCompanyTypeId(e.target.value)}
              >
                <option value="">Selecione o tipo de empresa...</option>
                {companyTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Responsável Operacional */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Responsável Técnico / Operacional</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nome do gestor ambiental ou operacional" 
                value={responsibleName} 
                onChange={e => setResponsibleName(e.target.value)} 
              />
            </div>

            {/* E-mail */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>E-mail de Contato</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="contato@empresa.com.br" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            {/* Telefone */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Telefone / WhatsApp</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="(00) 00000-0000" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>

            {/* UF */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Estado (UF)</label>
              <select className="form-select" value={uf} onChange={e => setUf(e.target.value)}>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Cidade */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Cidade</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Cidade" 
                value={city} 
                onChange={e => setCity(e.target.value)} 
              />
            </div>

            {/* CEP */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>CEP</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="00000-000" 
                value={zipCode} 
                onChange={e => setZipCode(e.target.value)} 
              />
            </div>

            {/* Endereço Completo */}
            <div className="form-group md:col-span-2">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Endereço Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Rua, Número, Bairro, Complemento" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
              />
            </div>
          </div>

          {/* ESTRUTURA OPERACIONAL E CAPACIDADE */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <h3 className="text-md font-bold mb-3" style={{ color: '#0c4a24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: '#157a43' }} />
              Estrutura Operacional & Capacidade
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Nº de Alunos / Pessoas Atendidas</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ex: 1200" 
                  value={peopleCount} 
                  onChange={e => setPeopleCount(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Equipe Operacional (Colaboradores)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ex: 45" 
                  value={teamCount} 
                  onChange={e => setTeamCount(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Área Total Construída (m²)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  placeholder="Ex: 2500" 
                  value={totalAreaM2} 
                  onChange={e => setTotalAreaM2(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* BOTÃO SUBMIT */}
          <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
              style={{ backgroundColor: '#157a43', borderColor: '#157a43', color: '#ffffff', fontWeight: 700, padding: '0.75rem 2rem' }}
            >
              <Save size={18} className="mr-2" />
              {submitting ? 'Salvando...' : 'Salvar Dados Cadastrais'}
            </button>
          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONSUMO & LOGÍSTICA MENSAL */}
      {/* ========================================================================= */}
      {activeTab === 'utilidades' && (
        <div className="flex flex-col gap-6">
          
          {/* FORMULÁRIO DE REGISTRO MENSAL */}
          <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}>
            <div className="card-header flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="m-0 text-lg font-bold" style={{ color: '#0c4a24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} style={{ color: '#157a43' }} />
                  {editingLogId ? 'Editar Registro de Consumo & Logística' : 'Lançamento Mensal de Consumo & Logística (ESG)'}
                </h2>
                <p className="text-muted text-xs mt-1">Informe os dados mensais de utilidades (energia, água) e rotas de transporte para o cálculo da Pegada de Carbono</p>
              </div>
              {editingLogId && (
                <button 
                  onClick={() => {
                    setEditingLogId(null);
                    setUtilityForm({
                      id: '',
                      periodo_mes: new Date().toISOString().substring(0, 7) + '-01',
                      energia_kwh: '',
                      agua_m3: '',
                      km_aterro: '',
                      km_reciclagem: ''
                    });
                  }}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveUtilityLog} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              
              {/* Mês de Referência */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                  <Calendar size={14} style={{ color: '#157a43' }} />
                  Mês / Período *
                </label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={utilityForm.periodo_mes} 
                  onChange={e => setUtilityForm({ ...utilityForm, periodo_mes: e.target.value })} 
                  required 
                />
              </div>

              {/* Energia (kWh) */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                  <Zap size={14} style={{ color: '#eab308' }} />
                  Energia (kWh)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  placeholder="0.00" 
                  value={utilityForm.energia_kwh} 
                  onChange={e => setUtilityForm({ ...utilityForm, energia_kwh: e.target.value })} 
                />
              </div>

              {/* Água (m³) */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                  <Droplet size={14} style={{ color: '#0284c7' }} />
                  Água (m³)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  placeholder="0.00" 
                  value={utilityForm.agua_m3} 
                  onChange={e => setUtilityForm({ ...utilityForm, agua_m3: e.target.value })} 
                />
              </div>

              {/* Km Aterro */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                  <Truck size={14} style={{ color: '#dc2626' }} />
                  Rota Aterro (km)
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  placeholder="0.0" 
                  value={utilityForm.km_aterro} 
                  onChange={e => setUtilityForm({ ...utilityForm, km_aterro: e.target.value })} 
                />
              </div>

              {/* Km Reciclagem */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                  <Truck size={14} style={{ color: '#16a34a' }} />
                  Rota Reciclagem (km)
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  placeholder="0.0" 
                  value={utilityForm.km_reciclagem} 
                  onChange={e => setUtilityForm({ ...utilityForm, km_reciclagem: e.target.value })} 
                />
              </div>

              {/* BOTÃO DE SALVAR REGISTRO MENSAL */}
              <div className="md:col-span-5 flex justify-end mt-2 pt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting}
                  style={{ backgroundColor: '#157a43', borderColor: '#157a43', color: '#ffffff', fontWeight: 700, padding: '0.6rem 1.5rem' }}
                >
                  <Save size={16} className="mr-2" />
                  {submitting ? 'Salvando...' : editingLogId ? 'Atualizar Mês' : 'Salvar Consumo & Logística'}
                </button>
              </div>

            </form>
          </div>

          {/* HISTÓRICO DE CONSUMO & LOGÍSTICA */}
          <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}>
            <div className="card-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 className="m-0 text-base font-bold" style={{ color: '#0f172a' }}>
                Histórico Mensal de Consumo & Logística
              </h3>
              <p className="text-muted text-xs mt-1">Lista de todos os lançamentos mensais de utilidades cadastrados para esta empresa</p>
            </div>

            <div className="table-container" style={{ marginTop: '1rem' }}>
              <table className="table">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>MÊS / ANO</th>
                    <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>ENERGIA (KWH)</th>
                    <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>ÁGUA (M³)</th>
                    <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>ROTA ATERRO (KM)</th>
                    <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>ROTA RECICLAGEM (KM)</th>
                    <th style={{ width: '80px' }} />
                  </tr>
                </thead>
                <tbody>
                  {utilityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding: '2.5rem 0' }}>
                        Nenhum registro de consumo ou logística cadastrado ainda.
                      </td>
                    </tr>
                  ) : (
                    utilityLogs.map(log => {
                      const dateObj = new Date(log.periodo_mes + 'T00:00:00');
                      const formattedMonth = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                      return (
                        <tr key={log.id}>
                          <td className="font-bold" style={{ color: '#0f172a', textTransform: 'capitalize' }}>
                            {formattedMonth}
                          </td>
                          <td style={{ fontWeight: 600, color: '#334155' }}>
                            {Number(log.energia_kwh || 0).toLocaleString('pt-BR')} kWh
                          </td>
                          <td style={{ fontWeight: 600, color: '#334155' }}>
                            {Number(log.agua_m3 || 0).toLocaleString('pt-BR')} m³
                          </td>
                          <td style={{ fontWeight: 600, color: '#dc2626' }}>
                            {Number(log.km_aterro || 0).toLocaleString('pt-BR')} km
                          </td>
                          <td style={{ fontWeight: 600, color: '#16a34a' }}>
                            {Number(log.km_reciclagem || 0).toLocaleString('pt-BR')} km
                          </td>
                          <td>
                            <div className="flex gap-1 justify-end">
                              <button 
                                onClick={() => handleEditUtilityLog(log)} 
                                className="btn btn-ghost btn-icon text-muted"
                                title="Editar Mês"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUtilityLog(log.id)} 
                                className="btn btn-ghost btn-icon text-danger"
                                title="Remover"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CadastroEmpresa;
