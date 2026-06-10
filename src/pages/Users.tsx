import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Plus, UserPlus } from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

const Users: React.FC = () => {
  const { clientId, isClientAdmin, isMasterAdmin } = useAuth();
  const canManage = isClientAdmin || isMasterAdmin;

  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client_admin' | 'client_user'>('client_user');
  
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      // 1. Fetch Profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('client_id', clientId);

      if (profileErr) throw profileErr;

      const profileList = profiles || [];
      const ids = profileList.map(p => p.id);

      if (ids.length === 0) {
        setUsersList([]);
        return;
      }

      // 2. Fetch Roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids)
        .eq('client_id', clientId);

      if (rolesErr) throw rolesErr;

      const roleMap = new Map<string, string>();
      (rolesData || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      // 3. Assemble combined user rows
      const combined = profileList.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) || 'client_user'
      }));

      setUsersList(combined);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [clientId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !clientId) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Sign up the new user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: name.trim(),
            client_id: clientId
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Não foi possível registrar o usuário.');

      // Insert role
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: role,
          client_id: clientId
        });

      if (roleErr) throw roleErr;

      setSuccessMsg('Usuário cadastrado com sucesso!');
      setName('');
      setEmail('');
      setPassword('');
      setRole('client_user');
      
      // Refresh list
      fetchUsers();
      
      // Auto close modal after a short delay
      setTimeout(() => {
        setOpenModal(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar usuário. Lembre-se que no Supabase, cadastrar outro usuário pelo próprio navegador pode causar logout da sua sessão atual se a confirmação de e-mail estiver desligada.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && usersList.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Gerenciamento de Usuários</h1>
          <p className="text-muted text-sm font-medium">Cadastre e gerencie a equipe de colaboradores e administradores da sua empresa</p>
        </div>
        
        {canManage && (
          <button onClick={() => setOpenModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Novo Colaborador</span>
          </button>
        )}
      </div>

      {/* Users list table */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>E-mail</th>
                <th>Função / Permissão</th>
              </tr>
            </thead>
            <tbody>
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted" style={{ padding: '3rem 0' }}>
                    Nenhum colaborador cadastrado ainda.
                  </td>
                </tr>
              ) : (
                usersList.map(u => (
                  <tr key={u.id}>
                    <td>
                      <span className="font-semibold">{u.full_name || '—'}</span>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'client_admin' ? 'badge-warning' : 'badge-default'}`}>
                        {u.role === 'client_admin' ? 'Administrador' : 'Operador / Usuário'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE USER */}
      {openModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2 font-semibold">
                <UserPlus size={20} />
                Cadastrar Colaborador
              </h3>
              <button onClick={() => setOpenModal(false)} className="modal-close" disabled={submitting}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
              {errorMsg && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'hsl(var(--destructive))', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.825rem', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'hsl(var(--primary))', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.825rem', fontWeight: 500, textAlign: 'center' }}>
                  {successMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: João Silva" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="colaborador@empresa.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha Temporária</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Senha para o primeiro acesso" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nível de Permissão</label>
                <select 
                  className="form-select" 
                  value={role} 
                  onChange={e => setRole(e.target.value as any)} 
                  required 
                  disabled={submitting}
                >
                  <option value="client_user">Operador (Apenas insere/visualiza pesagens)</option>
                  <option value="client_admin">Administrador (Gerencia setores, subcategorias e usuários)</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setOpenModal(false)} className="btn btn-secondary" disabled={submitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
