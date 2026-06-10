import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, Scale, Layers, LogIn } from 'lucide-react';

interface Stats {
  clientsCount: number;
  weighingsWeight: number;
  gravimetriasCount: number;
}

interface ClientRow {
  id: string;
  name: string;
  cnpj: string | null;
  active: boolean;
}

const MasterDashboard: React.FC = () => {
  const { setImpersonatedClient } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({ clientsCount: 0, weighingsWeight: 0, gravimetriasCount: 0 });
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [cRes, wRes, gRes] = await Promise.all([
          supabase.from('clients').select('id, name, cnpj, active').order('name'),
          supabase.from('weighings').select('peso_kg'),
          supabase.from('gravimetrias').select('id', { count: 'exact', head: true })
        ]);

        const allClients = (cRes.data || []) as ClientRow[];
        setClients(allClients);

        const totalWeight = (wRes.data || []).reduce((sum, w) => sum + Number(w.peso_kg), 0);
        const gravsCount = gRes.count || 0;

        setStats({
          clientsCount: allClients.length,
          weighingsWeight: totalWeight,
          gravimetriasCount: gravsCount
        });
      } catch (err: any) {
        console.error('Erro ao buscar estatísticas do painel master:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleAccessClient = (c: ClientRow) => {
    setImpersonatedClient(c.id);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando painel master...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Painel de Administração Master</h1>
        <p className="text-muted text-sm font-medium">Visão geral do sistema e controle de acessos corporativos</p>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginTop: '0.5rem' }}>
        
        {/* Total Clients */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Clientes Cadastrados</p>
            <p className="font-semibold mt-1" style={{ fontSize: '2rem', lineHeight: '1.15', fontFamily: 'var(--font-heading)' }}>
              {stats.clientsCount} <span className="text-sm text-muted font-normal">empresas</span>
            </p>
          </div>
          <p className="text-muted text-xs mt-2 flex items-center gap-1">
            <Briefcase size={14} />
            Clientes ativos no ecossistema
          </p>
        </div>

        {/* Aggregate Weight */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Total de Resíduos Monitorados</p>
            <p className="font-semibold mt-1" style={{ fontSize: '2rem', lineHeight: '1.15', fontFamily: 'var(--font-heading)' }}>
              {stats.weighingsWeight.toFixed(1)} <span className="text-sm text-muted font-normal">kg</span>
            </p>
          </div>
          <p className="text-muted text-xs mt-2 flex items-center gap-1">
            <Scale size={14} />
            Massa total pesada por todos os clientes
          </p>
        </div>

        {/* Total Gravimetrias */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '110px' }}>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Estudos Realizados</p>
            <p className="font-semibold mt-1" style={{ fontSize: '2rem', lineHeight: '1.15', fontFamily: 'var(--font-heading)' }}>
              {stats.gravimetriasCount} <span className="text-sm text-muted font-normal">rodadas</span>
            </p>
          </div>
          <p className="text-muted text-xs mt-2 flex items-center gap-1">
            <Layers size={14} />
            Estudos gravimétricos iniciados/concluídos
          </p>
        </div>
      </div>

      {/* QUICK CLIENT ACCESS */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">Acesso Rápido a Clientes</h2>
          <p className="card-description">Escolha uma empresa para simular o acesso e gerenciar seus lançamentos, setores e pesagens</p>
        </div>

        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome da Empresa</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: '2.5rem 0' }}>
                    Nenhuma empresa cadastrada no sistema.
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-semibold">{c.name}</span>
                    </td>
                    <td>{c.cnpj || '—'}</td>
                    <td>
                      <span className={`badge ${c.active ? 'badge-success' : 'badge-default'}`}>
                        {c.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        onClick={() => handleAccessClient(c)} 
                        className="btn btn-secondary flex items-center gap-1"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginLeft: 'auto' }}
                      >
                        <LogIn size={14} />
                        <span>Acessar</span>
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
  );
};

export default MasterDashboard;
