import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';

interface Category { id: string; name: string }
interface Type { id: string; category_id: string; name: string }
interface Subcategory {
  id: string;
  type_id: string;
  name: string;
  active: boolean;
  client_id: string | null;
}

const Subcategories: React.FC = () => {
  const { clientId, isClientAdmin, isMasterAdmin } = useAuth();
  const canManage = isClientAdmin || isMasterAdmin;

  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mappings
  const [typeMap, setTypeMap] = useState<Record<string, { name: string; catName: string }>>({});

  // Modal delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [catRes, typeRes, subRes] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('types').select('id, category_id, name').order('name'),
        supabase.from('subcategories')
          .select('id, type_id, name, active, client_id')
          .or(`client_id.is.null,client_id.eq.${clientId}`)
          .order('name')
      ]);

      if (catRes.error) throw catRes.error;
      if (typeRes.error) throw typeRes.error;
      if (subRes.error) throw subRes.error;

      const cats = (catRes.data || []) as Category[];
      const typs = (typeRes.data || []) as Type[];
      const subs = (subRes.data || []) as Subcategory[];

      setCategories(cats);
      setTypes(typs);
      setSubcategories(subs);

      // Build mapping for display
      const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
      const tMap: Record<string, { name: string; catName: string }> = {};
      typs.forEach(t => {
        tMap[t.id] = { name: t.name, catName: catMap[t.category_id] || '—' };
      });
      setTypeMap(tMap);
    } catch (err: any) {
      console.error('Erro ao buscar subcategorias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  // Reset Type selection when Category changes
  useEffect(() => {
    setSelectedTypeId('');
  }, [selectedCatId]);

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedTypeId || !clientId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          client_id: clientId,
          type_id: selectedTypeId,
          name: name.trim(),
          active: true
        });

      if (error) {
        if (error.message.includes('unique')) {
          throw new Error('Já existe uma subcategoria com este nome para este tipo de material.');
        }
        throw error;
      }

      setName('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar subcategoria.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (sub: Subcategory) => {
    if (!canManage || !sub.client_id) return; // Cannot alter global default subcategories
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({ active: !sub.active })
        .eq('id', sub.id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteSubcategory = async (sid: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', sid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir esta subcategoria pois já existem pesagens vinculadas a ela. Tente desativá-la.');
        }
        throw error;
      }

      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir subcategoria.');
    }
  };

  if (loading && subcategories.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando subcategorias...</p>
      </div>
    );
  }

  const filteredTypes = types.filter(t => t.category_id === selectedCatId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Gerenciamento de Subcategorias</h1>
        <p className="text-muted text-sm font-medium">Cadastre subcategorias personalizadas vinculadas aos tipos globais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
        {/* CREATE SUBCATEGORY FORM */}
        {canManage ? (
          <div className="card">
            <h2 className="card-title mb-4">Nova Subcategoria</h2>
            <form onSubmit={handleCreateSubcategory} className="flex flex-col gap-3">
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
                <label className="form-label">Tipo de Material</label>
                <select 
                  className="form-select" 
                  value={selectedTypeId} 
                  onChange={e => setSelectedTypeId(e.target.value)} 
                  disabled={!selectedCatId} 
                  required
                >
                  <option value="">Selecione...</option>
                  {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nome da Subcategoria</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Copo PP, Papel Kraft" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  disabled={submitting || !selectedTypeId}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || !selectedTypeId}>
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            <p className="text-muted text-sm">Apenas administradores podem cadastrar novas subcategorias de materiais.</p>
          </div>
        )}

        {/* LIST TABLE OF SUBCATEGORIES */}
        <div className="card md:col-span-2">
          <h2 className="card-title">Subcategorias Disponíveis</h2>
          <p className="card-description mb-4">Lista que engloba as subcategorias padrões globais e as personalizadas criadas por você</p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Status</th>
                  {canManage && <th style={{ width: '120px', textAlign: 'right' }} />}
                </tr>
              </thead>
              <tbody>
                {subcategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '2.5rem 0' }}>
                      Nenhuma subcategoria cadastrada.
                    </td>
                  </tr>
                ) : (
                  subcategories.map(s => {
                    const isGlobal = s.client_id === null;
                    const typeInfo = typeMap[s.type_id] || { name: '—', catName: '—' };
                    
                    return (
                      <tr key={s.id}>
                        <td className="font-semibold">{s.name}</td>
                        <td><span className="text-sm font-medium">{typeInfo.catName}</span></td>
                        <td>{typeInfo.name}</td>
                        <td>
                          <span className={`badge ${isGlobal ? 'badge-info' : 'badge-default'}`}>
                            {isGlobal ? 'Padrão Sistema' : 'Personalizada'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.active ? 'badge-success' : 'badge-default'}`}>
                            {s.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            {!isGlobal ? (
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={() => handleToggleActive(s)} 
                                  className="btn btn-ghost btn-icon"
                                  title={s.active ? 'Desativar' : 'Ativar'}
                                >
                                  {s.active ? <ToggleRight size={20} style={{ color: 'hsl(var(--primary))' }} /> : <ToggleLeft size={20} />}
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(s.id)} 
                                  className="btn btn-ghost btn-icon"
                                  style={{ color: 'hsl(var(--destructive))' }}
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="text-right text-muted text-xs font-semibold" style={{ paddingRight: '0.75rem' }}>
                                Bloqueada
                              </div>
                            )}
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

      {/* CONFIRM MODAL: DELETE SUBCATEGORY */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Subcategoria
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Tem certeza que deseja excluir esta subcategoria personalizada permanentemente? Esta ação só terá sucesso se não houverem pesagens vinculadas.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteSubcategory(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subcategories;
