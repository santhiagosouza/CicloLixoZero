import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle,
  Calendar,
  Leaf,
  Recycle,
  Ban,
  Scale
} from 'lucide-react';

interface Weighing {
  id: string;
  gravimetria_id: string;
  data: string;
  sector_id: string;
  category_id: string;
  type_id: string;
  subcategory_id: string;
  classification_id: string;
  peso_kg: number;
}

interface Sector {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Type {
  id: string;
  subcategory_id: string;
  name: string;
  color: string;
  default_classification_id: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

interface Classification {
  id: string;
  name: string;
}

const EditarLancamentos: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isClientAdmin, isMasterAdmin } = useAuth();
  const canEdit = isClientAdmin || isMasterAdmin;

  const [grav, setGrav] = useState<any>(null);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Aux configurations
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

  // Inline Edit states
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPeso, setEditPeso] = useState('');

  // Delete dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) {
      navigate(`/gravimetria/${id}`);
      return;
    }
  }, [canEdit, id, navigate]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const gRes = await supabase
          .from('gravimetrias')
          .select('*, clients(name)')
          .eq('id', id)
          .maybeSingle();

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
        console.error('Erro ao buscar dados para edição:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, reloadKey]);

  const editFilteredSubs = subcategories.filter(s => s.category_id === editCategory);
  const editFilteredTypes = types.filter(t => t.subcategory_id === editSub);

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

  const handleEditSubChange = (sid: string) => {
    setEditSub(sid);
    setEditType('');
    setEditClass('');
  };

  const handleEditTypeChange = (tid: string) => {
    setEditType(tid);
    const selectedT = types.find(t => t.id === tid);
    if (selectedT && selectedT.default_classification_id) {
      setEditClass(selectedT.default_classification_id);
    } else {
      setEditClass('');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando lançamentos...</p>
      </div>
    );
  }

  if (!grav) {
    return (
      <div className="card text-center" style={{ margin: '3rem auto', maxWidth: '500px' }}>
        <h2 style={{ color: 'hsl(var(--destructive))' }}>Gravimetria não encontrada</h2>
        <p className="text-muted mt-2">O código do estudo especificado não existe ou você não possui permissão.</p>
        <Link to="/" className="btn btn-primary mt-4">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-3">
          <Link to={`/gravimetria/${id}`} className="btn btn-ghost btn-icon" style={{ borderRadius: 'var(--radius-md)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Editar Lançamentos
            </h1>
            <p className="text-muted text-sm flex items-center gap-2 mt-1">
              Arquivo {String(grav.numero).padStart(2, '0')}
              <span className="text-muted" style={{ opacity: 0.5 }}>•</span>
              <Calendar size={13} />
              <span>{new Date(grav.started_at).toLocaleDateString('pt-BR')} — {grav.ended_at ? new Date(grav.ended_at).toLocaleDateString('pt-BR') : 'Em andamento'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem' }}>
          <p className="card-description">Edite pesagens realizadas neste estudo ou exclua lançamentos incorretos</p>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Setor</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Tipo</th>
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
                            <option value="">Selecione...</option>
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem 0.35rem' }}>
                          <select 
                            className="form-select" 
                            style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                            value={editCategory} 
                            onChange={e => { setEditCategory(e.target.value); handleEditSubChange(''); }}
                          >
                            <option value="">Selecione...</option>
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
                            {editFilteredSubs.map((s: Subcategory) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                            {editFilteredTypes.map((t: Type) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                            min="0.001" 
                            className="form-input text-right font-semibold" 
                            style={{ height: '34px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '80px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'inline-block' }}
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

                  const catColor = categoryMap[w.category_id]?.color || '#888';
                  const catName = (categoryMap[w.category_id]?.name || '').toLowerCase();
                  const CategoryIcon = catName.includes('orgân') ? Leaf 
                    : catName.includes('recicl') ? Recycle 
                    : catName.includes('perig') ? AlertTriangle 
                    : catName.includes('rejeit') ? Ban 
                    : Scale;
                  return (
                    <tr key={w.id}>
                      <td>{new Date(w.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td><span className="font-medium">{sectorMap[w.sector_id] || '—'}</span></td>
                      <td>
                        <span className="flex items-center font-medium" style={{ gap: '0.5rem' }}>
                          <CategoryIcon size={14} style={{ color: catColor }} />
                          {categoryMap[w.category_id]?.name || '—'}
                        </span>
                      </td>
                      <td>{subMap[w.subcategory_id] || '—'}</td>
                      <td>{typeMap[w.type_id]?.name || '—'}</td>
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
    </div>
  );
};

export default EditarLancamentos;
