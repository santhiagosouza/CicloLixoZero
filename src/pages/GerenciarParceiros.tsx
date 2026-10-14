import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Truck, Plus, Save, Pencil, Trash2, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, ShieldAlert, Sparkles 
} from 'lucide-react';
import { seedFictionalData } from '../utils/seedTestData';

export interface PartnerVehicle {
  id: string;
  vehicle_type: string;
  fuel_type: string;
  plate?: string;
  distance_km?: number | null;
  description?: string;
}

export interface DestinationPartner {
  id: string;
  client_id?: string;
  created_at?: string;
  name: string;
  cnpj?: string | null;
  license_number?: string | null;
  company_type?: string | null;
  responsible_name?: string | null;

  address?: string | null;
  bairro?: string | null;
  city?: string | null;
  uf?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;

  transporter_name?: string | null;
  transporter_cpf?: string | null;
  transporter_cnh?: string | null;
  transporter_cnh_validity?: string | null;
  transporter_cnh_category?: string | null;

  // Lista de Veículos cadastrados deste Parceiro
  vehicles?: PartnerVehicle[];

  vehicle_type?: string | null;
  fuel_type?: string | null;
  distance_km?: number | null;
  plate?: string | null;

  collection_days?: string[];
  accepted_materials?: string[];
  active?: boolean;
}

const LOCAL_STORAGE_KEY_PREFIX = 'ciclo_destination_partners_';

export const getStoredPartners = (clientId?: string | null): DestinationPartner[] => {
  if (!clientId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${clientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading partners from localStorage:', e);
    return [];
  }
};

export const saveStoredPartners = (clientId: string, partners: DestinationPartner[]) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${clientId}`, JSON.stringify(partners));
  } catch (e) {
    console.error('Error saving partners to localStorage:', e);
  }
};

export const GerenciarParceiros: React.FC<{ isEmbeddedModal?: boolean; onCloseModal?: () => void }> = ({ isEmbeddedModal, onCloseModal }) => {
  const { clientId } = useAuth();

  const [partners, setPartners] = useState<DestinationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(isEmbeddedModal || false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields - Matching media_1791380705957_45054f77.png
  const [createdAtDate, setCreatedAtDate] = useState<string>(new Date().toLocaleDateString('pt-BR'));
  
  // Section 1: Identificação do Parceiro
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [responsibleName, setResponsibleName] = useState('');

  // Section 2: Endereço e Contato
  const [address, setAddress] = useState('');
  const [bairro, setBairro] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Section 3: Dados do Transportador
  const [transporterName, setTransporterName] = useState('');
  const [transporterCpf, setTransporterCpf] = useState('');
  const [transporterCnh, setTransporterCnh] = useState('');
  const [transporterCnhValidity, setTransporterCnhValidity] = useState('');
  const [transporterCnhCategory, setTransporterCnhCategory] = useState('C');

  // Section 4: Frota de Veículos do Parceiro
  const [partnerVehicles, setPartnerVehicles] = useState<PartnerVehicle[]>([]);
  const [vehicleType, setVehicleType] = useState('Caminhão Baú');
  const [fuelType, setFuelType] = useState('Diesel');
  const [distanceKm, setDistanceKm] = useState('');
  const [plate, setPlate] = useState('');

  // Formulário auxiliar para adicionar veículo à frota do parceiro
  const [vehTypeInput, setVehTypeInput] = useState('Caminhão Baú');
  const [vehFuelInput, setVehFuelInput] = useState('Diesel');
  const [vehPlateInput, setVehPlateInput] = useState('');
  const [vehDistanceInput, setVehDistanceInput] = useState('');
  const [vehDescInput, setVehDescInput] = useState('');

  // Section 5: Dia de Coleta & Tipo de Material Aceito
  const [collectionDays, setCollectionDays] = useState<string[]>(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
  const [acceptedMaterials, setAcceptedMaterials] = useState<string[]>(['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO', 'ORGÂNICO']);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    loadPartners();
  }, [clientId]);

  const loadPartners = async () => {
    if (!clientId) return;
    setLoading(true);
    setMsg(null);

    let fetchedPartners: DestinationPartner[] = [];
    try {
      const { data, error } = await supabase
        .from('destination_partners')
        .select('*')
        .eq('client_id', clientId)
        .order('name');

      if (!error && data) {
        fetchedPartners = data as DestinationPartner[];
      } else {
        // Fallback to localStorage
        fetchedPartners = getStoredPartners(clientId);
      }
    } catch (err) {
      fetchedPartners = getStoredPartners(clientId);
    }

    setPartners(fetchedPartners);
    setLoading(false);
  };

  const handleAddVehicle = () => {
    if (!vehTypeInput) return;
    const newVeh: PartnerVehicle = {
      id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      vehicle_type: vehTypeInput,
      fuel_type: vehFuelInput,
      plate: vehPlateInput.trim().toUpperCase() || undefined,
      distance_km: vehDistanceInput ? parseFloat(vehDistanceInput) : null,
      description: vehDescInput.trim() || undefined
    };

    setPartnerVehicles(prev => [...prev, newVeh]);
    setVehPlateInput('');
    setVehDescInput('');
  };

  const handleRemoveVehicle = (id: string) => {
    setPartnerVehicles(prev => prev.filter(v => v.id !== id));
  };

  const resetForm = () => {
    setEditingPartnerId(null);
    setCreatedAtDate(new Date().toLocaleDateString('pt-BR'));
    setName('');
    setCnpj('');
    setLicenseNumber('');
    setCompanyType('');
    setResponsibleName('');

    setAddress('');
    setBairro('');
    setCity('');
    setUf('SP');
    setZipCode('');
    setPhone('');
    setEmail('');

    setTransporterName('');
    setTransporterCpf('');
    setTransporterCnh('');
    setTransporterCnhValidity('');
    setTransporterCnhCategory('C');

    setPartnerVehicles([]);
    setVehicleType('Caminhão Baú');
    setFuelType('Diesel');
    setDistanceKm('');
    setPlate('');

    setVehTypeInput('Caminhão Baú');
    setVehFuelInput('Diesel');
    setVehPlateInput('');
    setVehDistanceInput('');
    setVehDescInput('');

    setCollectionDays(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
    setAcceptedMaterials(['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO', 'ORGÂNICO']);
  };

  const handleEdit = (p: DestinationPartner) => {
    setEditingPartnerId(p.id);
    setName(p.name || '');
    setCnpj(p.cnpj || '');
    setLicenseNumber(p.license_number || '');
    setCompanyType(p.company_type || '');
    setResponsibleName(p.responsible_name || '');

    setAddress(p.address || '');
    setBairro(p.bairro || '');
    setCity(p.city || '');
    setUf(p.uf || 'SP');
    setZipCode(p.zip_code || '');
    setPhone(p.phone || '');
    setEmail(p.email || '');

    setTransporterName(p.transporter_name || '');
    setTransporterCpf(p.transporter_cpf || '');
    setTransporterCnh(p.transporter_cnh || '');
    setTransporterCnhValidity(p.transporter_cnh_validity || '');
    setTransporterCnhCategory(p.transporter_cnh_category || 'C');

    // Carrega a frota de veículos ou converte legado
    let initialVehicles: PartnerVehicle[] = [];
    if (p.vehicles && Array.isArray(p.vehicles) && p.vehicles.length > 0) {
      initialVehicles = p.vehicles;
    } else if (p.vehicle_type) {
      initialVehicles = [{
        id: `veh_leg_${p.id}`,
        vehicle_type: p.vehicle_type,
        fuel_type: p.fuel_type || 'Diesel',
        plate: p.plate || undefined,
        distance_km: p.distance_km != null ? p.distance_km : null,
        description: 'Veículo Principal'
      }];
    }
    setPartnerVehicles(initialVehicles);

    setVehicleType(p.vehicle_type || 'Caminhão Baú');
    setFuelType(p.fuel_type || 'Diesel');
    setDistanceKm(p.distance_km ? String(p.distance_km) : '');
    setPlate(p.plate || '');

    setVehTypeInput('Caminhão Baú');
    setVehFuelInput('Diesel');
    setVehPlateInput('');
    setVehDistanceInput('');
    setVehDescInput('');

    setCollectionDays(p.collection_days && Array.isArray(p.collection_days) ? p.collection_days : ['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
    setAcceptedMaterials(p.accepted_materials && Array.isArray(p.accepted_materials) ? p.accepted_materials : ['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO', 'ORGÂNICO']);

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !name.trim()) return;

    setSubmitting(true);
    setMsg(null);

    const partnerId = editingPartnerId || `part_${Date.now()}`;
    const primaryVehicle = partnerVehicles[0];

    const payload: DestinationPartner = {
      id: partnerId,
      client_id: clientId,
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      license_number: licenseNumber.trim() || null,
      company_type: companyType || null,
      responsible_name: responsibleName.trim() || null,

      address: address.trim() || null,
      bairro: bairro.trim() || null,
      city: city.trim() || null,
      uf,
      zip_code: zipCode.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,

      transporter_name: transporterName.trim() || null,
      transporter_cpf: transporterCpf.trim() || null,
      transporter_cnh: transporterCnh.trim() || null,
      transporter_cnh_validity: transporterCnhValidity || null,
      transporter_cnh_category: transporterCnhCategory || null,

      // Lista de Veículos do Parceiro
      vehicles: partnerVehicles,

      // Compatibilidade legada
      vehicle_type: primaryVehicle ? primaryVehicle.vehicle_type : (vehicleType || 'Caminhão Baú'),
      fuel_type: primaryVehicle ? primaryVehicle.fuel_type : (fuelType || 'Diesel'),
      distance_km: primaryVehicle && primaryVehicle.distance_km != null ? primaryVehicle.distance_km : (distanceKm ? parseFloat(distanceKm) : null),
      plate: primaryVehicle ? (primaryVehicle.plate || null) : (plate.trim() || null),

      collection_days: collectionDays,
      accepted_materials: acceptedMaterials,
      active: true
    };

    try {
      // 1. Try Supabase upsert
      const { error } = await supabase.from('destination_partners').upsert(payload);

      if (error) {
        console.warn('Fallback para LocalStorage:', error.message);
      }

      // 2. LocalStorage persistence fallback
      const existing = getStoredPartners(clientId);
      const filtered = existing.filter(p => p.id !== partnerId);
      const updatedList = [payload, ...filtered];
      saveStoredPartners(clientId, updatedList);

      setMsg({ type: 'success', text: editingPartnerId ? 'Parceiro atualizado com sucesso!' : 'Parceiro cadastrado com sucesso!' });
      resetForm();
      if (!isEmbeddedModal) setShowForm(false);
      loadPartners();
      if (onCloseModal) onCloseModal();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao salvar parceiro: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!clientId) return;
    try {
      await supabase.from('destination_partners').delete().eq('id', id);
      const existing = getStoredPartners(clientId);
      const updated = existing.filter(p => p.id !== id);
      saveStoredPartners(clientId, updated);

      setDeleteConfirmId(null);
      setMsg({ type: 'success', text: 'Parceiro removido com sucesso!' });
      loadPartners();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao remover parceiro.' });
    }
  };

  const handleToggleActive = async (p: DestinationPartner) => {
    if (!clientId) return;
    const updatedStatus = !(p.active ?? true);
    const updatedPartner = { ...p, active: updatedStatus };

    try {
      await supabase.from('destination_partners').update({ active: updatedStatus }).eq('id', p.id);
      const existing = getStoredPartners(clientId);
      const updatedList = existing.map(item => item.id === p.id ? updatedPartner : item);
      saveStoredPartners(clientId, updatedList);

      loadPartners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedFictionalData = async () => {
    if (!clientId) return;
    if (!confirm('Deseja excluir os dados antigos e gerar novos dados fictícios completos (lançamentos e parceiros) para teste?')) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await seedFictionalData(clientId);
      setMsg({ type: 'success', text: 'Dados fictícios de parceiros e lançamentos gerados com sucesso!' });
      loadPartners();
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Erro ao gerar dados fictícios: ' + e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" style={{ paddingBottom: '3rem' }}>
      
      {/* Header Page */}
      {!isEmbeddedModal && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn btn-ghost btn-icon" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0f172a' }} className="flex items-center gap-2">
                <Truck size={26} style={{ color: '#157a43' }} />
                Parceiros de Destinação
              </h1>
              <p className="text-muted text-sm font-medium">Cadastre e gerencie as empresas, transportadores e veículos parceiros de destinação dos resíduos</p>
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
              onClick={() => {
                if (showForm) {
                  resetForm();
                  setShowForm(false);
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }} 
              className="btn btn-primary"
              style={{ backgroundColor: '#157a43', borderColor: '#157a43', color: '#fff', fontWeight: 700 }}
            >
              <Plus size={18} className="mr-1.5" />
              <span>{showForm ? 'Ver Lista de Parceiros' : 'Novo Parceiro'}</span>
            </button>
          </div>
        </div>
      )}

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

      {/* FORMULÁRIO DE CADASTRO DO PARCEIRO (Fidelidade ao Mockup media_1791380705957_45054f77.png) */}
      {(showForm || isEmbeddedModal) && (
        <form onSubmit={handleSubmit} className="card" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', padding: '1.75rem' }}>
          
          {/* SEÇÃO 1: IDENTIFICAÇÃO DO PARCEIRO */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Identificação do Parceiro
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Data Cadastro: {createdAtDate}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>NOME / RAZÃO SOCIAL *</label>
              <input type="text" className="form-input" placeholder="Razão social ou nome da cooperativa/aterro" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CNPJ</label>
              <input type="text" className="form-input" placeholder="00.000.000/0000-00" value={cnpj} onChange={e => setCnpj(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Nº DA LICENÇA</label>
              <input type="text" className="form-input" placeholder="Ex: LAO nº 987654" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>TIPO DE EMPRESA</label>
              <select className="form-select" value={companyType} onChange={e => setCompanyType(e.target.value)}>
                <option value="">Selecione o tipo...</option>
                <option value="Aterro Sanitário">Aterro Sanitário</option>
                <option value="Cooperativa de Reciclagem">Cooperativa de Reciclagem</option>
                <option value="Usina de Compostagem">Usina de Compostagem</option>
                <option value="Empresa de Transporte / Logística">Empresa de Transporte / Logística</option>
                <option value="Centro de Triagem">Centro de Triagem</option>
                <option value="Tratamento de Resíduos Perigosos">Tratamento de Resíduos Perigosos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>RESPONSÁVEL</label>
              <input type="text" className="form-input" placeholder="Nome do contato responsável" value={responsibleName} onChange={e => setResponsibleName(e.target.value)} />
            </div>

          </div>

          {/* SEÇÃO 2: ENDEREÇO E CONTATO */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Endereço e Contato
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>ENDEREÇO COMPLETO C/ Nº</label>
              <input type="text" className="form-input" placeholder="Rua, Número, Bairro, Galpão" value={address} onChange={e => setAddress(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>BAIRRO</label>
              <input type="text" className="form-input" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CIDADE</label>
              <input type="text" className="form-input" placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>UF</label>
              <select className="form-select" value={uf} onChange={e => setUf(e.target.value)}>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CEP</label>
              <input type="text" className="form-input" placeholder="00000-000" value={zipCode} onChange={e => setZipCode(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>TELEFONE CEL.</label>
              <input type="text" className="form-input" placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>E-MAIL</label>
              <input type="email" className="form-input" placeholder="contato@parceiro.com.br" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

          </div>

          {/* SEÇÃO 3: DADOS DO TRANSPORTADOR */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Dados do Transportador
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>NOME DO MOTORISTA / TRANSPORTADOR</label>
              <input type="text" className="form-input" placeholder="Nome completo do motorista" value={transporterName} onChange={e => setTransporterName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CPF</label>
              <input type="text" className="form-input" placeholder="000.000.000-00" value={transporterCpf} onChange={e => setTransporterCpf(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CNH</label>
              <input type="text" className="form-input" placeholder="Nº do registro CNH" value={transporterCnh} onChange={e => setTransporterCnh(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>VALIDADE CNH</label>
              <input type="date" className="form-input" value={transporterCnhValidity} onChange={e => setTransporterCnhValidity(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>HABILITAÇÃO (CATEGORIA)</label>
              <select className="form-select" value={transporterCnhCategory} onChange={e => setTransporterCnhCategory(e.target.value)}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="AB">AB</option>
                <option value="AC">AC</option>
                <option value="AD">AD</option>
                <option value="AE">AE</option>
              </select>
            </div>

          </div>

          {/* SEÇÃO 4: CADASTRO DE VEÍCULOS DO PARCEIRO */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Veículos do Parceiro (Frota de Destinação)
                </h3>
                <p className="text-muted text-xs mt-0.5">
                  Cadastre os veículos deste parceiro. No momento do lançamento de resíduos, apenas os veículos vinculados a ele serão exibidos.
                </p>
              </div>
              <span className="badge badge-success text-xs font-semibold">
                {partnerVehicles.length} {partnerVehicles.length === 1 ? 'veículo cadastrado' : 'veículos cadastrados'}
              </span>
            </div>
          </div>

          {/* Box para Adicionar Novo Veículo ao Parceiro */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 0.85rem 0', textTransform: 'uppercase' }} className="flex items-center gap-1.5">
              <Plus size={15} style={{ color: '#157a43' }} />
              Adicionar Veículo ao Parceiro
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="form-group">
                <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Tipo de Transporte *</label>
                <select className="form-select text-sm" value={vehTypeInput} onChange={e => setVehTypeInput(e.target.value)}>
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

              <div className="form-group">
                <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Combustível *</label>
                <select className="form-select text-sm" value={vehFuelInput} onChange={e => setVehFuelInput(e.target.value)}>
                  <option value="Diesel">Diesel</option>
                  <option value="Diesel S10">Diesel S10</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Flex">Flex</option>
                  <option value="Elétrico">Elétrico</option>
                  <option value="GNV">GNV</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Placa do Veículo</label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  placeholder="Ex: ABC-1234" 
                  value={vehPlateInput} 
                  onChange={e => setVehPlateInput(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Distância (km)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input text-sm" 
                  placeholder="Ex: 25.5" 
                  value={vehDistanceInput} 
                  onChange={e => setVehDistanceInput(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <button 
                  type="button" 
                  onClick={handleAddVehicle} 
                  className="btn btn-primary w-full flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#157a43', borderColor: '#157a43', height: '42px', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <Plus size={16} />
                  <span>Adicionar Veículo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabela dos Veículos Cadastrados no Parceiro */}
          <div style={{ marginBottom: '1.75rem' }}>
            {partnerVehicles.length === 0 ? (
              <div style={{ 
                border: '1px dashed #cbd5e1', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                textAlign: 'center', 
                backgroundColor: '#ffffff' 
              }}>
                <Truck size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600 m-0">Nenhum veículo adicionado a este parceiro ainda.</p>
                <p className="text-xs text-muted mt-1 mb-0">Utilize os campos acima para cadastrar pelo menos um veículo deste parceiro.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ fontSize: '0.75rem' }}>Tipo de Veículo</th>
                      <th style={{ fontSize: '0.75rem' }}>Placa</th>
                      <th style={{ fontSize: '0.75rem' }}>Combustível</th>
                      <th style={{ fontSize: '0.75rem' }}>Distância (km)</th>
                      <th style={{ fontSize: '0.75rem', width: '80px', textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerVehicles.map((v, idx) => (
                      <tr key={v.id}>
                        <td>
                          <span className="font-semibold text-slate-800">{v.vehicle_type}</span>
                          {idx === 0 && (
                            <span className="badge badge-info ml-2" style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>
                              Principal
                            </span>
                          )}
                        </td>
                        <td>
                          {v.plate ? (
                            <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {v.plate}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">Não informada</span>
                          )}
                        </td>
                        <td>
                          <span className="text-xs font-medium text-slate-700">{v.fuel_type}</span>
                        </td>
                        <td>
                          {v.distance_km != null ? (
                            <span className="text-xs font-semibold text-slate-700">{v.distance_km} km</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveVehicle(v.id)} 
                            className="btn btn-ghost btn-icon"
                            style={{ color: 'hsl(var(--destructive))' }}
                            title="Remover veículo deste parceiro"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEÇÃO 5: DIA DE COLETA & TIPO DE MATERIAL ACEITO (Pílulas Verde/Vermelho) */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Operação & Materiais Aceitos
            </h3>
          </div>

          {/* Legenda de Seleção */}
          <div className="flex items-center gap-4 text-xs font-semibold mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.85rem', color: '#475569' }}>
            <span className="font-bold text-slate-700">Legenda de Seleção:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#157a43', display: 'inline-block' }} />
              <strong style={{ color: '#157a43' }}>Verde:</strong> Ativo / Aceito
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
              <strong style={{ color: '#dc2626' }}>Vermelho:</strong> Inativo / Não Aceito
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* DIA DE COLETA */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase block mb-2" style={{ color: '#475569' }}>
                DIA DE COLETA
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(day => {
                  const isChecked = collectionDays.includes(day);
                  return (
                    <button 
                      key={day} 
                      type="button"
                      onClick={() => {
                        setCollectionDays(prev => isChecked ? prev.filter(d => d !== day) : [...prev, day]);
                      }} 
                      style={{ 
                        border: isChecked ? '1px solid #157a43' : '1px solid #dc2626', 
                        borderRadius: '6px', 
                        padding: '0.45rem 0.85rem', 
                        backgroundColor: isChecked ? '#157a43' : '#dc2626', 
                        color: '#ffffff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIPO DE MATERIAL ACEITO */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase block mb-2" style={{ color: '#475569' }}>
                TIPO DE MATERIAL ACEITO
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO', 'ORGÂNICO', 'PERIGOSO', 'REJEITO'].map(mat => {
                  const isChecked = acceptedMaterials.includes(mat);
                  return (
                    <button 
                      key={mat} 
                      type="button"
                      onClick={() => {
                        setAcceptedMaterials(prev => isChecked ? prev.filter(m => m !== mat) : [...prev, mat]);
                      }} 
                      style={{ 
                        border: isChecked ? '1px solid #157a43' : '1px solid #dc2626', 
                        borderRadius: '6px', 
                        padding: '0.45rem 0.85rem', 
                        backgroundColor: isChecked ? '#157a43' : '#dc2626', 
                        color: '#ffffff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {mat}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* BOTÃO CADASTRAR */}
          <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
            {isEmbeddedModal && onCloseModal && (
              <button 
                type="button" 
                onClick={onCloseModal} 
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
              style={{ backgroundColor: '#157a43', borderColor: '#157a43', color: '#ffffff', fontWeight: 800, padding: '0.75rem 2.5rem', textTransform: 'uppercase' }}
            >
              <Save size={18} className="mr-2" />
              {submitting ? 'Salvando...' : (editingPartnerId ? 'Salvar Alterações' : 'CADASTRAR PARCEIRO')}
            </button>
          </div>

        </form>
      )}

      {/* TABELA DE PARCEIROS CADASTRADOS */}
      {!isEmbeddedModal && !showForm && (
        <div className="card">
          <div className="card-header flex items-center justify-between flex-wrap gap-2">
            <h2 className="m-0 text-base font-bold text-slate-800">Parceiros Cadastrados ({partners.length})</h2>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Parceiro / Razão Social</th>
                  <th>Tipo</th>
                  <th>Transportador / Motorista</th>
                  <th>Veículo / Combustível</th>
                  <th>Placa / Distância</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem 0' }}>
                      Carregando parceiros...
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                      Nenhum parceiro de destinação cadastrado ainda. Clique em "Novo Parceiro" para começar.
                    </td>
                  </tr>
                ) : (
                  partners.map(p => {
                    const isActive = p.active ?? true;
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="font-semibold">{p.name}</span>
                          {p.cnpj && <div className="text-muted text-xs">{p.cnpj}</div>}
                        </td>
                        <td>{p.company_type || '—'}</td>
                        <td>
                          {p.transporter_name || '—'}
                          {p.transporter_cpf && <div className="text-muted text-xs">CPF: {p.transporter_cpf}</div>}
                        </td>
                        <td>
                          {p.vehicles && p.vehicles.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="badge badge-success text-xs font-semibold" style={{ width: 'fit-content' }}>
                                {p.vehicles.length} {p.vehicles.length === 1 ? 'veículo' : 'veículos'}
                              </span>
                              <span className="font-medium text-xs text-slate-800">
                                {p.vehicles.map(v => v.vehicle_type).slice(0, 2).join(', ')}
                                {p.vehicles.length > 2 ? ` (+${p.vehicles.length - 2})` : ''}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">{p.vehicle_type || '—'}</span>
                              {p.fuel_type && <div className="text-muted text-xs">{p.fuel_type}</div>}
                            </div>
                          )}
                        </td>
                        <td>
                          {p.vehicles && p.vehicles.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {p.vehicles.filter(v => v.plate).slice(0, 2).map((v, i) => (
                                <span key={i} className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                  {v.plate}
                                </span>
                              ))}
                              {p.vehicles.every(v => !v.plate) && <span className="text-muted text-xs">Sem placas</span>}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">{p.plate || '—'}</span>
                              {p.distance_km != null && <div className="text-muted text-xs">{p.distance_km} km</div>}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${isActive ? 'badge-success' : 'badge-default'}`}>
                            {isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => handleToggleActive(p)} 
                              className="btn btn-ghost btn-icon"
                              title={isActive ? 'Desativar Parceiro' : 'Ativar Parceiro'}
                            >
                              {isActive ? <ToggleRight size={20} style={{ color: '#157a43' }} /> : <ToggleLeft size={20} />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleEdit(p)} 
                              className="btn btn-ghost btn-icon"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDeleteConfirmId(p.id)} 
                              className="btn btn-ghost btn-icon"
                              style={{ color: 'hsl(var(--destructive))' }}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
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
      )}

      {/* CONFIRM MODAL: DELETE PARCEIRO */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Parceiro
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Tem certeza que deseja excluir este parceiro de destinação? Ele deixará de aparecer no formulário de Lançamento de Resíduos.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GerenciarParceiros;
