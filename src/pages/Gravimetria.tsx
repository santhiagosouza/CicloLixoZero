import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { 
  Scale, 
  Trash2, 
  Play, 
  Square, 
  Pencil, 
  Check, 
  X, 
  AlertTriangle 
} from 'lucide-react';

interface GravimetriaType {
  id: string;
  numero: number;
  started_at: string;
  ended_at: string | null;
  sample_days: number | null;
}

interface Sector {
  id: string;
  name: string;
}

interface Classification {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Type {
  id: string;
  category_id: string;
  name: string;
  color: string | null;
  default_classification_id: string | null;
}

interface Subcategory {
  id: string;
  type_id: string;
  name: string;
}

interface Weighing {
  id: string;
  data: string;
  peso_kg: number;
  sector_id: string;
  category_id: string;
  type_id: string;
  subcategory_id: string;
  classification_id: string;
  created_at?: string;
}

const Gravimetria: React.FC = () => {
  const { clientId, isClientAdmin, isMasterAdmin, user, loading } = useAuth();

  // Active Gravimetria & History state
  const [active, setActive] = useState<GravimetriaType | null>(null);
  const [history, setHistory] = useState<GravimetriaType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Aux structures for select inputs
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Local caching maps for fast rendering
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [typeMap, setTypeMap] = useState<Record<string, Type>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // Weighings for active gravimetria
  const [weighings, setWeighings] = useState<Weighing[]>([]);

  // Form states
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(today);
  const [sectorId, setSectorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [peso, setPeso] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline editing state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPeso, setEditPeso] = useState('');

  // Modals state
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startDays, setStartDays] = useState('1');
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endDays, setEndDays] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteGravConfirmId, setDeleteGravConfirmId] = useState<string | null>(null);

  // Fetch initial aux configurations
  useEffect(() => {
    if (!clientId) return;

    const fetchConfig = async () => {
      setLoadingData(true);
      try {
        const [secRes, classRes, catRes, typeRes, subRes] = await Promise.all([
          supabase.from('sectors').select('id, name').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('classifications').select('id, name'),
          supabase.from('categories').select('id, name, color').order('name'),
          supabase.from('types').select('id, category_id, name, color, default_classification_id').order('name'),
          supabase.from('subcategories')
            .select('id, type_id, name')
            .or(`client_id.is.null,client_id.eq.${clientId}`)
            .eq('active', true)
            .order('name')
        ]);

        const secs = (secRes.data || []) as Sector[];
        const classes = (classRes.data || []) as Classification[];
        const cats = (catRes.data || []) as Category[];
        const typs = (typeRes.data || []) as Type[];
        const subs = (subRes.data || []) as Subcategory[];

        setSectors(secs);
        setCategories(cats);
        setTypes(typs);
        setSubcategories(subs);

        // Build mapping objects
        setSectorMap(Object.fromEntries(secs.map(s => [s.id, s.name])));
        setCategoryMap(Object.fromEntries(cats.map(c => [c.id, c])));
        setTypeMap(Object.fromEntries(typs.map(t => [t.id, t])));
        setSubMap(Object.fromEntries(subs.map(s => [s.id, s.name])));
        setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));

        // Fetch Gravimetrias
        const { data: gravs, error: gravsError } = await supabase
          .from('gravimetrias')
          .select('*')
          .eq('client_id', clientId)
          .order('numero', { ascending: false });

        if (gravsError) throw gravsError;

        const allGravs = (gravs || []) as GravimetriaType[];
        const currentActive = allGravs.find(g => !g.ended_at) || null;
        setActive(currentActive);
        setHistory(allGravs.filter(g => g.ended_at));
      } catch (err: any) {
        console.error('Erro ao carregar configurações de gravimetria:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchConfig();
  }, [clientId, reloadKey]);

  // Fetch weighings when active gravimetria changes
  useEffect(() => {
    if (!active) {
      setWeighings([]);
      return;
    }

    supabase
      .from('weighings')
      .select('*')
      .eq('gravimetria_id', active.id)
      .order('created_at', { ascending: false })
      .then(({ data: wData, error }) => {
        if (error) {
          console.error('Erro ao buscar pesagens:', error);
        } else {
          setWeighings((wData || []) as Weighing[]);
        }
      });
  }, [active, reloadKey]);

  // Auto-fill classification when type is selected
  useEffect(() => {
    if (typeId) {
      const selectedType = types.find(t => t.id === typeId);
      if (selectedType && selectedType.default_classification_id) {
        setClassificationId(selectedType.default_classification_id);
      } else {
        setClassificationId('');
      }
    } else {
      setClassificationId('');
    }
    setSubcategoryId('');
  }, [typeId, types]);

  // Handle Cascading Filter changes
  useEffect(() => {
    setTypeId('');
    setSubcategoryId('');
    setClassificationId('');
  }, [categoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando perfil...</p>
      </div>
    );
  }

  if (!clientId && isMasterAdmin) {
    return <Navigate to="/master" replace />;
  }

  if (!clientId) {
    return (
      <div className="card text-center" style={{ margin: '3rem auto', maxWidth: '500px' }}>
        <h2 style={{ color: 'hsl(var(--destructive))' }}>Vínculo pendente</h2>
        <p className="text-muted mt-2">
          Sua conta ainda não está vinculada a nenhuma empresa cliente. Por favor, contate o administrador master para realizar o vínculo.
        </p>
      </div>
    );
  }

  // Filtered dropdowns based on cascades
  const filteredTypes = types.filter(t => t.category_id === categoryId);
  const filteredSubs = subcategories.filter(s => s.type_id === typeId);

  // Edit-mode cascading dropdown filters
  const editFilteredTypes = types.filter(t => t.category_id === editCategory);
  const editFilteredSubs = subcategories.filter(s => s.type_id === editType);

  const startGravimetria = async () => {
    const days = parseInt(startDays, 10);
    if (isNaN(days) || days < 1) {
      alert('Por favor, informe um número de dias de separação válido (maior que 0).');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('gravimetrias')
        .insert({
          client_id: clientId,
          numero: 0,
          started_by: user!.id,
          sample_days: days
        });

      if (error) throw error;
      setStartModalOpen(false);
      setStartDays('1');
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao iniciar gravimetria: ' + err.message);
    }
  };

  const cancelActiveGravimetria = async () => {
    if (!active) return;
    try {
      const { error } = await supabase
        .from('gravimetrias')
        .delete()
        .eq('id', active.id);

      if (error) throw error;
      setDeleteGravConfirmId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao cancelar gravimetria: ' + err.message);
    }
  };

  const endActiveGravimetria = async () => {
    if (!active) return;
    const days = parseInt(endDays, 10);
    if (isNaN(days) || days < 1) {
      alert('Por favor, informe um número de dias de separação válido (maior que 0).');
      return;
    }

    try {
      const { error } = await supabase
        .from('gravimetrias')
        .update({
          ended_at: new Date().toISOString(),
          sample_days: days
        })
        .eq('id', active.id);

      if (error) throw error;
      setEndModalOpen(false);
      setEndDays('');
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao encerrar gravimetria: ' + err.message);
    }
  };

  const handleRegisterWeighing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!sectorId || !categoryId || !typeId || !subcategoryId || !classificationId || !peso) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('weighings')
        .insert({
          gravimetria_id: active.id,
          client_id: clientId,
          data,
          sector_id: sectorId,
          category_id: categoryId,
          type_id: typeId,
          subcategory_id: subcategoryId,
          classification_id: classificationId,
          peso_kg: Number(peso),
          created_by: user!.id
        });

      if (error) throw error;

      setPeso('');
      setReloadKey(k => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar pesagem.');
    } finally {
      setSubmitting(false);
    }
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

  const totalActiveKg = weighings.reduce((acc, w) => acc + Number(w.peso_kg), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestão de Gravimetria</h1>
          <p className="text-muted text-sm">Registre as pesagens físicas e acompanhe os estudos de resíduos</p>
        </div>
        
        {/* Actions for Active Gravimetria */}
        {(isClientAdmin || isMasterAdmin) && (
          <div>
            {active ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEndDays(active.sample_days ? String(active.sample_days) : '1'); setEndModalOpen(true); }} 
                  className="btn btn-primary"
                  style={{ backgroundColor: 'hsl(var(--destructive))', color: '#fff' }}
                >
                  <Square size={16} />
                  <span>Encerrar Gravimetria</span>
                </button>
                <button 
                  onClick={() => setDeleteGravConfirmId(active.id)} 
                  className="btn btn-outline"
                >
                  <X size={16} />
                  <span>Cancelar</span>
                </button>
              </div>
            ) : (
              <button onClick={() => { setStartDays('1'); setStartModalOpen(true); }} className="btn btn-primary">
                <Play size={16} />
                <span>Iniciar Nova Gravimetria</span>
              </button>
            )}
          </div>
        )}
      </div>

      {loadingData ? (
        <div className="text-center py-6">
          <p className="text-muted pulse-active font-medium">Buscando dados da nuvem...</p>
        </div>
      ) : (
        <>
          {/* ACTIVE GRAVIMETRIA */}
          {active ? (
            <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="card-header flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '1rem' }}>
                <div>
                  <h2 className="flex items-center gap-2 m-0" style={{ fontSize: '1.25rem' }}>
                    <span 
                      className="pulse-active" 
                      style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', display: 'inline-block' }} 
                    />
                    Estudo Gravimétrico #{active.numero}
                    <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Em Andamento</span>
                  </h2>
                  <p className="text-muted text-xs mt-1">
                    Iniciado em: {new Date(active.started_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <span className="flex items-center gap-1"><Scale size={16} /> {totalActiveKg.toFixed(2)} kg acumulados</span>
                  <span>{weighings.length} pesagens registradas</span>
                </div>
              </div>

              {/* Weighing Registry Form */}
              <form onSubmit={handleRegisterWeighing} style={{ marginTop: '1.5rem' }} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="form-group md:col-span-1">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={data} onChange={e => setData(e.target.value)} required />
                </div>
                
                <div className="form-group md:col-span-1">
                  <label className="form-label">Setor</label>
                  <select className="form-select" value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group md:col-span-1">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group md:col-span-1">
                  <label className="form-label">Tipo</label>
                  <select 
                    className="form-select" 
                    value={typeId} 
                    onChange={e => setTypeId(e.target.value)} 
                    disabled={!categoryId} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="form-group md:col-span-1">
                  <label className="form-label">Subcategoria</label>
                  <select 
                    className="form-select" 
                    value={subcategoryId} 
                    onChange={e => setSubcategoryId(e.target.value)} 
                    disabled={!typeId} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group md:col-span-1">
                  <label className="form-label">Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    min="0.001" 
                    className="form-input" 
                    placeholder="0.00" 
                    value={peso} 
                    onChange={e => setPeso(e.target.value)} 
                    required 
                  />
                </div>

                {/* Info & Submit Section */}
                <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-2 mt-2" style={{ borderTop: '1px dashed hsl(var(--card-border))', paddingTop: '1rem' }}>
                  <div className="flex-1">
                    {classificationId && (
                      <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                        Classificação Automática: <strong>{classMap[classificationId] || 'Não informada'}</strong>
                      </span>
                    )}
                    {formError && <p style={{ color: 'hsl(var(--destructive))', fontSize: '0.825rem', marginTop: '0.25rem', fontWeight: 500 }}>{formError}</p>}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Registrando...' : 'Registrar Lançamento'}
                  </button>
                </div>
              </form>

              {/* Weighings Table List */}
              <div className="table-container" style={{ marginTop: '2rem' }}>
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
                      <th style={{ width: '80px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {weighings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                          Nenhuma pesagem realizada neste estudo ainda.
                        </td>
                      </tr>
                    ) : (
                      weighings.map(w => {
                        const isEditingThisRow = editId === w.id;

                        // Auto-update edit class when edit type changes
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
                                  {editFilteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className="form-select" style={{ padding: '0.25rem 0.5rem', minWidth: '100px' }} value={editSub} onChange={e => setEditSub(e.target.value)} disabled={!editType}>
                                  <option value="">Selecione...</option>
                                  {editFilteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                              <span className="flex items-center gap-1.5 font-medium">
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: catColor }} />
                                {categoryMap[w.category_id]?.name || '—'}
                              </span>
                            </td>
                            <td>{typeMap[w.type_id]?.name || '—'}</td>
                            <td>{subMap[w.subcategory_id] || '—'}</td>
                            <td><span className="text-muted text-xs font-semibold">{classMap[w.classification_id] || '—'}</span></td>
                            <td className="text-right font-semibold">{Number(w.peso_kg).toFixed(2)} kg</td>
                            <td>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleStartInlineEdit(w)} className="btn btn-ghost btn-icon" title="Editar"><Pencil size={15} /></button>
                                <button onClick={() => setDeleteConfirmId(w.id)} className="btn btn-ghost btn-icon" style={{ color: 'hsl(var(--destructive))' }} title="Remover"><Trash2 size={15} /></button>
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
          ) : (
            <div className="card text-center" style={{ padding: '4rem 2rem' }}>
              <Scale size={48} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.6, margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nenhum estudo ativo</h2>
              <p className="text-muted text-sm mt-2" style={{ maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                Atualmente não há nenhuma rodada de coleta de resíduos ativa. Para realizar novos lançamentos de pesagens, é necessário iniciar uma gravimetria.
              </p>
              {(isClientAdmin || isMasterAdmin) ? (
                <button onClick={() => { setStartDays('1'); setStartModalOpen(true); }} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                  <Play size={16} />
                  <span>Iniciar Gravimetria</span>
                </button>
              ) : (
                <p className="badge badge-default">Aguardando o Administrador iniciar uma nova coleta.</p>
              )}
            </div>
          )}

          {/* HISTÓRICO DE ESTUDOS */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h2 className="card-title">Histórico de Estudos</h2>
              <p className="card-description">Estudos gravimétricos encerrados e relatórios consolidados</p>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Início do Estudo</th>
                    <th>Fim do Estudo</th>
                    <th>Dias Considerados</th>
                    <th className="text-right" style={{ width: '220px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted" style={{ padding: '2.5rem 0' }}>
                        Nenhum estudo de gravimetria encerrado no histórico.
                      </td>
                    </tr>
                  ) : (
                    history.map(g => (
                      <tr key={g.id}>
                        <td className="font-semibold">Estudo Gravimétrico #{g.numero}</td>
                        <td>{new Date(g.started_at).toLocaleDateString('pt-BR')}</td>
                        <td>{g.ended_at ? new Date(g.ended_at).toLocaleDateString('pt-BR') : '—'}</td>
                        <td>
                          {g.sample_days ? (
                            <span className="badge badge-default font-medium">{g.sample_days} {g.sample_days === 1 ? 'dia' : 'dias'}</span>
                          ) : (
                            <span className="text-muted italic text-sm">Não informado</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link to={`/gravimetria/${g.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                              Ver Análise
                            </Link>
                            {(isClientAdmin || isMasterAdmin) && (
                              <button 
                                onClick={() => setDeleteGravConfirmId(g.id)} 
                                className="btn btn-outline" 
                                style={{ padding: '0.4rem', color: 'hsl(var(--destructive))', borderColor: 'transparent' }}
                                title="Excluir do Histórico"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL: INICIAR NOVA GRAVIMETRIA */}
      {startModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title font-semibold">Iniciar Nova Gravimetria</h3>
              <button onClick={() => setStartModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Configure os dias de separação para iniciar o novo estudo gravimétrico.
              </p>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Dias de Coleta Considerados (Separados)</label>
                <input 
                  type="number" 
                  min="1" 
                  step="1" 
                  className="form-input" 
                  placeholder="Ex: 7" 
                  value={startDays} 
                  onChange={e => setStartDays(e.target.value)} 
                  required
                />
                <p className="text-xs text-muted mt-1">
                  Insira o número de dias de separação considerados para a amostragem. Este valor é essencial para calcular as projeções de geração mensal e anual desde o início.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setStartModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={startGravimetria} className="btn btn-primary">
                Iniciar Estudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENCERRAR GRAVIMETRIA */}
      {endModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title font-semibold">Encerrar Gravimetria</h3>
              <button onClick={() => setEndModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {active && `O Estudo Gravimétrico #${active.numero} será fechado e novas pesagens não poderão ser inseridas.`}
              </p>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Dias de Coleta Considerados</label>
                <input 
                  type="number" 
                  min="1" 
                  step="1" 
                  className="form-input" 
                  placeholder="Ex: 7" 
                  value={endDays} 
                  onChange={e => setEndDays(e.target.value)} 
                  required
                />
                <p className="text-xs text-muted mt-1">
                  Insira o número de dias de separação considerados. Este valor é essencial para calcular as projeções de geração mensal e anual.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEndModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={endActiveGravimetria} className="btn btn-primary" style={{ backgroundColor: 'hsl(var(--destructive))', color: '#fff' }}>
                Encerrar Estudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: REMOVE WEIGHING */}
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
              Tem certeza que deseja excluir esta pesagem? Esta ação é permanente e não poderá ser desfeita.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleRemoveWeighing(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: REMOVE GRAVIMETRIA */}
      {deleteGravConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <AlertTriangle size={20} />
                Excluir Gravimetria
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Atenção: ao excluir este estudo, <strong>todas as pesagens vinculadas a ele serão apagadas permanentemente</strong>. Deseja prosseguir?
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteGravConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button 
                onClick={async () => {
                  if (active && deleteGravConfirmId === active.id) {
                    await cancelActiveGravimetria();
                  } else {
                    // For history items
                    try {
                      const { error } = await supabase.from('gravimetrias').delete().eq('id', deleteGravConfirmId);
                      if (error) throw error;
                      setDeleteGravConfirmId(null);
                      setReloadKey(k => k + 1);
                    } catch (err: any) {
                      alert('Erro ao excluir gravimetria: ' + err.message);
                    }
                  }
                }} 
                className="btn btn-danger"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gravimetria;
