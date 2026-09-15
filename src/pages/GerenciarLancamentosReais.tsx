import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Scale, Pencil, Trash2, Check, X
} from 'lucide-react';

interface Sector { id: string; name: string; }
interface Classification { id: string; name: string; }
interface Category { id: string; name: string; color: string | null; }
interface Subcategory { id: string; category_id: string; name: string; }
interface Type { id: string; subcategory_id: string; name: string; color: string | null; default_classification_id?: string | null; }

interface WasteLaunch {
  id: string;
  data: string;
  peso_kg: number;
  destino?: string;
  sector_id: string;
  category_id: string;
  subcategory_id?: string;
  type_id: string;
  classification_id?: string;
  observacao?: string;
}

export const GerenciarLancamentosReais: React.FC = () => {
  const { clientId, user } = useAuth();

  // Aux configurations
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [launches, setLaunches] = useState<WasteLaunch[]>([]);

  // Maps
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [typeMap, setTypeMap] = useState<Record<string, Type>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // Form states - Resíduo com Cascata (sem campo Destino na geração)
  const [data, setData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sectorId, setSectorId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [classificationId, setClassificationId] = useState<string>('');
  const [peso, setPeso] = useState<string>('');

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editType, setEditType] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPeso, setEditPeso] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!clientId) return;

    const loadAuxData = async () => {
      try {
        const [secRes, classRes, catRes, subRes, typeRes] = await Promise.all([
          supabase.from('sectors').select('id, name').eq('client_id', clientId).eq('active', true).order('name'),
          supabase.from('classifications').select('id, name'),
          supabase.from('categories').select('id, name, color').order('name'),
          supabase.from('subcategories').select('id, category_id, name').eq('active', true).order('name'),
          supabase.from('types').select('id, subcategory_id, name, color, default_classification_id').eq('client_id', clientId).eq('active', true).order('name')
        ]);

        const secs = (secRes.data || []) as Sector[];
        const classes = (classRes.data || []) as Classification[];
        const cats = (catRes.data || []) as Category[];
        const subs = (subRes.data || []) as Subcategory[];
        const typs = (typeRes.data || []) as Type[];

        setSectors(secs);
        setCategories(cats);
        setSubcategories(subs);
        setTypes(typs);

        setSectorMap(Object.fromEntries(secs.map(s => [s.id, s.name])));
        setCategoryMap(Object.fromEntries(cats.map(c => [c.id, c])));
        setSubMap(Object.fromEntries(subs.map(s => [s.id, s.name])));
        setTypeMap(Object.fromEntries(typs.map(t => [t.id, t])));
        setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));

        // Fetch Recent Waste Launches
        fetchLaunches();
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      }
    };

    loadAuxData();
  }, [clientId, reloadKey]);

  const fetchLaunches = async () => {
    if (!clientId) return;
    const { data: lData } = await supabase
      .from('waste_launches')
      .select('*')
      .eq('client_id', clientId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    setLaunches((lData as WasteLaunch[]) || []);
  };

  // Preenchimento automático de classificação ao selecionar o Tipo
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
  }, [typeId, types]);

  // Filtros em cascata: Categoria -> Subcategoria -> Tipo
  useEffect(() => {
    setSubcategoryId('');
    setTypeId('');
    setClassificationId('');
  }, [categoryId]);

  useEffect(() => {
    setTypeId('');
    setClassificationId('');
  }, [subcategoryId]);

  const filteredSubs = subcategories.filter(s => s.category_id === categoryId);
  const filteredTypes = types.filter(t => t.subcategory_id === subcategoryId);

  // Edit-mode cascading dropdown filters
  const editFilteredSubs = subcategories.filter(s => s.category_id === editCategory);
  const editFilteredTypes = types.filter(t => t.subcategory_id === editSub);

  // Função para inferir o destino padrão de acordo com a categoria no backend
  const inferDestinoPorCategoria = (catId: string) => {
    const catName = (categoryMap[catId]?.name || '').toLowerCase();
    if (catName.includes('orgânic')) return 'Compostagem';
    if (catName.includes('reciclável')) return 'Cooperativa';
    if (catName.includes('perigoso')) return 'Reciclagem';
    return 'Aterro';
  };

  // Registrar Lançamento de Resíduos (Sem campo de destino na geração)
  const handleRegisterWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (!sectorId || !categoryId || !subcategoryId || !typeId || !peso) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const destinoInferido = inferDestinoPorCategoria(categoryId);

    try {
      const { error } = await supabase
        .from('waste_launches')
        .insert({
          client_id: clientId,
          data,
          sector_id: sectorId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          type_id: typeId,
          classification_id: classificationId || null,
          destino: destinoInferido,
          peso_kg: parseFloat(peso),
          created_by: user?.id || null
        });

      if (error) throw error;

      setPeso('');
      setFormError(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar pesagem.');
    } finally {
      setSubmitting(false);
    }
  };

  // Salvar Edição Inline
  const handleSaveInlineEdit = async (wid: string) => {
    if (!editSector || !editCategory || !editType || !editSub || !editPeso) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const destinoInferido = inferDestinoPorCategoria(editCategory);

    try {
      const { error } = await supabase
        .from('waste_launches')
        .update({
          data: editData,
          sector_id: editSector,
          category_id: editCategory,
          subcategory_id: editSub,
          type_id: editType,
          classification_id: editClass || null,
          destino: destinoInferido,
          peso_kg: parseFloat(editPeso)
        })
        .eq('id', wid);

      if (error) throw error;

      setEditId(null);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao atualizar pesagem: ' + err.message);
    }
  };

  const handleStartInlineEdit = (w: WasteLaunch) => {
    setEditId(w.id);
    setEditData(w.data);
    setEditSector(w.sector_id);
    setEditCategory(w.category_id);
    setEditSub(w.subcategory_id || '');
    setEditType(w.type_id);
    setEditClass(w.classification_id || '');
    setEditPeso(String(w.peso_kg));
  };

  const handleDeleteLaunch = async (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento?')) return;
    try {
      const { error } = await supabase.from('waste_launches').delete().eq('id', id);
      if (error) throw error;
      setReloadKey(k => k + 1);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const totalKgAcumulados = launches.reduce((acc, w) => acc + Number(w.peso_kg), 0);

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: '3rem' }}>
      
      {/* Header com botão de voltar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="btn btn-ghost btn-icon" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>Gestão de Lançamentos de Resíduos</h1>
            <p className="text-muted text-sm">Registre as pesagens físicas e acompanhe os lançamentos reais de resíduos</p>
          </div>
        </div>
      </div>

      {/* LANÇAMENTOS DE RESÍDUOS OPERACIONAIS */}
      <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', backgroundColor: '#ffffff' }}>
          
          {/* Card Header com estatísticas em tempo real */}
          <div className="card-header flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '1rem' }}>
            <div>
              <h2 className="flex items-center gap-2 m-0" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0c4a24' }}>
                <span 
                  className="pulse-active" 
                  style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#157a43', display: 'inline-block' }} 
                />
                Lançamento Operacional de Resíduos
                <span className="badge badge-success" style={{ marginLeft: '0.5rem', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>Operação Contínua</span>
              </h2>
              <p className="text-muted text-xs mt-1">Registre as pesagens físicas por setor, categoria, subcategoria e tipo</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold" style={{ color: '#334155' }}>
              <span className="flex items-center gap-1"><Scale size={16} style={{ color: '#157a43' }} /> <strong>{totalKgAcumulados.toFixed(2)} kg acumulados</strong></span>
              <span><strong>{launches.length} pesagens registradas</strong></span>
            </div>
          </div>

          {/* FORMULÁRIO HORIZONTAL DE PESAGEM (EXATAMENTE 6 CAMPOS COMO NA GRAVIMETRIA) */}
          <form onSubmit={handleRegisterWaste} style={{ marginTop: '1.5rem' }} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            
            {/* Data */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Data</label>
              <input type="date" className="form-input" value={data} onChange={e => setData(e.target.value)} required />
            </div>
            
            {/* Setor */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Setor</label>
              <select className="form-select" value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                <option value="">Selecione...</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Categoria */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Categoria</label>
              <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Subcategoria */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Subcategoria</label>
              <select 
                className="form-select" 
                value={subcategoryId} 
                onChange={e => setSubcategoryId(e.target.value)} 
                disabled={!categoryId} 
                required
              >
                <option value="">Selecione...</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Tipo */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Tipo</label>
              <select 
                className="form-select" 
                value={typeId} 
                onChange={e => setTypeId(e.target.value)} 
                disabled={!subcategoryId} 
                required
              >
                <option value="">Selecione...</option>
                {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Peso kg */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>Peso (kg)</label>
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

            {/* Seção Inferior do Formulário */}
            <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-2 mt-2" style={{ borderTop: '1px dashed hsl(var(--card-border))', paddingTop: '1rem' }}>
              <div className="flex-1">
                {classificationId && (
                  <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    Classificação Automática: <strong>{classMap[classificationId] || 'Não informada'}</strong>
                  </span>
                )}
                {formError && <p style={{ color: 'hsl(var(--destructive))', fontSize: '0.825rem', marginTop: '0.25rem', fontWeight: 500 }}>{formError}</p>}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting}
                style={{ backgroundColor: '#157a43', borderColor: '#157a43', color: '#ffffff', fontWeight: 700, padding: '0.6rem 1.25rem' }}
              >
                {submitting ? 'Registrando...' : 'Registrar Lançamento'}
              </button>
            </div>
          </form>

          {/* TABELA DE PESAGENS / LANÇAMENTOS REGISTRADOS */}
          <div className="table-container" style={{ marginTop: '2rem' }}>
            <table className="table">
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>DATA</th>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>SETOR</th>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>CATEGORIA</th>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>SUBCATEGORIA</th>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>TIPO</th>
                  <th style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>CLASSIFICAÇÃO</th>
                  <th className="text-right" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>PESO (KG)</th>
                  <th style={{ width: '80px' }} />
                </tr>
              </thead>
              <tbody>
                {launches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                      Nenhuma pesagem realizada neste período ainda.
                    </td>
                  </tr>
                ) : (
                  launches.map(w => {
                    const isEditingThisRow = editId === w.id;

                    const handleEditSubChange = (sid: string) => {
                      setEditSub(sid);
                      setEditType('');
                      setEditClass('');
                    };

                    const handleEditTypeChange = (tid: string) => {
                      setEditType(tid);
                      const selectedType = types.find(t => t.id === tid);
                      if (selectedType && selectedType.default_classification_id) {
                        setEditClass(selectedType.default_classification_id);
                      } else {
                        setEditClass('');
                      }
                    };

                    if (isEditingThisRow) {
                      return (
                        <tr key={w.id} style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #157a43' }}>
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input 
                              type="date" 
                              className="form-input" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              value={editData} 
                              onChange={e => setEditData(e.target.value)} 
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <select 
                              className="form-select" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              value={editSector} 
                              onChange={e => setEditSector(e.target.value)}
                            >
                              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <select 
                              className="form-select" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              value={editCategory} 
                              onChange={e => { setEditCategory(e.target.value); setEditSub(''); setEditType(''); setEditClass(''); }}
                            >
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <select 
                              className="form-select" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              value={editSub} 
                              onChange={e => handleEditSubChange(e.target.value)}
                              disabled={!editCategory}
                            >
                              <option value="">Selecione...</option>
                              {editFilteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <select 
                              className="form-select" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              value={editType} 
                              onChange={e => handleEditTypeChange(e.target.value)}
                              disabled={!editSub}
                            >
                              <option value="">Selecione...</option>
                              {editFilteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem', verticalAlign: 'middle' }}>
                            {editClass ? (
                              <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', border: '1px solid #bae6fd' }}>
                                {classMap[editClass]}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                          <td className="text-right" style={{ padding: '0.5rem 0.35rem' }}>
                            <input 
                              type="number" 
                              step="0.001" 
                              className="form-input text-right font-semibold" 
                              style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '90px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'inline-block' }}
                              value={editPeso} 
                              onChange={e => setEditPeso(e.target.value)} 
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.35rem', verticalAlign: 'middle' }}>
                            <div className="flex gap-1.5 justify-end items-center">
                              <button 
                                onClick={() => handleSaveInlineEdit(w.id)} 
                                style={{ backgroundColor: '#157a43', color: '#ffffff', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                                title="Salvar alterações"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => setEditId(null)} 
                                style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={w.id}>
                        <td style={{ fontWeight: 600 }}>{new Date(w.data).toLocaleDateString('pt-BR')}</td>
                        <td>{sectorMap[w.sector_id] || '-'}</td>
                        <td>
                          {categoryMap[w.category_id] ? (
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: `${categoryMap[w.category_id].color || '#10b981'}15`, 
                                color: categoryMap[w.category_id].color || '#10b981',
                                border: `1px solid ${categoryMap[w.category_id].color || '#10b981'}40`
                              }}
                            >
                              {categoryMap[w.category_id].name}
                            </span>
                          ) : '-'}
                        </td>
                        <td>{w.subcategory_id ? subMap[w.subcategory_id] || '-' : '-'}</td>
                        <td style={{ fontWeight: 600 }}>{typeMap[w.type_id]?.name || '-'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {w.classification_id ? classMap[w.classification_id] || '-' : '-'}
                        </td>
                        <td className="text-right font-semibold" style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                          {Number(w.peso_kg).toFixed(2)} kg
                        </td>
                        <td>
                          <div className="flex gap-1 justify-end">
                            <button 
                              onClick={() => handleStartInlineEdit(w)} 
                              className="btn btn-ghost btn-icon text-muted"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLaunch(w.id)} 
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
  );
};

export default GerenciarLancamentosReais;
