import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando...</p>
      </div>
    );
  }

  // If already authenticated, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw error;
      }

      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao tentar fazer login.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center flex-col p-4" 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(140, 20%, 93%), hsl(152, 25%, 88%))',
      }}
    >
      {/* Background decoration */}
      <div 
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(255,255,255,0) 70%)',
          top: '10%',
          left: '15%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)',
          bottom: '10%',
          right: '10%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div 
        className="card" 
        style={{ 
          width: '100%', 
          maxWidth: '420px', 
          zIndex: 10, 
          padding: '2.5rem 2rem',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 20px 40px -15px rgba(16, 24, 22, 0.08)',
        }}
      >
        <div className="text-center mb-4">
          <div 
            className="flex items-center justify-center"
            style={{
              width: '4.5rem',
              height: '4.5rem',
              margin: '0 auto 1.25rem',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 8px 16px -4px rgba(16, 24, 22, 0.1)'
            }}
          >
            <img src="/logo.png" alt="Ciclo Lixo Zero Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className="m-0" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Ciclo Lixo Zero
          </h1>
          <p className="text-muted text-sm mt-1">
            Plataforma de Gestão e Gravimetria de Resíduos
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          {errorMsg && (
            <div 
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: 'hsl(var(--destructive))',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
            <input 
              className="form-input" 
              type="email" 
              id="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={authLoading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">Senha</label>
            <input 
              className="form-input" 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={authLoading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem 1.25rem' }}
            disabled={authLoading}
          >
            {authLoading ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>

        <div className="text-center mt-4 pt-2" style={{ borderTop: '1px solid hsl(var(--card-border))' }}>
          <p className="text-muted text-xs">
            Não tem uma conta ou esqueceu sua senha?<br />
            Contate o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
