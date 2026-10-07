import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Scale, Pencil, Trash2, Truck, CheckCircle, AlertCircle, X, Sparkles
} from 'lucide-react';
import type { DestinationPartner } from './GerenciarParceiros';
import { getStoredPartners, GerenciarParceiros } from './GerenciarParceiros';
import { seedFictionalData, getStoredLaunches, saveStoredLaunches } from '../utils/seedTestData';

interface Sector { id: string; name: string; }
interface Category { id: string; name: string; color: string | null; }
interface Subcategory { id: string; category_id: string; name: string; }
interface Type { id: string; subcategory_id: string; name: string; color: string | null; }

interface WasteLaunch {
  id: string;
  data: string; // Data de Envio
  peso_kg: number;
  partner_id?: string;
  partner_name?: string;
  vehicle_type?: string;
  fuel_type?: string;
  distance_km?: number;
  sector_id?: string;
  category_id: string;
  subcategory_id?: string;
  type_id: string;
  destino?: string;
  created_at?: string;
}

export const GerenciarLancamentosReais: React.FC = () => {
  const { clientId, user } = useAuth();

  // Aux configurations
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [partners, setPartners] = useState<DestinationPartner[]>([]);
  const [launches, setLaunches] = useState<WasteLaunch[]>([]);

  // Maps
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [typeMap, setTypeMap] = useState<Record<string, Type>>({});

  // Form states - Matching media_1791380637546_13105d71.png
  const [dataEnvio, setDataEnvio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [partnerId, setPartnerId] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('Caminhão Baú');
  const [fuelType, setFuelType] = useState<string>('Diesel');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [peso, setPeso] = useState<string>('');

  // Quick partner modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editPartnerId, setEditPartnerId] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('');
  const [editFuelType, setEditFuelType] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editType, setEditType] = useState('');
  const [editPeso, setEditPeso] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!clientId) return;

    const loadAuxData = async () => {
      try {
        const [secRes, catRes, subRes, typeRes, partRes] = await Promise.all([
          supabase.from('sectors').select('id, name').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('categories').select('id, name, color').order('name'),
          supabase.from('subcategories').select('id, category_id, name').eq('active', true).order('name'),
          supabase.from('types').select('id, subcategory_id, name, color').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('destination_partners').select('*').eq('client_id', clientId).order('name')
        ]);

        const secs = (secRes.data || []) as Sector[];
        const cats = (catRes.data || []) as Category[];
        const subs = (subRes.data || []) as Subcategory[];
        const typs = (typeRes.data || []) as Type[];
        let parts = (partRes.data || []) as DestinationPartner[];

        if (parts.length === 0) {
          parts = getStoredPartners(clientId);
        }

        setSectors(secs);
        setCategories(cats);
        setSubcategories(subs);
        setTypes(typs);
        setPartners(parts);

        setCategoryMap(Object.fromEntries(cats.map(c => [c.id, c])));
        setSubMap(Object.fromEntries(subs.map(s => [s.id, s.name])));
        setTypeMap(Object.fromEntries(typs.map(t => [t.id, t])));

        fetchLaunches();
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };

    loadAuxData();
  }, [clientId, reloadKey]);

  const fetchLaunches = async () => {
    if (!clientId) return;
    try {
      const { data: lData, error } = await supabase
        .from('waste_launches')
        .select('*')
        .eq('client_id', clientId)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && lData && lData.length > 0) {
        setLaunches((lData as WasteLaunch[]) || []);
        saveStoredLaunches(clientId, lData as WasteLaunch[]);
      } else {
        const stored = getStoredLaunches(clientId);
        setLaunches(stored as WasteLaunch[]);
      }
    } catch (e) {
      console.error(e);
      const stored = getStoredLaunches(clientId);
      setLaunches(stored as WasteLaunch[]);
    }
  };

  const handleSeedFictionalData = async () => {
    if (!clientId) return;
    if (!confirm('Deseja excluir os dados de teste antigos e gerar novos dados fictícios completos (lançamentos e parceiros) para teste?')) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await seedFictionalData(clientId, user?.id);
      setMsg({ type: 'success', text: 'Dados fictícios de parceiros e lançamentos gerados com sucesso!' });
      setReloadKey(k => k + 1);
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Erro ao gerar dados fictícios: ' + e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAllLaunches = async () => {
    if (!clientId) return;
    if (!confirm('Deseja realmente EXCLUIR TODOS OS LANÇAMENTOS do sistema? Esta ação não pode ser desfeita.')) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await supabase.from('waste_launches').delete().eq('client_id', clientId);
      saveStoredLaunches(clientId, []);
      setLaunches([]);
      setMsg({ type: 'success', text: 'Todos os lançamentos de resíduos foram excluídos com sucesso!' });
      setReloadKey(k => k + 1);
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Erro ao excluir lançamentos: ' + e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Quando escolhe um parceiro, preenche automaticamente os padrões do veículo e combustível
  const handlePartnerChange = (pid: string) => {
    setPartnerId(pid);
    if (pid === '__NEW__') {
      setShowPartnerModal(true);
      setPartnerId('');
      return;
    }

    const selectedPart = partners.find(p => p.id === pid);
    if (selectedPart) {
      if (selectedPart.vehicle_type) setVehicleType(selectedPart.vehicle_type);
      if (selectedPart.fuel_type) setFuelType(selectedPart.fuel_type);
      if (selectedPart.distance_km != null) setDistanceKm(selectedPart.distance_km);
    }
  };

  // Cascaded filters: Categoria -> Subcategoria -> Tipo
  useEffect(() => {
    setSubcategoryId('');
    setTypeId('');
  }, [categoryId]);

  useEffect(() => {
    setTypeId('');
  }, [subcategoryId]);

  const filteredSubs = subcategories.filter(s => s.category_id === categoryId);
  const filteredTypes = types.filter(t => t.subcategory_id === subcategoryId);

  // Cascaded filters for inline editing
  const editFilteredSubs = subcategories.filter(s => s.category_id === editCategory);
  const editFilteredTypes = types.filter(t => t.subcategory_id === editSub);

  // Registrar Envio / Lançamento de Resíduos
  const handleRegisterWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    if (!partnerId || !categoryId || !subcategoryId || !typeId || !peso) {
      setMsg({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    const partnerObj = partners.find(p => p.id === partnerId);
    const partnerName = partnerObj?.name || 'Parceiro Destinação';
    const firstSectorId = sectors[0]?.id || null;

    const payload = {
      client_id: clientId,
      data: dataEnvio,
      partner_id: partnerId,
      partner_name: partnerName,
      vehicle_type: vehicleType,
      fuel_type: fuelType,
      distance_km: distanceKm,
      sector_id: firstSectorId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      type_id: typeId,
      destino: partnerName,
      peso_kg: parseFloat(peso),
      created_by: user?.id || null
    };

    try {
      let { error } = await supabase.from('waste_launches').insert(payload);

      // Fallback se colunas extras não existirem no Supabase schema
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const basicPayload = {
          client_id: clientId,
          data: dataEnvio,
          sector_id: firstSectorId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          type_id: typeId,
          destino: partnerName,
          peso_kg: parseFloat(peso),
          created_by: user?.id || null
        };
        const ret = await supabase.from('waste_launches').insert(basicPayload);
        error = ret.error;
      }

      if (error) throw error;

      setMsg({ type: 'success', text: 'Envio de resíduos registrado com sucesso!' });
      setPeso('');
      setReloadKey(k => k + 1);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao registrar envio: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLaunch = async (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento de resíduo?')) return;
    try {
      const { error } = await supabase.from('waste_launches').delete().eq('id', id);
      if (error) throw error;
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao excluir lançamento: ' + err.message);
    }
  };

  const handleStartInlineEdit = (w: WasteLaunch) => {
    setEditId(w.id);
    setEditData(w.data);
    setEditPartnerId(w.partner_id || '');
    setEditVehicleType(w.vehicle_type || 'Caminhão Baú');
    setEditFuelType(w.fuel_type || 'Diesel');
    setEditCategory(w.category_id);
    setEditSub(w.subcategory_id || '');
    setEditType(w.type_id);
    setEditPeso(String(w.peso_kg));
  };

  const handleSaveInlineEdit = async (wid: string) => {
    if (!editCategory || !editType || !editSub || !editPeso) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const partnerObj = partners.find(p => p.id === editPartnerId);
    const partnerName = partnerObj?.name || 'Parceiro Destinação';

    try {
      const { error } = await supabase
        .from('waste_launches')
        .update({
          data: editData,
          partner_id: editPartnerId || null,
          partner_name: partnerName,
          vehicle_type: editVehicleType,
          fuel_type: editFuelType,
          category_id: editCategory,
          subcategory_id: editSub,
          type_id: editType,
          destino: partnerName,
          peso_kg: parseFloat(editPeso)
        })
        .eq('id', wid);

      if (error) throw error;

      setEditId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao atualizar lançamento: ' + err.message);
    }
  };

  const totalKgAcumulados = launches.reduce((acc, w) => acc + Number(w.peso_kg), 0);

  return (
    <div className="flex flex-col gap-5" style={{ paddingBottom: '3rem' }}>
      
      {/* Header com Ações & Link para Gerenciar Parceiros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="btn btn-ghost btn-icon" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>
              Gestão de Lançamentos de Resíduos
            </h1>
            <p className="text-muted text-sm font-medium">
              Registre a pesagem e a destinação dos resíduos diretamente aos parceiros cadastrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            type="button" 
            onClick={handleSeedFictionalData}
            disabled={submitting}
            className="btn flex items-center gap-2"
            style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857', fontWeight: 700, fontSize: '0.85rem' }}
            title="Exclui dados antigos e gera parceiros e lançamentos fictícios para testes"
          >
            <Sparkles size={16} />
            <span>Gerar Dados Fictícios de Teste</span>
          </button>

          <button 
            type="button" 
            onClick={handleClearAllLaunches}
            disabled={submitting}
            className="btn flex items-center gap-2"
            style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}
            title="Exclui todos os lançamentos de resíduos"
          >
            <Trash2 size={16} />
            <span>Excluir Lançamentos</span>
          </button>

          <Link 
            to="/parceiros" 
            className="btn btn-outline flex items-center gap-2"
            style={{ backgroundColor: '#ffffff', borderColor: '#157a43', color: '#157a43', fontWeight: 700 }}
          >
            <Truck size={18} />
            <span>Gerenciar Parceiros</span>
          </Link>
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

      {/* CARD LANÇAR RESÍDUOS - Fidelidade Absoluta ao Mockup media_1791380637546_13105d71.png */}
      <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', backgroundColor: '#ffffff', padding: '2rem' }}>
        
        {/* Título & Data de Envio Superior */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0c4a24', fontStyle: 'italic', margin: 0, letterSpacing: '-0.02em' }}>
              Lançar Resíduos
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Programa de Gestão de Resíduos e Impactos</span>
          </div>

          <div style={{ minWidth: '200px' }}>
            <label className="form-label font-bold text-xs uppercase block mb-1" style={{ color: '#475569' }}>Data de Envio</label>
            <input 
              type="date" 
              className="form-input font-bold" 
              style={{ borderColor: '#157a43', color: '#0f172a' }}
              value={dataEnvio} 
              onChange={e => setDataEnvio(e.target.value)} 
              required 
            />
          </div>
        </div>

        {/* FORMULÁRIO 3 LINHAS - FIDELIDADE AO LAYOUT DO MOCKUP */}
        <form onSubmit={handleRegisterWaste} className="flex flex-col gap-5">
          
          {/* LINHA 1: Escolha o Parceiro | Tipo de Veículo | Combustível */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Escolha o Parceiro */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Escolha o Parceiro *</label>
              <select className="form-select" value={partnerId} onChange={e => handlePartnerChange(e.target.value)} required>
                <option value="">Selecione o parceiro...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.company_type ? `(${p.company_type})` : ''}
                  </option>
                ))}
                <option value="__NEW__" style={{ fontWeight: 'bold', color: '#157a43' }}>
                  + Cadastrar Novo Parceiro...
                </option>
              </select>
            </div>

            {/* Tipo de Veículo */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Tipo de Veículo</label>
              <select className="form-select" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                <option value="Caminhão Baú">Caminhão Baú</option>
                <option value="VUC (Veículo Urbano de Carga)">VUC (Veículo Urbano de Carga)</option>
                <option value="Caminhão Toco">Caminhão Toco</option>
                <option value="Caminhão Truck">Caminhão Truck</option>
                <option value="Carreta">Carreta</option>
                <option value="Caçamba">Caçamba</option>
                <option value="Furgão / Utilitário">Furgão / Utilitário</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Combustível */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Combustível</label>
              <select className="form-select" value={fuelType} onChange={e => setFuelType(e.target.value)}>
                <option value="Diesel">Diesel</option>
                <option value="Diesel S10">Diesel S10</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Flex">Flex</option>
                <option value="Elétrico">Elétrico</option>
                <option value="GNV">GNV</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

          </div>

          {/* LINHA 2: Categoria | Sub Categoria | Tipo de Resíduos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Categoria */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Categoria *</label>
              <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                <option value="">Selecione a categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Sub Categoria */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Sub Categoria *</label>
              <select className="form-select" value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} required disabled={!categoryId}>
                <option value="">Selecione a subcategoria...</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Tipo de Resíduos */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Tipo de Resíduos *</label>
              <select className="form-select" value={typeId} onChange={e => setTypeId(e.target.value)} required disabled={!subcategoryId}>
                <option value="">Selecione o tipo...</option>
                {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

          </div>

          {/* LINHA 3: Peso (kg) | Texto Instrução | Botão GERAR ENVIO */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
            
            {/* Peso (kg) */}
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Peso (kg) *</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input font-bold" 
                placeholder="Ex: 250.5" 
                value={peso} 
                onChange={e => setPeso(e.target.value)} 
                required 
              />
            </div>

            {/* Instrução & Botão GERAR ENVIO */}
            <div className="flex items-center gap-4 flex-wrap ml-auto">
              <span className="text-muted text-xs italic font-medium">
                Preencha todos os campos e clique em "ENVIAR"
              </span>
              <button 
                type="submit" 
                className="btn" 
                disabled={submitting}
                style={{ 
                  backgroundColor: '#0c4a24', 
                  color: '#ffffff', 
                  fontWeight: 900, 
                  fontSize: '0.95rem', 
                  letterSpacing: '0.05em', 
                  padding: '0.85rem 2.5rem', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(12, 74, 36, 0.2)'
                }}
              >
                {submitting ? 'GERANDO ENVIO...' : 'GERAR ENVIO'}
              </button>
            </div>

          </div>

        </form>
      </div>

      {/* TABELA DE ENVIOS DE RESÍDUOS CADASTRADOS */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <div className="card-header flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div>
            <h3 className="m-0 text-base font-bold text-slate-800 flex items-center gap-2">
              <Scale size={18} style={{ color: '#157a43' }} />
              Histórico de Envios de Resíduos ({launches.length})
            </h3>
            <p className="text-muted text-xs mt-1">Acompanhe os envios pesados e destinados aos parceiros de logística</p>
          </div>

          <div className="text-sm font-semibold" style={{ color: '#1e293b' }}>
            Total Acumulado: <span style={{ color: '#157a43', fontWeight: 800 }}>{totalKgAcumulados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</span>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data de Envio</th>
                <th>Parceiro de Destinação</th>
                <th>Veículo / Combustível</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Tipo de Resíduo</th>
                <th>Peso (kg)</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {launches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                    Nenhum envio de resíduo registrado. Preencha o formulário acima para gerar um novo envio.
                  </td>
                </tr>
              ) : (
                launches.map(w => {
                  const isEditing = editId === w.id;
                  if (isEditing) {
                    return (
                      <tr key={w.id} style={{ backgroundColor: '#f0fdf4' }}>
                        <td>
                          <input type="date" className="form-input py-1 text-xs" value={editData} onChange={e => setEditData(e.target.value)} />
                        </td>
                        <td>
                          <select className="form-select py-1 text-xs" value={editPartnerId} onChange={e => setEditPartnerId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-select py-1 text-xs" value={editVehicleType} onChange={e => setEditVehicleType(e.target.value)}>
                            <option value="Caminhão Baú">Caminhão Baú</option>
                            <option value="VUC">VUC</option>
                            <option value="Caminhão Toco">Caminhão Toco</option>
                            <option value="Caminhão Truck">Caminhão Truck</option>
                            <option value="Caçamba">Caçamba</option>
                          </select>
                        </td>
                        <td>
                          <select className="form-select py-1 text-xs" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-select py-1 text-xs" value={editSub} onChange={e => setEditSub(e.target.value)}>
                            <option value="">Selecione...</option>
                            {editFilteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-select py-1 text-xs" value={editType} onChange={e => setEditType(e.target.value)}>
                            <option value="">Selecione...</option>
                            {editFilteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <input type="number" step="0.01" className="form-input py-1 text-xs font-bold" value={editPeso} onChange={e => setEditPeso(e.target.value)} />
                        </td>
                        <td className="text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => handleSaveInlineEdit(w.id)} className="btn btn-sm btn-success" title="Salvar">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => setEditId(null)} className="btn btn-sm btn-secondary" title="Cancelar">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const catName = categoryMap[w.category_id]?.name || '—';
                  const subName = w.subcategory_id ? subMap[w.subcategory_id] || '—' : '—';
                  const typeName = typeMap[w.type_id]?.name || '—';
                  const partnerDisplay = w.partner_name || w.destino || '—';
                  const formattedDate = w.data ? new Date(w.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

                  return (
                    <tr key={w.id}>
                      <td className="font-semibold">{formattedDate}</td>
                      <td>
                        <span className="font-bold text-slate-800">{partnerDisplay}</span>
                      </td>
                      <td>
                        <span className="text-xs font-medium">{w.vehicle_type || '—'}</span>
                        {w.fuel_type && <div className="text-muted text-xs">{w.fuel_type}</div>}
                      </td>
                      <td>
                        <span className="badge badge-default">{catName}</span>
                      </td>
                      <td>{subName}</td>
                      <td className="font-medium">{typeName}</td>
                      <td className="font-bold text-slate-900">{Number(w.peso_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleStartInlineEdit(w)} className="btn btn-ghost btn-icon" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDeleteLaunch(w.id)} className="btn btn-ghost btn-icon text-red-600" title="Excluir">
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

      {/* QUICK PARTNER REGISTRATION MODAL */}
      {showPartnerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="modal-title font-bold text-lg text-slate-800 flex items-center gap-2 m-0">
                <Truck size={22} style={{ color: '#157a43' }} />
                Cadastrar Novo Parceiro de Destinação
              </h3>
              <button 
                onClick={() => setShowPartnerModal(false)} 
                className="btn btn-ghost btn-icon"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <GerenciarParceiros 
                isEmbeddedModal={true} 
                onCloseModal={() => {
                  setShowPartnerModal(false);
                  setReloadKey(k => k + 1);
                }} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GerenciarLancamentosReais;
