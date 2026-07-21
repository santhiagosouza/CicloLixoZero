import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, Tag, Layers, Settings, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';

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

interface Classification {
  id: string;
  name: string;
}

interface DefaultTypeRow {
  id: string;
  subcategory_id: string;
  name: string;
  color: string | null;
  default_classification_id: string | null;
  active: boolean;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [defaultTypes, setDefaultTypes] = useState<DefaultTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação e Filtros
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'default_types'>('categories');
  const [filterCatId, setFilterCatId] = useState('');
  const [filterSubId, setFilterSubId] = useState('');

  // Form states - Category
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#22c55e');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Form states - Subcategory
  const [subName, setSubName] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Form states - Default Type
  const [defTypeName, setDefTypeName] = useState('');
  const [defTypeColor, setDefTypeColor] = useState('#3b82f6');
  const [defTypeClassId, setDefTypeClassId] = useState('');
  const [defTypeSubmitting, setDefTypeSubmitting] = useState(false);

  // Mappings
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [subMap, setSubMap] = useState<Record<string, { name: string; catName: string }>>({});

  // Delete modals state
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);
  const [deleteDefTypeId, setDeleteDefTypeId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, subRes, classRes, defTypeRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name'),
        supabase.from('classifications').select('id, name').order('name'),
        supabase.from('default_types').select('*').order('name')
      ]);

      if (catRes.error) throw catRes.error;
      if (subRes.error) throw subRes.error;
      if (classRes.error) throw classRes.error;
      if (defTypeRes.error) throw defTypeRes.error;

      const cats = (catRes.data || []) as Category[];
      const subs = (subRes.data || []) as SubcategoryRow[];
      const classes = (classRes.data || []) as Classification[];
      const defTypes = (defTypeRes.data || []) as DefaultTypeRow[];

      setCategories(cats);
      setSubcategories(subs);
      setClassifications(classes);
      setDefaultTypes(defTypes);

      setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])));
      
      const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
      const sMap: Record<string, { name: string; catName: string }> = {};
      subs.forEach(s => {
        sMap[s.id] = { name: s.name, catName: catMap[s.category_id] || '—' };
      });
      setSubMap(sMap);
    } catch (err: any) {
      console.error('Erro ao buscar dados iniciais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset subcategory selection in default types tab when category filter changes
  useEffect(() => {
    setFilterSubId('');
  }, [filterCatId]);

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

  const handleCreateDefaultType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defTypeName.trim() || !filterSubId || !defTypeClassId) return;
    setDefTypeSubmitting(true);
    try {
      const { error } = await supabase
        .from('default_types')
        .insert({
          subcategory_id: filterSubId,
          name: defTypeName.trim(),
          color: defTypeColor,
          default_classification_id: defTypeClassId,
          active: true
        });
      if (error) throw error;
      setDefTypeName('');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar tipo padrão: ' + err.message);
    } finally {
      setDefTypeSubmitting(false);
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

  const handleDeleteDefaultType = async (dtid: string) => {
    try {
      const { error } = await supabase
        .from('default_types')
        .delete()
        .eq('id', dtid);

      if (error) throw error;
      setDeleteDefTypeId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tipo padrão.');
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

  const handleUpdateDefaultTypeColor = async (dtid: string, colorHex: string) => {
    try {
      const { error } = await supabase
        .from('default_types')
        .update({ color: colorHex })
        .eq('id', dtid);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao atualizar cor do tipo padrão: ' + err.message);
    }
  };

  const handleToggleDefaultTypeActive = async (dt: DefaultTypeRow) => {
    try {
      const { error } = await supabase
        .from('default_types')
        .update({ active: !dt.active })
        .eq('id', dt.id);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao alterar status do tipo padrão: ' + err.message);
    }
  };

  const handleSelectCategoryFlow = (cid: string) => {
    setFilterCatId(cid);
    setActiveTab('subcategories');
  };

  const handleSelectSubcategoryFlow = (sid: string, cid: string) => {
    setFilterCatId(cid);
    setFilterSubId(sid);
    setActiveTab('default_types');
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando estrutura de resíduos...</p>
      </div>
    );
  }

  const filteredSubs = filterCatId ? subcategories.filter(s => s.category_id === filterCatId) : [];
  const filteredDefTypes = filterSubId ? defaultTypes.filter(t => t.subcategory_id === filterSubId) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Estrutura de Resíduos</h1>
        <p className="text-muted text-sm font-medium">Configure a taxonomia global (Categorias, Subcategorias e Sementes de Tipos) da plataforma</p>
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
        <button 
          className={`btn ${activeTab === 'default_types' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('default_types')}
        >
          <Settings size={16} />
          <span>3. Tipos Padrão (Seed)</span>
          {filterSubId && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '0.25rem' }}>
              ({subMap[filterSubId]?.name})
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
                      style={{ padding: '0.2,rem', height: '41px', width: '60px', cursor: 'pointer' }}
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
                          <th style={{ width: '220px', textAlign: 'right' }}>Ações</th>
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
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    onClick={() => handleSelectSubcategoryFlow(s.id, filterCatId)}
                                    className="btn btn-secondary flex items-center gap-1"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                                  >
                                    <span>Ver Tipos Padrão</span>
                                    <ChevronRight size={14} />
                                  </button>
                                  <button 
                                    onClick={() => setDeleteSubId(s.id)} 
                                    className="btn btn-ghost btn-icon" 
                                    style={{ color: 'hsl(var(--destructive))' }}
                                    title="Excluir Subcategoria"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
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

        {/* ABA 3: TIPOS PADRÃO (SEED) */}
        {activeTab === 'default_types' && (
          <div className="flex flex-col gap-4">
            <div className="card grid grid-cols-1 md:grid-cols-2 gap-4" style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.01)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label font-semibold">1. Filtrar por Categoria:</label>
                <select 
                  className="form-select" 
                  value={filterCatId} 
                  onChange={e => setFilterCatId(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label font-semibold">2. Filtrar por Subcategoria:</label>
                <select 
                  className="form-select" 
                  value={filterSubId} 
                  onChange={e => setFilterSubId(e.target.value)}
                  disabled={!filterCatId}
                  style={{ marginBottom: 0 }}
                >
                  <option value="">Selecione uma subcategoria...</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {filterSubId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
                {/* Create Default Type */}
                <div className="card">
                  <h2 className="card-title mb-4">Novo Tipo Padrão (Seed)</h2>
                  <form onSubmit={handleCreateDefaultType} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Nome do Tipo Padrão</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: PET Transparente, Papelão" 
                        value={defTypeName} 
                        onChange={e => setDefTypeName(e.target.value)} 
                        required 
                        disabled={defTypeSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Classificação Normativa Padrão</label>
                      <select 
                        className="form-select" 
                        value={defTypeClassId} 
                        onChange={e => setDefTypeClassId(e.target.value)} 
                        required
                        disabled={defTypeSubmitting}
                      >
                        <option value="">Selecione...</option>
                        {classifications.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cor de Referência</label>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color" 
                          className="form-input" 
                          style={{ padding: '0.2rem', height: '41px', width: '60px', cursor: 'pointer' }}
                          value={defTypeColor} 
                          onChange={e => setDefTypeColor(e.target.value)} 
                          disabled={defTypeSubmitting}
                        />
                        <span className="text-xs text-muted">Cor herdada no primeiro login da empresa</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted">Novos tipos padrão cadastrados aqui servirão de sementes ("seed") automáticas para todas as novas empresas clientes que se cadastrarem.</p>
                    
                    <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={defTypeSubmitting}>
                      <Plus size={16} />
                      <span>Cadastrar Tipo Padrão</span>
                    </button>
                  </form>
                </div>

                {/* Default Types List */}
                <div className="card lg:col-span-2">
                  <h2 className="card-title mb-4">Tipos Padrão em: {subMap[filterSubId]?.name}</h2>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome do Tipo Padrão</th>
                          <th>Classificação</th>
                          <th style={{ width: '80px' }}>Cor</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Ativo</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDefTypes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                              Nenhum tipo de resíduo padrão cadastrado nesta subcategoria.
                            </td>
                          </tr>
                        ) : (
                          filteredDefTypes.map(dt => (
                            <tr key={dt.id} className="hoverable-row">
                              <td className="font-semibold text-sm">
                                <span className="flex items-center gap-2">
                                  <span 
                                    style={{ 
                                      width: '10px', 
                                      height: '10px', 
                                      borderRadius: '50%', 
                                      backgroundColor: dt.color || '#ccc',
                                      flexShrink: 0 
                                    }} 
                                  />
                                  {dt.name}
                                </span>
                              </td>
                              <td>
                                <span className="text-xs font-semibold text-muted">
                                  {classMap[dt.default_classification_id || ''] || '—'}
                                </span>
                              </td>
                              <td>
                                <div 
                                  style={{
                                    position: 'relative',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: dt.color || '#cccccc',
                                    border: '1px solid hsl(var(--card-border))',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    display: 'inline-block'
                                  }}
                                  title="Clique para editar a cor padrão"
                                >
                                  <input 
                                    type="color"
                                    value={dt.color || '#cccccc'}
                                    onChange={e => handleUpdateDefaultTypeColor(dt.id, e.target.value)}
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
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  onClick={() => handleToggleDefaultTypeActive(dt)}
                                  className="btn btn-ghost"
                                  style={{ padding: '0.25rem' }}
                                  title={dt.active ? 'Desativar' : 'Ativar'}
                                >
                                  {dt.active ? (
                                    <ToggleRight size={28} style={{ color: 'hsl(var(--primary))' }} />
                                  ) : (
                                    <ToggleLeft size={28} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                  )}
                                </button>
                              </td>
                              <td className="text-right">
                                <button 
                                  onClick={() => setDeleteDefTypeId(dt.id)} 
                                  className="btn btn-ghost btn-icon" 
                                  style={{ color: 'hsl(var(--destructive))' }}
                                  title="Excluir Tipo Padrão"
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tipos Padrão (Seed)</h3>
                <p className="text-muted text-xs mt-2">
                  Selecione uma categoria e uma subcategoria nos seletores acima para carregar e gerenciar seus tipos de resíduos padrão.
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

      {/* CONFIRM MODAL: DELETE DEFAULT TYPE */}
      {deleteDefTypeId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Tipo Padrão
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir este tipo padrão global? Isso não afetará as empresas existentes que já herdaram este tipo, mas ele não será mais inserido para novas empresas.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteDefTypeId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteDefaultType(deleteDefTypeId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
