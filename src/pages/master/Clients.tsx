import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, LogIn, ShieldAlert, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';

interface CompanyType {
  id: string;
  name: string;
}

interface ClientRow {
  id: string;
  name: string;
  cnpj: string | null;
  active: boolean;
  uf: string | null;
  license_number: string | null;
  company_type_id: string | null;
  responsible_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  zip_code: string | null;
  people_count: number | null;
  team_count: number | null;
  total_area_m2: number | null;
  gas_consumption_m3: number | null;
  energy_consumption_kwh: number | null;
  operating_days: string[] | null;
}

const Clients: React.FC = () => {
  const { setImpersonatedClient } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Clients
      let { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) {
        console.warn('Erro ao buscar todos os campos de clientes, tentando fallback básico...', clientsError);
        const fallbackRes = await supabase
          .from('clients')
          .select('id, name, cnpj, active, uf, company_type_id')
          .order('name');

        if (fallbackRes.error) throw fallbackRes.error;
        
        clientsData = (fallbackRes.data || []).map(c => ({
          ...c,
          license_number: null,
          responsible_name: null,
          phone: null,
          email: null,
          city: null,
          address: null,
          zip_code: null,
          people_count: null,
          team_count: null,
          total_area_m2: null,
          gas_consumption_m3: null,
          energy_consumption_kwh: null,
          operating_days: []
        }));
      }

      setClients((clientsData || []) as ClientRow[]);

      // 2. Fetch Company Types
      const { data: typesData, error: typesError } = await supabase
        .from('company_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;
      setCompanyTypes((typesData || []) as CompanyType[]);

    } catch (err: any) {
      console.error('Erro ao buscar dados de clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleToggleActive = async (c: ClientRow) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ active: !c.active })
        .eq('id', c.id);

      if (error) throw error;
      fetchInitialData();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteClient = async (cid: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', cid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir este cliente pois existem registros de setores, usuários ou pesagens vinculados a ele.');
        }
        throw error;
      }

      setDeleteConfirmId(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cliente.');
    }
  };

  const handleAccessClient = (c: ClientRow) => {
    setImpersonatedClient(c.id);
    navigate('/');
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando empresas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Gerenciamento de Clientes</h1>
          <p className="text-muted text-sm font-medium">Controle as empresas parceiras que utilizam o sistema</p>
        </div>
        
        <button onClick={() => navigate('/master/clients/new')} className="btn btn-primary">
          <Plus size={16} />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Clients list table */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome da Empresa</th>
                <th>Tipo</th>
                <th>Responsável</th>
                <th>Cidade/UF</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '100px' }}>Ativa</th>
                <th style={{ width: '250px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-semibold">{c.name}</span>
                      {c.cnpj && <div className="text-muted text-xs font-normal" style={{ marginTop: '0.2rem' }}>{c.cnpj}</div>}
                    </td>
                    <td>{companyTypes.find(t => t.id === c.company_type_id)?.name || '—'}</td>
                    <td>{c.responsible_name || '—'}</td>
                    <td>{c.city ? `${c.city} / ${c.uf || '—'}` : (c.uf || '—')}</td>
                    <td>
                      <span className={`badge ${c.active ? 'badge-success' : 'badge-default'}`}>
                        {c.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleToggleActive(c)} 
                        className="btn btn-ghost btn-icon"
                        title={c.active ? 'Desativar Empresa' : 'Ativar Empresa'}
                      >
                        {c.active ? <ToggleRight size={20} style={{ color: 'hsl(var(--primary))' }} /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleAccessClient(c)} 
                          className="btn btn-secondary flex items-center gap-1"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <LogIn size={14} />
                          <span>Acessar</span>
                        </button>
                        <button 
                          onClick={() => navigate(`/master/clients/${c.id}/edit`)} 
                          className="btn btn-ghost btn-icon"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(c.id)} 
                          className="btn btn-ghost btn-icon"
                          style={{ color: 'hsl(var(--destructive))' }}
                          title="Excluir"
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

      {/* CONFIRM MODAL: DELETE CLIENT */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Empresa
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Tem certeza que deseja excluir esta empresa parceira permanentemente? Todos os setores, subcategorias e pesagens de gravimetria vinculados serão excluídos na nuvem.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteClient(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
