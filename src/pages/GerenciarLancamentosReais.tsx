import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Scale, Pencil, Trash2, Truck, CheckCircle, AlertCircle, X, FileText 
} from 'lucide-react';
import type { DestinationPartner, PartnerVehicle } from './GerenciarParceiros';
import { getStoredPartners, GerenciarParceiros } from './GerenciarParceiros';
import { getStoredLaunches, saveStoredLaunches } from '../utils/seedTestData';
import { 
  getPartnerAcceptedCategories, 
  getPartnerAcceptedSubcategories 
} from '../utils/partnerMaterials';
import { ReciboEnvioModal } from '../components/ReciboEnvioModal';

interface Sector { id: string; name: string; }
interface Category { id: string; name: string; color: string | null; }
interface Subcategory { id: string; category_id: string; name: string; }
interface Type { id: string; subcategory_id: string; name: string; color: string | null; }

export interface WasteLaunch {
  id: string;
  client_id?: string;
  data: string; // Data de Envio
  peso_kg: number;
  partner_id?: string | null;
  partner_name?: string | null;
  vehicle_id?: string | null;
  vehicle_plate?: string | null;
  vehicle_type?: string | null;
  fuel_type?: string | null;
  distance_km?: number | null;
  sector_id?: string | null;
  category_id: string;
  subcategory_id?: string | null;
  type_id: string;
  destino?: string | null;
  observacao?: string | null;
  created_at?: string | null;
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
  const [availableVehicles, setAvailableVehicles] = useState<PartnerVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('Caminhão Baú');
  const [fuelType, setFuelType] = useState<string>('Diesel');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [peso, setPeso] = useState<string>('');

  // Quick partner modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // Recibo modal state
  const [showReciboModal, setShowReciboModal] = useState(false);
  const [reciboLaunchId, setReciboLaunchId] = useState<string | null>(null);
  const [lastRegisteredId, setLastRegisteredId] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);

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
        const [secRes, catRes, subRes, typeRes, partRes, clientRes] = await Promise.all([
          supabase.from('sectors').select('id, name').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('categories').select('id, name, color').order('name'),
          supabase.from('subcategories').select('id, category_id, name').eq('active', true).order('name'),
          supabase.from('types').select('id, subcategory_id, name, color').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('destination_partners').select('*').eq('client_id', clientId).order('name'),
          supabase.from('clients').select('*').eq('id', clientId).maybeSingle()
        ]);

        if (clientRes?.data) {
          setClientInfo(clientRes.data);
        }

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
        const parsed = (lData as any[]).map(item => {
          let meta: any = {};
          if (item.observacao && (item.observacao.startsWith('{') || item.observacao.includes('vehicle_type'))) {
            try { meta = JSON.parse(item.observacao); } catch {}
          }
          return {
            ...item,
            partner_id: item.partner_id || meta.partner_id,
            partner_name: item.partner_name || meta.partner_name || item.destino,
            vehicle_id: item.vehicle_id || meta.vehicle_id,
            vehicle_plate: item.vehicle_plate || meta.vehicle_plate,
            vehicle_type: item.vehicle_type || meta.vehicle_type,
            fuel_type: item.fuel_type || meta.fuel_type,
            distance_km: item.distance_km != null ? item.distance_km : meta.distance_km
          };
        });
        setLaunches(parsed as WasteLaunch[]);
        saveStoredLaunches(clientId, parsed as WasteLaunch[]);
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

  // Quando escolhe um parceiro, carrega a frota de veículos dele e seleciona o primeiro
  // Quando escolhe um parceiro, carrega a frota de veículos dele e valida as categorias aceitas
  const handlePartnerChange = (pid: string) => {
    setPartnerId(pid);
    if (pid === '__NEW__') {
      setShowPartnerModal(true);
      setPartnerId('');
      setAvailableVehicles([]);
      setSelectedVehicleId('');
      setVehiclePlate('');
      setCategoryId('');
      setSubcategoryId('');
      setTypeId('');
      return;
    }

    const selectedPart = partners.find(p => p.id === pid);
    if (selectedPart) {
      let vehs: PartnerVehicle[] = [];
      if (selectedPart.vehicles && Array.isArray(selectedPart.vehicles) && selectedPart.vehicles.length > 0) {
        vehs = selectedPart.vehicles;
      } else if (selectedPart.vehicle_type) {
        vehs = [{
          id: `veh_leg_${selectedPart.id}`,
          vehicle_type: selectedPart.vehicle_type,
          fuel_type: selectedPart.fuel_type || 'Diesel',
          plate: selectedPart.plate || undefined,
          distance_km: selectedPart.distance_km != null ? selectedPart.distance_km : null,
          description: 'Veículo Principal'
        }];
      }
      setAvailableVehicles(vehs);

      if (vehs.length > 0) {
        const firstVeh = vehs[0];
        setSelectedVehicleId(firstVeh.id);
        setVehicleType(firstVeh.vehicle_type);
        setFuelType(firstVeh.fuel_type);
        setVehiclePlate(firstVeh.plate || '');
        if (firstVeh.distance_km != null) setDistanceKm(firstVeh.distance_km);
      } else {
        setSelectedVehicleId('');
        setVehicleType('Caminhão Baú');
        setFuelType('Diesel');
        setVehiclePlate('');
        setDistanceKm(null);
      }

      // Validar se a categoria atual continua sendo aceita pelo parceiro
      const partnerCats = getPartnerAcceptedCategories(selectedPart, categories);
      if (categoryId) {
        const isCurrentValid = partnerCats.some(c => c.id === categoryId);
        if (!isCurrentValid) {
          setCategoryId('');
          setSubcategoryId('');
          setTypeId('');
        }
      } else if (partnerCats.length === 1) {
        // Se o parceiro tiver somente 1 categoria aceita, seleciona automaticamente
        setCategoryId(partnerCats[0].id);
      }
    } else {
      setAvailableVehicles([]);
      setSelectedVehicleId('');
      setVehiclePlate('');
      setDistanceKm(null);
      setCategoryId('');
      setSubcategoryId('');
      setTypeId('');
    }
  };

  const handleVehicleChange = (vid: string) => {
    setSelectedVehicleId(vid);
    const foundVeh = availableVehicles.find(v => v.id === vid);
    if (foundVeh) {
      setVehicleType(foundVeh.vehicle_type);
      setFuelType(foundVeh.fuel_type);
      setVehiclePlate(foundVeh.plate || '');
      if (foundVeh.distance_km != null) setDistanceKm(foundVeh.distance_km);
    }
  };

  // Parceiro selecionado no formulário
  const selectedPartner = useMemo(() => {
    return partners.find(p => p.id === partnerId);
  }, [partners, partnerId]);

  // Categorias disponíveis para o parceiro selecionado (filtradas pelos materiais aceitos)
  const availableCategories = useMemo(() => {
    return getPartnerAcceptedCategories(selectedPartner, categories);
  }, [selectedPartner, categories]);

  // Categoria atualmente selecionada
  const selectedCategoryObj = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categories, categoryId]);

  // Subcategorias disponíveis (filtradas pela categoria e pelos materiais aceitos do parceiro)
  const filteredSubs = useMemo(() => {
    const raw = subcategories.filter(s => s.category_id === categoryId);
    return getPartnerAcceptedSubcategories(selectedPartner, selectedCategoryObj, raw);
  }, [selectedPartner, selectedCategoryObj, categoryId, subcategories]);

  const filteredTypes = useMemo(() => {
    return types.filter(t => t.subcategory_id === subcategoryId);
  }, [types, subcategoryId]);

  // Cascaded filters for inline editing
  const editPartnerObj = useMemo(() => {
    return partners.find(p => p.id === editPartnerId);
  }, [partners, editPartnerId]);

  const editAvailableCategories = useMemo(() => {
    return getPartnerAcceptedCategories(editPartnerObj, categories);
  }, [editPartnerObj, categories]);

  const editSelectedCategoryObj = useMemo(() => {
    return categories.find(c => c.id === editCategory);
  }, [categories, editCategory]);

  const editFilteredSubs = useMemo(() => {
    const raw = subcategories.filter(s => s.category_id === editCategory);
    return getPartnerAcceptedSubcategories(editPartnerObj, editSelectedCategoryObj, raw);
  }, [editPartnerObj, editSelectedCategoryObj, editCategory, subcategories]);

  const editFilteredTypes = useMemo(() => {
    return types.filter(t => t.subcategory_id === editSub);
  }, [types, editSub]);

  // Cascaded filters: Categoria -> Subcategoria -> Tipo
  useEffect(() => {
    setSubcategoryId('');
    setTypeId('');
  }, [categoryId]);

  useEffect(() => {
    setTypeId('');
  }, [subcategoryId]);

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
    const selectedVeh = availableVehicles.find(v => v.id === selectedVehicleId);
    const resolvedPlate = vehiclePlate || selectedVeh?.plate || null;

    const metaObj = {
      partner_id: partnerId,
      partner_name: partnerName,
      vehicle_id: selectedVehicleId || null,
      vehicle_plate: resolvedPlate,
      vehicle_type: vehicleType,
      fuel_type: fuelType,
      distance_km: distanceKm
    };

    const payload = {
      client_id: clientId,
      data: dataEnvio,
      partner_id: partnerId,
      partner_name: partnerName,
      vehicle_id: selectedVehicleId || null,
      vehicle_plate: resolvedPlate,
      vehicle_type: vehicleType,
      fuel_type: fuelType,
      distance_km: distanceKm,
      sector_id: firstSectorId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      type_id: typeId,
      destino: partnerName,
      peso_kg: parseFloat(peso),
      observacao: JSON.stringify(metaObj),
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
          observacao: JSON.stringify(metaObj),
          created_by: user?.id || null
        };
        const ret = await supabase.from('waste_launches').insert(basicPayload);
        error = ret.error;
      }

      if (error) throw error;

      // Update local storage as well
      const newId = crypto.randomUUID();
      const newLaunch: WasteLaunch = {
        id: newId,
        ...payload
      };
      saveStoredLaunches(clientId, [newLaunch, ...launches]);

      setLastRegisteredId(newId);
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
      if (error) {
        console.warn('Supabase delete error, proceeding with local update:', error);
      }
      const updated = launches.filter(l => l.id !== id);
      setLaunches(updated);
      saveStoredLaunches(clientId!, updated);
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

    const metaObj = {
      partner_id: editPartnerId || null,
      partner_name: partnerName,
      vehicle_type: editVehicleType,
      fuel_type: editFuelType
    };

    try {
      let { error } = await supabase
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
          peso_kg: parseFloat(editPeso),
          observacao: JSON.stringify(metaObj)
        })
        .eq('id', wid);

      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const ret = await supabase
          .from('waste_launches')
          .update({
            data: editData,
            category_id: editCategory,
            subcategory_id: editSub,
            type_id: editType,
            destino: partnerName,
            peso_kg: parseFloat(editPeso),
            observacao: JSON.stringify(metaObj)
          })
          .eq('id', wid);
        error = ret.error;
      }

      if (error) throw error;

      const updated = launches.map(l => l.id === wid ? {
        ...l,
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
      } : l);
      setLaunches(updated);
      saveStoredLaunches(clientId!, updated);

      setEditId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao atualizar lançamento: ' + err.message);
    }
  };

  const totalKgAcumulados = launches.reduce((acc, w) => acc + Number(w.peso_kg), 0);

  return (
    <div className="flex flex-col gap-4">
      
      {/* Title Header - Estilo Gravimetria.tsx */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="btn btn-ghost btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestão de Lançamentos de Resíduos</h1>
            <p className="text-muted text-sm">Registre a pesagem e a destinação dos resíduos diretamente aos parceiros cadastrados</p>
          </div>
        </div>

        <div>
          <Link to="/parceiros" className="btn btn-primary flex items-center gap-1.5">
            <Truck size={16} />
            <span>Parceiros de Destinação</span>
          </Link>
        </div>
      </div>

      {msg && (
        <div className="flex items-center justify-between flex-wrap gap-2" style={{
          padding: '0.85rem 1.15rem',
          borderRadius: '8px',
          backgroundColor: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{msg.text}</span>
          </div>

          {msg.type === 'success' && lastRegisteredId && (
            <button
              type="button"
              onClick={() => {
                setReciboLaunchId(lastRegisteredId);
                setShowReciboModal(true);
              }}
              className="btn btn-sm btn-primary flex items-center gap-1.5 shadow-sm"
              style={{ backgroundColor: '#157a43', borderColor: '#157a43', padding: '0.35rem 0.85rem', fontWeight: 700 }}
            >
              <FileText size={15} />
              <span>Emitir Recibo deste Envio</span>
            </button>
          )}
        </div>
      )}

      {/* CARD LANÇAR RESÍDUOS - ESTÉICA IDÊNTICA À GRAVIMETRIA */}
      <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
        
        {/* Card Header Estilo Gravimetria */}
        <div className="card-header flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '1rem' }}>
          <div>
            <h2 className="flex items-center gap-2 m-0" style={{ fontSize: '1.25rem' }}>
              <span 
                className="pulse-active" 
                style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', display: 'inline-block' }} 
              />
              Lançar Resíduos
              <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Programa de Gestão</span>
            </h2>
            <p className="text-muted text-xs mt-1">
              Informe a destinação, tipo de resíduo e a pesagem realizada para a destinação
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="flex items-center gap-1"><Scale size={16} /> {totalKgAcumulados.toFixed(2)} kg acumulados</span>
            <span>{launches.length} lançamentos registrados</span>
          </div>
        </div>

        {/* Form Grid Estilo Gravimetria */}
        <form onSubmit={handleRegisterWaste} style={{ marginTop: '1.5rem' }} className="flex flex-col gap-4">
          
          {/* LINHA 1: Data de Envio | Parceiro | Veículo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="form-group">
              <label className="form-label">Data de Envio *</label>
              <input 
                type="date" 
                className="form-input font-medium" 
                value={dataEnvio} 
                onChange={e => setDataEnvio(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Escolha o Parceiro *</label>
              <select className="form-select" value={partnerId} onChange={e => handlePartnerChange(e.target.value)} required>
                <option value="">Selecione o parceiro...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.vehicles && p.vehicles.length > 0 ? `(${p.vehicles.length} ${p.vehicles.length === 1 ? 'veículo' : 'veículos'})` : (p.company_type ? `(${p.company_type})` : '')}
                  </option>
                ))}
                <option value="__NEW__" style={{ fontWeight: 'bold', color: 'hsl(var(--primary))' }}>
                  + Cadastrar Novo Parceiro...
                </option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Veículo do Parceiro *</span>
                {partnerId && (
                  <span className="text-xs text-muted">
                    {availableVehicles.length} {availableVehicles.length === 1 ? 'disponível' : 'disponíveis'}
                  </span>
                )}
              </label>
              <select 
                className="form-select" 
                value={selectedVehicleId} 
                onChange={e => handleVehicleChange(e.target.value)} 
                required 
                disabled={!partnerId}
              >
                {!partnerId ? (
                  <option value="">Selecione o parceiro primeiro...</option>
                ) : availableVehicles.length === 0 ? (
                  <option value="">Nenhum veículo cadastrado para este parceiro</option>
                ) : (
                  <>
                    <option value="">Selecione o veículo...</option>
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_type} {v.plate ? `(Placa: ${v.plate})` : ''} - {v.fuel_type}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

          </div>

          {/* LINHA 2: Categoria | Subcategoria | Tipo de Resíduo | Peso */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Categoria *</span>
                {partnerId && (
                  <span className="text-xs text-muted" style={{ fontWeight: 'normal' }}>
                    {availableCategories.length} {availableCategories.length === 1 ? 'aceita' : 'aceitas'}
                  </span>
                )}
              </label>
              <select 
                className="form-select" 
                value={categoryId} 
                onChange={e => setCategoryId(e.target.value)} 
                required
                disabled={!partnerId}
              >
                {!partnerId ? (
                  <option value="">Selecione o parceiro primeiro...</option>
                ) : availableCategories.length === 0 ? (
                  <option value="">Nenhuma categoria aceita configurada para este parceiro</option>
                ) : (
                  <>
                    <option value="">Selecione a categoria...</option>
                    {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subcategoria *</label>
              <select className="form-select" value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} required disabled={!categoryId}>
                <option value="">Selecione a subcategoria...</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Resíduos *</label>
              <select className="form-select" value={typeId} onChange={e => setTypeId(e.target.value)} required disabled={!subcategoryId}>
                <option value="">Selecione o tipo...</option>
                {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Peso (kg) *</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input font-semibold" 
                placeholder="Ex: 250.50" 
                value={peso} 
                onChange={e => setPeso(e.target.value)} 
                required 
              />
            </div>

          </div>

          {/* Footer Form Action - Estilo Gravimetria */}
          <div className="flex justify-between items-center flex-wrap gap-2 mt-2" style={{ borderTop: '1px dashed hsl(var(--card-border))', paddingTop: '1rem' }}>
            <div className="flex-1">
              {partnerId && peso && (
                <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  Destinação: <strong>{partners.find(p => p.id === partnerId)?.name}</strong>
                  {vehicleType ? ` • Veículo: ${vehicleType}${vehiclePlate ? ` (${vehiclePlate})` : ''}` : ''}
                  {' • '}Peso: <strong>{peso} kg</strong>
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Gerando Envio...' : 'Gerar Envio'}
            </button>
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setReciboLaunchId(launches[0]?.id || null);
                setShowReciboModal(true);
              }}
              className="btn btn-sm btn-outline flex items-center gap-1.5"
              style={{ borderColor: '#157a43', color: '#157a43', fontWeight: 700 }}
              disabled={launches.length === 0}
              title="Abrir visualização e impressão de recibos"
            >
              <FileText size={15} />
              <span>Emitir Recibos</span>
            </button>
            <div className="text-sm font-semibold" style={{ color: '#1e293b' }}>
              Total Acumulado: <span style={{ color: '#157a43', fontWeight: 800 }}>{totalKgAcumulados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</span>
            </div>
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
                          <select 
                            className="form-select py-1 text-xs" 
                            value={editPartnerId} 
                            onChange={e => {
                              const newPid = e.target.value;
                              setEditPartnerId(newPid);
                              const newPart = partners.find(p => p.id === newPid);
                              const allowed = getPartnerAcceptedCategories(newPart, categories);
                              if (editCategory && !allowed.some(c => c.id === editCategory)) {
                                setEditCategory('');
                                setEditSub('');
                                setEditType('');
                              } else if (!editCategory && allowed.length === 1) {
                                setEditCategory(allowed[0].id);
                              }
                            }}
                          >
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
                          <select 
                            className="form-select py-1 text-xs" 
                            value={editCategory} 
                            onChange={e => {
                              setEditCategory(e.target.value);
                              setEditSub('');
                              setEditType('');
                            }}
                            disabled={!editPartnerId}
                          >
                            <option value="">{editPartnerId ? 'Selecione...' : 'Selecione o parceiro'}</option>
                            {editAvailableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="form-select py-1 text-xs" 
                            value={editSub} 
                            onChange={e => {
                              setEditSub(e.target.value);
                              setEditType('');
                            }}
                            disabled={!editCategory}
                          >
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
                        <span className="text-xs font-semibold text-slate-800">{w.vehicle_type || '—'}</span>
                        {w.vehicle_plate && (
                          <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 w-fit mt-0.5">
                            {w.vehicle_plate}
                          </div>
                        )}
                        {w.fuel_type && <div className="text-muted text-xs mt-0.5">{w.fuel_type}</div>}
                      </td>
                      <td>
                        <span className="badge badge-default">{catName}</span>
                      </td>
                      <td>{subName}</td>
                      <td className="font-medium">{typeName}</td>
                      <td className="font-bold text-slate-900">{Number(w.peso_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            type="button"
                            onClick={() => { 
                              setReciboLaunchId(w.id); 
                              setShowReciboModal(true); 
                            }} 
                            className="btn btn-ghost btn-icon" 
                            style={{ color: '#157a43' }}
                            title="Emitir / Imprimir Recibo"
                          >
                            <FileText size={15} />
                          </button>
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

      {/* MODAL DE EMISSÃO DE RECIBO */}
      <ReciboEnvioModal
        isOpen={showReciboModal}
        onClose={() => setShowReciboModal(false)}
        selectedLaunchId={reciboLaunchId}
        launches={launches}
        partners={partners}
        clientInfo={clientInfo}
        categoryMap={categoryMap}
        subMap={subMap}
        typeMap={typeMap}
      />

    </div>
  );
};

export default GerenciarLancamentosReais;
