import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, Tag, Layers, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  active: boolean;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação e Filtros
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');
  const [filterCatId, setFilterCatId] = useState('');

  // Form states - Category
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#22c55e');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Form states - Subcategory
  const [subName, setSubName] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Delete modals state
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name')
      ]);

      if (catRes.error) throw catRes.error;
      if (subRes.error) throw subRes.error;

      setCategories((catRes.data || []) as Category[]);
      setSubcategories((subRes.data || []) as SubcategoryRow[]);
    } catch (err: any) {
      console.error('Erro ao buscar categorias e subcategorias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setCatSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: catName.trim(),
          color: catColor
        });

      if (error) throw error;
      setCatName('');
      setCatColor('#22c55e');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + err.message);
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !filterCatId) return;
    setSubSubmitting(true);
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          category_id: filterCatId,
          name: subName.trim(),
          active: true
        });
      if (error) throw error;
      setSubName('');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar subcategoria global: ' + err.message);
    } finally {
      setSubSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cid: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', cid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir esta categoria pois ela possui subcategorias ou pesagens vinculadas.');
        }
        throw error;
      }
      setDeleteCatId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria.');
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
          throw new Error('Não é possível excluir esta subcategoria pois ela possui tipos de resíduos ou pesagens vinculados.');
        }
        throw error;
      }
      setDeleteSubId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir subcategoria.');
    }
  };

  const handleUpdateCategoryColor = async (cid: string, colorHex: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ color: colorHex })
        .eq('id', cid);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao atualizar cor: ' + err.message);
    }
  };

  const handleSelectCategoryFlow = (cid: string) => {
    setFilterCatId(cid);
    setActiveTab('subcategories');
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando estrutura de resíduos...</p>
      </div>
    );
  }

  const filteredSubs = filterCatId ? subcategories.filter(s => s.category_id === filterCatId) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Categorias e Subcategorias</h1>
        <p className="text-muted text-sm font-medium">Configure a estrutura global de resíduos (L1 e L2) da plataforma</p>
      </div>

      {/* TABS DE NAVEGAÇÃO VERTICALIZADA */}
      <div 
        className="flex gap-2" 
        style={{ 
          borderBottom: '1px solid hsl(var(--card-border))', 
          paddingBottom: '0.25rem',
          marginTop: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <button 
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} />
          <span>1. Categorias Globais</span>
        </button>
        <button 
          className={`btn ${activeTab === 'subcategories' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('subcategories')}
        >
          <Layers size={16} />
          <span>2. Subcategorias Globais</span>
          {filterCatId && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '0.25rem' }}>
              ({categories.find(c => c.id === filterCatId)?.name})
            </span>
          )}
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{ marginTop: '0.5rem' }}>
        
        {/* ABA 1: CATEGORIAS */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
            {/* Create Category */}
            <div className="card">
              <h2 className="card-title mb-4">Nova Categoria Global</h2>
              <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Nome da Categoria</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Rejeito, Orgânico" 
                    value={catName} 
                    onChange={e => setCatName(e.target.value)} 
                    required 
                    disabled={catSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cor de Referência</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      className="form-input" 
                      style={{ padding: '0.2rem', height: '41px', width: '60px', cursor: 'pointer' }}
                      value={catColor} 
                      onChange={e => setCatColor(e.target.value)} 
                      disabled={catSubmitting}
                    />
                    <span className="text-xs text-muted">Cor usada nos gráficos e relatórios</span>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={catSubmitting}>
                  <Plus size={16} />
                  <span>Cadastrar Categoria</span>
                </button>
              </form>
            </div>

            {/* Categories List */}
            <div className="card lg:col-span-2">
              <h2 className="card-title mb-4">Categorias Cadastradas</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome da Categoria</th>
                      <th style={{ width: '80px' }}>Cor</th>
                      <th style={{ width: '220px', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id} className="hoverable-row">
                        <td className="font-bold">
                          <span className="flex items-center gap-2">
                            <Tag size={15} style={{ color: c.color || '#888' }} />
                            {c.name}
                          </span>
                        </td>
                        <td>
                          <div 
                            style={{
                              position: 'relative',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: c.color || '#cccccc',
                              border: '1px solid hsl(var(--card-border))',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              display: 'inline-block'
                            }}
                            title="Clique para editar a cor da categoria"
                          >
                            <input 
                              type="color"
                              value={c.color || '#cccccc'}
                              onChange={e => handleUpdateCategoryColor(c.id, e.target.value)}
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                left: '-5px',
                                width: '38px',
                                height: '38px',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                cursor: 'pointer',
                                opacity: 0
                              }}
                            />
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleSelectCategoryFlow(c.id)}
                              className="btn btn-secondary flex items-center gap-1"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                            >
                              <span>Ver Subcategorias</span>
                              <ChevronRight size={14} />
                            </button>
                            <button 
                              onClick={() => setDeleteCatId(c.id)} 
                              className="btn btn-ghost btn-icon" 
                              style={{ color: 'hsl(var(--destructive))' }}
                              title="Excluir Categoria"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: SUBCATEGORIAS */}
        {activeTab === 'subcategories' && (
          <div className="flex flex-col gap-4">
            {/* Seletor da Categoria Ativa no topo */}
            <div className="card flex flex-row items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.01)' }}>
              <label className="form-label font-semibold" style={{ marginBottom: 0 }}>Gerenciando Subcategorias da Categoria:</label>
              <select 
                className="form-select" 
                style={{ maxWidth: '320px', marginBottom: 0 }}
                value={filterCatId}
                onChange={e => setFilterCatId(e.target.value)}
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {filterCatId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
                {/* Create Subcategory */}
                <div className="card">
                  <h2 className="card-title mb-4">Nova Subcategoria</h2>
                  <form onSubmit={handleCreateSubcategory} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Nome da Subcategoria</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: Papel, Plástico Rígido, Vidro" 
                        value={subName} 
                        onChange={e => setSubName(e.target.value)} 
                        required 
                        disabled={subSubmitting}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={subSubmitting}>
                      <Plus size={16} />
                      <span>Cadastrar Subcategoria</span>
                    </button>
                  </form>
                </div>

                {/* Subcategories List */}
                <div className="card lg:col-span-2">
                  <h2 className="card-title mb-4">Subcategorias vinculadas a: {categories.find(c => c.id === filterCatId)?.name}</h2>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome da Subcategoria</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubs.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                              Nenhuma subcategoria cadastrada nesta categoria.
                            </td>
                          </tr>
                        ) : (
                          filteredSubs.map(s => (
                            <tr key={s.id} className="hoverable-row">
                              <td className="font-semibold text-sm">
                                <span className="flex items-center gap-2">
                                  <Layers size={14} className="text-muted" />
                                  {s.name}
                                </span>
                              </td>
                              <td className="text-right">
                                <button 
                                  onClick={() => setDeleteSubId(s.id)} 
                                  className="btn btn-ghost btn-icon" 
                                  style={{ color: 'hsl(var(--destructive))' }}
                                  title="Excluir Subcategoria"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center flex flex-col items-center justify-center" style={{ minHeight: '350px', borderStyle: 'dashed', padding: '2rem' }}>
                <Layers size={36} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Subcategorias</h3>
                <p className="text-muted text-xs mt-2">
                  Selecione uma categoria global no seletor acima para carregar a listagem e o cadastro de subcategorias.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* CONFIRM MODAL: DELETE CATEGORY */}
      {deleteCatId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Categoria
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir esta categoria global? Esta ação só terá sucesso se não houverem pesagens ou subcategorias vinculadas a ela.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteCatId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteCategory(deleteCatId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE SUBCATEGORY */}
      {deleteSubId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Subcategoria
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir esta subcategoria? Esta ação só terá sucesso se não houverem tipos de resíduos ou pesagens vinculados a ela.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteSubId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteSubcategory(deleteSubId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
