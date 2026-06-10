import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  active: boolean;
}

const Sectors: React.FC = () => {
  const { clientId, isClientAdmin, isMasterAdmin } = useAuth();
  const canManage = isClientAdmin || isMasterAdmin;

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchSectors = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('client_id', clientId)
        .order('name');

      if (error) throw error;
      setSectors((data || []) as Sector[]);
    } catch (err: any) {
      console.error('Erro ao buscar setores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, [clientId]);

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('sectors')
        .insert({
          client_id: clientId,
          name: name.trim(),
          active: true
        });

      if (error) {
        if (error.message.includes('unique')) {
          throw new Error('Já existe um setor com este nome.');
        }
        throw error;
      }

      setName('');
      fetchSectors();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar setor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (sector: Sector) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('sectors')
        .update({ active: !sector.active })
        .eq('id', sector.id);

      if (error) throw error;
      fetchSectors();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteSector = async (sid: string) => {
    try {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', sid);

      if (error) {
        if (error.message.includes('foreign key')) {
          throw new Error('Não é possível excluir este setor porque já existem pesagens vinculadas a ele. Tente desativá-lo.');
        }
        throw error;
      }

      setDeleteConfirmId(null);
      fetchSectors();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir setor.');
    }
  };

  if (loading && sectors.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando setores...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Gerenciamento de Setores</h1>
        <p className="text-muted text-sm font-medium">Cadastre e gerencie as áreas físicas da sua operação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
        {/* Create Sector (Form) */}
        {canManage ? (
          <div className="card">
            <h2 className="card-title mb-4">Novo Setor</h2>
            <form onSubmit={handleCreateSector} className="flex flex-col gap-3">
              {errorMsg && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'hsl(var(--destructive))', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="sectorName">Nome do Setor</label>
                <input 
                  type="text" 
                  id="sectorName" 
                  className="form-input" 
                  placeholder="Ex: Cozinha, Administrativo" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  disabled={submitting}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                <Plus size={16} />
                <span>Adicionar Setor</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            <p className="text-muted text-sm">Apenas administradores podem cadastrar novos setores para esta empresa.</p>
          </div>
        )}

        {/* Sectors List Table */}
        <div className="card md:col-span-2">
          <h2 className="card-title">Setores Cadastrados</h2>
          <p className="card-description mb-4">Lista de setores disponíveis para seleção nas pesagens</p>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome do Setor</th>
                  <th style={{ width: '100px' }}>Status</th>
                  {canManage && <th style={{ width: '120px', textAlign: 'right' }} />}
                </tr>
              </thead>
              <tbody>
                {sectors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted" style={{ padding: '2.5rem 0' }}>
                      Nenhum setor cadastrado para este cliente.
                    </td>
                  </tr>
                ) : (
                  sectors.map(s => (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name}</td>
                      <td>
                        <span className={`badge ${s.active ? 'badge-success' : 'badge-default'}`}>
                          {s.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleToggleActive(s)} 
                              className="btn btn-ghost btn-icon" 
                              title={s.active ? 'Desativar Setor' : 'Ativar Setor'}
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
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL: DELETE SECTOR */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <ShieldAlert size={20} />
                Excluir Setor
              </h3>
            </div>
            <p className="text-sm text-muted" style={{ margin: '0.75rem 0' }}>
              Deseja realmente excluir este setor permanentemente? Esta ação só terá sucesso se não houverem pesagens registradas para este setor.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteSector(deleteConfirmId)} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sectors;
