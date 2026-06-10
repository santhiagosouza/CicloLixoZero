import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, Tag, Layers, Settings, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Classification {
  id: string;
  name: string;
}

interface TypeRow {
  id: string;
  category_id: string;
  name: string;
  color: string | null;
  default_classification_id: string | null;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação e Filtros
  const [activeTab, setActiveTab] = useState<'categories' | 'types' | 'subcategories'>('categories');
  const [filterCatId, setFilterCatId] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');

  // Form states - Category
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#22c55e');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Form states - Type
  const [typeName, setTypeName] = useState('');
  const [typeColor, setTypeColor] = useState('');
  const [typeClassId, setTypeClassId] = useState('');
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  // Form states - Subcategory
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [subName, setSubName] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Mappings
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // Delete modals state
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, classRes, typeRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('classifications').select('id, name').order('name'),
        supabase.from('types').select('*').order('name')
      ]);

      if (catRes.error) throw catRes.error;
      if (classRes.error) throw classRes.error;
      if (typeRes.error) throw typeRes.error;

      const cats = (catRes.data || []) as Category[];
      const classes = (classRes.data || []) as Classification[];
      const typs = (typeRes.data || []) as TypeRow[];

      setCategories(cats);
      setClassifications(classes);
      setTypes(typs);

      setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));
    } catch (err: any) {
      console.error('Erro ao buscar categorias e tipos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (typeId: string) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('type_id', typeId)
        .is('client_id', null)
        .order('name');
      if (error) throw error;
      setSubcategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar subcategorias padrão:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Buscar subcategorias quando o tipo de filtro mudar
  useEffect(() => {
    if (filterTypeId) {
      fetchSubcategories(filterTypeId);
    } else {
      setSubcategories([]);
    }
  }, [filterTypeId]);

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

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim() || !filterCatId) return;

    setTypeSubmitting(true);
    try {
      const { error } = await supabase
        .from('types')
        .insert({
          category_id: filterCatId,
          name: typeName.trim(),
          color: typeColor.trim() || null,
          default_classification_id: typeClassId || null
        });

      if (error) throw error;
      setTypeName('');
      setTypeColor('');
      setTypeClassId('');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar tipo: ' + err.message);
    } finally {
      setTypeSubmitting(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !filterTypeId) return;
    setSubSubmitting(true);
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          type_id: filterTypeId,
          name: subName.trim(),
          client_id: null
        });
      if (error) throw error;
      setSubName('');
      fetchSubcategories(filterTypeId);
    } catch (err: any) {
      alert('Erro ao criar subcategoria padrão: ' + err.message);
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
          throw new Error('Não é possível excluir esta categoria pois ela possui tipos de resíduos ou pesagens vinculados.');
        }
        throw error;
      }
      if (filterCatId === cid) {
        setFilterCatId('');
      }
      setDeleteCatId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria.');
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
          throw new Error('Não é possível excluir este tipo de resíduo pois existem subcategorias ou pesagens vinculadas a ele.');
        }
        throw error;
      }
      if (filterTypeId === tid) {
        setFilterTypeId('');
      }
      setDeleteTypeId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tipo.');
    }
  };

  const handleDeleteSubcategory = async (subId: string) => {
    if (!confirm('Deseja realmente excluir esta subcategoria padrão global?')) return;
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subId);
      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir esta subcategoria padrão pois ela já está em uso em pesagens de clientes.');
        }
        throw error;
      }
      if (filterTypeId) {
        fetchSubcategories(filterTypeId);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir subcategoria.');
    }
  };

  const handleUpdateCategoryColor = async (id: string, color: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ color })
        .eq('id', id);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao atualizar cor da categoria: ' + err.message);
    }
  };

  const handleUpdateTypeColor = async (id: string, color: string) => {
    try {
      const { error } = await supabase
        .from('types')
        .update({ color })
        .eq('id', id);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao atualizar cor do tipo: ' + err.message);
    }
  };

  // Redirecionamento assistido de fluxo
  const handleSelectCategoryFlow = (catId: string) => {
    setFilterCatId(catId);
    setFilterTypeId('');
    setActiveTab('types');
  };

  const handleSelectTypeFlow = (typeId: string) => {
    setFilterTypeId(typeId);
    setActiveTab('subcategories');
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando categorias...</p>
      </div>
    );
  }

  const filteredTypes = filterCatId ? types.filter(t => t.category_id === filterCatId) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Categorias e Tipos de Resíduos</h1>
        <p className="text-muted text-sm font-medium">Configure a estrutura de resíduos de 4 níveis da plataforma</p>
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
          className={`btn ${activeTab === 'types' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('types')}
        >
          <Layers size={16} />
          <span>2. Tipos de Resíduos</span>
          {filterCatId && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '0.25rem' }}>
              ({categories.find(c => c.id === filterCatId)?.name})
            </span>
          )}
        </button>
        <button 
          className={`btn ${activeTab === 'subcategories' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('subcategories')}
        >
          <Settings size={16} />
          <span>3. Subcategorias Padrão</span>
          {filterTypeId && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '0.25rem' }}>
              ({types.find(t => t.id === filterTypeId)?.name})
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
                              <span>Ver Tipos</span>
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

        {/* ABA 2: TIPOS DE RESÍDUOS */}
        {activeTab === 'types' && (
          <div className="flex flex-col gap-4">
            {/* Seletor da Categoria Ativa no topo */}
            <div className="card flex flex-row items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.01)' }}>
              <label className="form-label font-semibold" style={{ marginBottom: 0 }}>Gerenciando Tipos da Categoria:</label>
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
                {/* Create Type */}
                <div className="card">
                  <h2 className="card-title mb-4">Novo Tipo de Material</h2>
                  <form onSubmit={handleCreateType} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Nome do Tipo</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: Plástico, Papel, Vidro" 
                        value={typeName} 
                        onChange={e => setTypeName(e.target.value)} 
                        required 
                        disabled={typeSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Classificação Legal Padrão</label>
                      <select 
                        className="form-select" 
                        value={typeClassId} 
                        onChange={e => setTypeClassId(e.target.value)}
                        required
                        disabled={typeSubmitting}
                      >
                        <option value="">Selecione...</option>
                        {classifications.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                      </select>
                      <p className="text-xs text-muted mt-1">Ao lançar a pesagem, o sistema autocompleta com este enquadramento padrão.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cor Opcional (Hexadecimal)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: #3b82f6 (Deixe vazio para herdar da categoria)" 
                        value={typeColor} 
                        onChange={e => setTypeColor(e.target.value)} 
                        disabled={typeSubmitting}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={typeSubmitting}>
                      <Plus size={16} />
                      <span>Cadastrar Tipo</span>
                    </button>
                  </form>
                </div>

                {/* Types List */}
                <div className="card lg:col-span-2">
                  <h2 className="card-title mb-4">Tipos vinculados a: {categories.find(c => c.id === filterCatId)?.name}</h2>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome do Tipo</th>
                          <th>Classificação Padrão</th>
                          <th style={{ width: '70px' }}>Cor</th>
                          <th style={{ width: '220px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTypes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                              Nenhum tipo de resíduo cadastrado nesta categoria.
                            </td>
                          </tr>
                        ) : (
                          filteredTypes.map(t => {
                            const parentCat = categories.find(c => c.id === filterCatId);
                            const displayColor = t.color || parentCat?.color || '#ccc';
                            return (
                              <tr key={t.id} className="hoverable-row">
                                <td className="font-semibold text-sm">
                                  <span className="flex items-center gap-2">
                                    <Layers size={14} style={{ color: displayColor }} />
                                    {t.name}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-xs font-semibold text-muted">{classMap[t.default_classification_id || ''] || '—'}</span>
                                </td>
                                <td>
                                  <div 
                                    style={{
                                      position: 'relative',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      backgroundColor: displayColor,
                                      border: '1px solid hsl(var(--card-border))',
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      display: 'inline-block'
                                    }}
                                    title="Clique para editar a cor do tipo"
                                  >
                                    <input 
                                      type="color"
                                      value={t.color || parentCat?.color || '#cccccc'}
                                      onChange={e => handleUpdateTypeColor(t.id, e.target.value)}
                                      style={{
                                        position: 'absolute',
                                        top: '-5px',
                                        left: '-5px',
                                        width: '34px',
                                        height: '34px',
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
                                      onClick={() => handleSelectTypeFlow(t.id)}
                                      className="btn btn-secondary flex items-center gap-1"
                                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                                    >
                                      <span>Ver Subcategorias</span>
                                      <ChevronRight size={14} />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteTypeId(t.id)} 
                                      className="btn btn-ghost btn-icon" 
                                      style={{ color: 'hsl(var(--destructive))' }}
                                      title="Excluir Tipo"
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
              </div>
            ) : (
              <div className="card text-center flex flex-col items-center justify-center" style={{ minHeight: '350px', borderStyle: 'dashed', padding: '2rem' }}>
                <Layers size={36} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tipos de Resíduos</h3>
                <p className="text-muted text-xs mt-2">
                  Selecione uma categoria global no seletor acima para carregar a listagem e o cadastro de tipos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: SUBCATEGORIAS PADRÃO */}
        {activeTab === 'subcategories' && (
          <div className="flex flex-col gap-4">
            {/* Seletor do Tipo Ativo no topo */}
            <div className="card flex flex-row items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.01)' }}>
              <label className="form-label font-semibold" style={{ marginBottom: 0 }}>Gerenciando Subcategorias do Tipo:</label>
              <select 
                className="form-select" 
                style={{ maxWidth: '320px', marginBottom: 0 }}
                value={filterTypeId}
                onChange={e => setFilterTypeId(e.target.value)}
              >
                <option value="">Selecione um tipo de material...</option>
                {types.map(t => {
                  const catName = categories.find(c => c.id === t.category_id)?.name || '';
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} {catName ? `(${catName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {filterTypeId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
                {/* Create Subcategory */}
                <div className="card">
                  <h2 className="card-title mb-4">Nova Subcategoria Padrão</h2>
                  <form onSubmit={handleCreateSubcategory} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Nome da Subcategoria</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: Copo Descartável, Garrafa PET" 
                        value={subName} 
                        onChange={e => setSubName(e.target.value)} 
                        required 
                        disabled={subSubmitting}
                      />
                    </div>
                    <p className="text-xs text-muted">Esta subcategoria será criada por padrão no painel de todos os clientes, mas cada um deles poderá ativá-la, desativá-la ou editá-la individualmente.</p>
                    <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={subSubmitting}>
                      <Plus size={16} />
                      <span>Cadastrar Subcategoria</span>
                    </button>
                  </form>
                </div>

                {/* Subcategories List */}
                <div className="card lg:col-span-2">
                  <h2 className="card-title mb-4">Subcategorias padrões em: {types.find(t => t.id === filterTypeId)?.name}</h2>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome da Subcategoria</th>
                          <th style={{ width: '100px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subcategories.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                              Nenhuma subcategoria padrão global cadastrada para este tipo.
                            </td>
                          </tr>
                        ) : (
                          subcategories.map(sub => (
                            <tr key={sub.id} className="hoverable-row">
                              <td className="font-semibold text-sm">{sub.name}</td>
                              <td className="text-right">
                                <button 
                                  onClick={() => handleDeleteSubcategory(sub.id)} 
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
                <Settings size={36} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Subcategorias Padrão</h3>
                <p className="text-muted text-xs mt-2">
                  Selecione um tipo de material no seletor acima para gerenciar suas subcategorias padrão globais.
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
              Deseja realmente excluir esta categoria global? Esta ação só terá sucesso se não houverem pesagens ou tipos de resíduos vinculados a ela.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteCatId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteCategory(deleteCatId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE TYPE */}
      {deleteTypeId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Tipo de Resíduo
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir este tipo de material? Esta ação apagará todas as subcategorias vinculadas e só terá sucesso se não houverem pesagens cadastradas.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteTypeId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteType(deleteTypeId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
