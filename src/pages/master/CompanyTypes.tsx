import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, Building2, Grid, Settings, ChevronRight } from 'lucide-react';

interface CompanyType {
  id: string;
  name: string;
}

interface DefaultSector {
  id: string;
  company_type_id: string;
  name: string;
}

const CompanyTypes: React.FC = () => {
  const [types, setTypes] = useState<CompanyType[]>([]);
  const [defaultSectors, setDefaultSectors] = useState<DefaultSector[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação e Filtros
  const [activeTab, setActiveTab] = useState<'types' | 'sectors'>('types');
  const [filterTypeId, setFilterTypeId] = useState('');

  // Selected Company Type for Default Sectors management
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null);

  // Form states - Company Type
  const [typeName, setTypeName] = useState('');
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  // Form states - Default Sector
  const [sectorName, setSectorName] = useState('');
  const [sectorSubmitting, setSectorSubmitting] = useState(false);

  // Delete modals state
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const [deleteSectorId, setDeleteSectorId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [typeRes, sectorRes] = await Promise.all([
        supabase.from('company_types').select('*').order('name'),
        supabase.from('company_type_default_sectors').select('*').order('name')
      ]);

      if (typeRes.error) throw typeRes.error;
      if (sectorRes.error) throw sectorRes.error;

      const companyTypes = (typeRes.data || []) as CompanyType[];
      const sectors = (sectorRes.data || []) as DefaultSector[];

      setTypes(companyTypes);
      setDefaultSectors(sectors);

      // Update selected reference if active
      if (filterTypeId) {
        const updated = companyTypes.find(t => t.id === filterTypeId) || null;
        setSelectedType(updated);
      }
    } catch (err: any) {
      console.error('Erro ao buscar tipos de empresa e setores padrão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateCompanyType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    setTypeSubmitting(true);
    try {
      const { error } = await supabase
        .from('company_types')
        .insert({ name: typeName.trim() });

      if (error) throw error;
      setTypeName('');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar tipo de empresa: ' + err.message);
    } finally {
      setTypeSubmitting(false);
    }
  };

  const handleCreateDefaultSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorName.trim() || !selectedType) return;

    setSectorSubmitting(true);
    try {
      const { error } = await supabase
        .from('company_type_default_sectors')
        .insert({
          company_type_id: selectedType.id,
          name: sectorName.trim()
        });

      if (error) throw error;
      setSectorName('');
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao criar setor padrão: ' + err.message);
    } finally {
      setSectorSubmitting(false);
    }
  };

  const handleDeleteCompanyType = async (tid: string) => {
    try {
      const { error } = await supabase
        .from('company_types')
        .delete()
        .eq('id', tid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir este tipo de empresa pois existem clientes vinculados a ele.');
        }
        throw error;
      }
      if (filterTypeId === tid) {
        setFilterTypeId('');
        setSelectedType(null);
      }
      setDeleteTypeId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tipo de empresa.');
    }
  };

  const handleDeleteSector = async (sid: string) => {
    try {
      const { error } = await supabase
        .from('company_type_default_sectors')
        .delete()
        .eq('id', sid);

      if (error) throw error;
      setDeleteSectorId(null);
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao excluir setor padrão: ' + err.message);
    }
  };

  if (loading && types.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando tipos de empresa...</p>
      </div>
    );
  }

  const filteredSectors = selectedType ? defaultSectors.filter(s => s.company_type_id === selectedType.id) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Tipos de Empresa e Setores Padrão</h1>
        <p className="text-muted text-sm font-medium">Gerencie modelos de setores que serão copiados automaticamente para novos clientes</p>
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
          className={`btn ${activeTab === 'types' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('types')}
        >
          <Building2 size={16} />
          <span>1. Tipos de Empresa</span>
        </button>
        <button 
          className={`btn ${activeTab === 'sectors' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('sectors')}
        >
          <Grid size={16} />
          <span>2. Setores Padrão</span>
          {filterTypeId && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '0.25rem' }}>
              ({types.find(t => t.id === filterTypeId)?.name})
            </span>
          )}
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{ marginTop: '0.5rem' }}>
        
        {/* ABA 1: TIPOS DE EMPRESA */}
        {activeTab === 'types' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
            
            {/* Create Company Type */}
            <div className="card">
              <h2 className="card-title mb-4">Novo Tipo de Empresa</h2>
              <form onSubmit={handleCreateCompanyType} className="flex flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Nome do Tipo de Empresa</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Hospital, Shopping, Escritório" 
                    value={typeName} 
                    onChange={e => setTypeName(e.target.value)} 
                    required 
                    disabled={typeSubmitting}
                  />
                </div>
                <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={typeSubmitting}>
                  <Plus size={16} />
                  <span>Cadastrar Tipo</span>
                </button>
              </form>
            </div>

            {/* Company Types List */}
            <div className="card lg:col-span-2">
              <h2 className="card-title mb-4">Tipos de Empresa Cadastrados</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th style={{ width: '250px', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map(t => (
                      <tr key={t.id} className="hoverable-row">
                        <td className="font-semibold">
                          <span className="flex items-center gap-2">
                            <Building2 size={15} style={{ color: 'hsl(var(--primary))' }} />
                            {t.name}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                              onClick={() => {
                                setFilterTypeId(t.id);
                                setSelectedType(t);
                                setActiveTab('sectors');
                              }} 
                              className="btn btn-secondary flex items-center gap-1"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                            >
                              <span>Setores Padrão</span>
                              <ChevronRight size={14} />
                            </button>
                            <button 
                              onClick={() => setDeleteTypeId(t.id)} 
                              className="btn btn-ghost btn-icon" 
                              style={{ color: 'hsl(var(--destructive))' }}
                              title="Excluir"
                            >
                              <Trash2 size={15} />
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

        {/* ABA 2: SETORES PADRÃO */}
        {activeTab === 'sectors' && (
          <div className="flex flex-col gap-4">
            
            {/* Seletor do Tipo de Empresa Ativo no topo */}
            <div className="card flex flex-row items-center gap-4 flex-wrap" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.01)', border: '1px solid hsl(var(--card-border))' }}>
              <label className="form-label font-semibold" style={{ marginBottom: 0, fontSize: '0.925rem' }}>
                Selecione o Tipo de Empresa para Gerenciar:
              </label>
              <select 
                className="form-select" 
                style={{ maxWidth: '320px', marginBottom: 0 }}
                value={filterTypeId}
                onChange={e => {
                  setFilterTypeId(e.target.value);
                  const selected = types.find(t => t.id === e.target.value) || null;
                  setSelectedType(selected);
                }}
              >
                <option value="">Selecione um tipo de empresa...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {filterTypeId && selectedType ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
                
                {/* Create Default Sector */}
                <div className="card">
                  <h2 className="card-title mb-4">Novo Setor Padrão</h2>
                  <p className="text-muted text-xs font-medium mb-3">Inserindo no modelo de: <strong>{selectedType.name}</strong></p>
                  <form onSubmit={handleCreateDefaultSector} className="flex flex-col gap-3">
                    <div className="form-group">
                      <label className="form-label">Nome do Setor</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: Cozinha, Administrativo, Pátio" 
                        value={sectorName} 
                        onChange={e => setSectorName(e.target.value)} 
                        required 
                        disabled={sectorSubmitting}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={sectorSubmitting}>
                      <Plus size={16} />
                      <span>Adicionar Setor</span>
                    </button>
                  </form>
                </div>

                {/* Default Sectors list */}
                <div className="card lg:col-span-2">
                  <h2 className="card-title mb-4">Setores Padrão de {selectedType.name}</h2>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome do Setor</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSectors.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                              Nenhum setor padrão configurado para este tipo de empresa.
                            </td>
                          </tr>
                        ) : (
                          filteredSectors.map(s => (
                            <tr key={s.id}>
                              <td className="font-semibold">
                                <span className="flex items-center gap-2">
                                  <Grid size={14} style={{ color: 'hsl(var(--primary))' }} />
                                  {s.name}
                                </span>
                              </td>
                              <td className="text-right">
                                <button 
                                  onClick={() => setDeleteSectorId(s.id)} 
                                  className="btn btn-ghost btn-icon" 
                                  style={{ color: 'hsl(var(--destructive))' }}
                                  title="Excluir Setor"
                                >
                                  <Trash2 size={15} />
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
              <div className="card text-center" style={{ padding: '5rem 2rem' }}>
                <Settings size={36} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5, margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Gerenciamento de Setores Padrão</h3>
                <p className="text-muted text-sm mt-2">
                  Selecione um tipo de empresa no menu acima para gerenciar os setores padrão que serão criados automaticamente para novos clientes.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* CONFIRM MODAL: DELETE COMPANY TYPE */}
      {deleteTypeId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Tipo de Empresa
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir este tipo de empresa? Esta ação só terá sucesso se não houverem clientes vinculados a ele.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteTypeId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteCompanyType(deleteTypeId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE SECTOR */}
      {deleteSectorId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Setor Padrão
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir este setor do modelo? Clientes novos deste tipo de empresa não receberão mais este setor por padrão.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteSectorId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteSector(deleteSectorId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyTypes;
