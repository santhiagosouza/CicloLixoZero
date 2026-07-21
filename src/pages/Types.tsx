import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight, Layers, Tag } from 'lucide-react';

interface Category { id: string; name: string }
interface Subcategory { id: string; category_id: string; name: string }
interface Classification { id: string; name: string }
interface Type {
  id: string;
  subcategory_id: string;
  name: string;
  color: string | null;
  default_classification_id: string | null;
  active: boolean;
  client_id: string;
}

const Types: React.FC = () => {
  const { clientId, isClientAdmin, isMasterAdmin } = useAuth();
  const canManage = isClientAdmin || isMasterAdmin;

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mappings
  const [subMap, setSubMap] = useState<Record<string, { name: string; catName: string }>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // Modal delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [catRes, subRes, classRes, typeRes] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, category_id, name').eq('active', true).order('name'),
        supabase.from('classifications').select('id, name').order('name'),
        supabase.from('types')
          .select('id, subcategory_id, name, color, default_classification_id, active, client_id')
          .eq('client_id', clientId)
          .order('name')
      ]);

      if (catRes.error) throw catRes.error;
      if (subRes.error) throw subRes.error;
      if (classRes.error) throw classRes.error;
      if (typeRes.error) throw typeRes.error;

      const cats = (catRes.data || []) as Category[];
      const subs = (subRes.data || []) as Subcategory[];
      const classes = (classRes.data || []) as Classification[];
      const typs = (typeRes.data || []) as Type[];

      setCategories(cats);
      setSubcategories(subs);
      setClassifications(classes);
      setTypes(typs);

      // Build mappings for display
      const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
      const sMap: Record<string, { name: string; catName: string }> = {};
      subs.forEach(s => {
        sMap[s.id] = { name: s.name, catName: catMap[s.category_id] || '—' };
      });
      setSubMap(sMap);
      setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));
    } catch (err: any) {
      console.error('Erro ao buscar tipos de resíduos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  // Reset Subcategory selection when Category changes
  useEffect(() => {
    setSelectedSubId('');
  }, [selectedCatId]);

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedSubId || !clientId || !selectedClassId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('types')
        .insert({
          client_id: clientId,
          subcategory_id: selectedSubId,
          name: name.trim(),
          color: color,
          default_classification_id: selectedClassId,
          active: true
        });

      if (error) {
        if (error.message.includes('unique')) {
          throw new Error('Já existe um tipo com este nome para esta subcategoria.');
        }
        throw error;
      }

      setName('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar tipo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (tp: Type) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('types')
        .update({ active: !tp.active })
        .eq('id', tp.id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteType = async (tid: string) => {
    try {
      const { error } = await supabase
        .from('types')
        .delete()
        .eq('id', tid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir este tipo pois já existem pesagens vinculadas a ele. Tente desativá-lo.');
        }
        throw error;
      }

      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tipo.');
    }
  };

  if (loading && types.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando tipos de resíduos...</p>
      </div>
    );
  }

  const filteredSubs = subcategories.filter(s => s.category_id === selectedCatId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Tipos de Resíduos</h1>
        <p className="text-muted text-sm font-medium">Gerencie e cadastre tipos personalizados de resíduos da sua operação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
        {/* CREATE TYPE FORM */}
        {canManage ? (
          <div className="card">
            <h2 className="card-title mb-4">Novo Tipo</h2>
            <form onSubmit={handleCreateType} className="flex flex-col gap-3">
              {errorMsg && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'hsl(var(--destructive))', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subcategoria</label>
                <select 
                  className="form-select" 
                  value={selectedSubId} 
                  onChange={e => setSelectedSubId(e.target.value)} 
                  disabled={!selectedCatId} 
                  required
                >
                  <option value="">Selecione...</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Classificação Normativa</label>
                <select className="form-select" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nome do Tipo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: PET Transparente, Latão" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  disabled={submitting || !selectedSubId}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Identificação Visual (Cor)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    className="form-color-picker" 
                    value={color} 
                    onChange={e => setColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ flex: 1 }} 
                    value={color} 
                    onChange={e => setColor(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || !selectedSubId}>
                <Plus size={16} />
                <span>Adicionar Tipo</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="card text-center text-muted" style={{ padding: '2rem 1rem' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
            <p className="text-sm">Apenas administradores de empresa podem cadastrar novos tipos de resíduos.</p>
          </div>
        )}

        {/* LIST TABLE CARD */}
        <div className="card md:col-span-2">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome do Tipo</th>
                  <th>Subcategoria</th>
                  <th>Categoria</th>
                  <th>Classificação</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                  {canManage && <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="text-center text-muted" style={{ padding: '4rem 0' }}>
                      Nenhum tipo de resíduo cadastrado.
                    </td>
                  </tr>
                ) : (
                  types.map(tp => {
                    const subInfo = subMap[tp.subcategory_id] || { name: '—', catName: '—' };
                    return (
                      <tr key={tp.id}>
                        <td className="font-semibold">
                          <span className="flex items-center gap-2">
                            <span 
                              style={{ 
                                width: '10px', 
                                height: '10px', 
                                borderRadius: '50%', 
                                backgroundColor: tp.color || '#ccc',
                                flexShrink: 0 
                              }} 
                            />
                            {tp.name}
                          </span>
                        </td>
                        <td>
                          <span className="flex items-center gap-1">
                            <Layers size={13} className="text-muted" />
                            {subInfo.name}
                          </span>
                        </td>
                        <td>
                          <span className="flex items-center gap-1">
                            <Tag size={13} className="text-muted" />
                            {subInfo.catName}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-semibold text-muted">
                            {classMap[tp.default_classification_id || ''] || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canManage ? (
                            <button 
                              onClick={() => handleToggleActive(tp)}
                              className="btn btn-ghost"
                              style={{ padding: '0.25rem' }}
                              title={tp.active ? 'Desativar Tipo' : 'Ativar Tipo'}
                            >
                              {tp.active ? (
                                <ToggleRight size={28} style={{ color: 'hsl(var(--primary))' }} />
                              ) : (
                                <ToggleLeft size={28} style={{ color: 'hsl(var(--muted-foreground))' }} />
                              )}
                            </button>
                          ) : (
                            <span className={`badge ${tp.active ? 'badge-success' : 'badge-secondary'}`}>
                              {tp.active ? 'Ativo' : 'Inativo'}
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => setDeleteConfirmId(tp.id)}
                              className="btn btn-ghost btn-icon"
                              style={{ color: 'hsl(var(--destructive))' }}
                              title="Excluir Tipo"
                            >
                              <Trash2 size={15} />
                            </button>
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
      </div>

      {/* DIALOG: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Tipo de Resíduo
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Tem certeza que deseja excluir permanentemente este tipo? Esta ação não pode ser desfeita e só terá sucesso se não houverem pesagens associadas.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteType(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Types;
