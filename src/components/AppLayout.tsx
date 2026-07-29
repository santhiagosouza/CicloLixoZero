import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { 
  Scale, 
  Layers, 
  Grid, 
  Users, 
  BarChart2, 
  ShieldAlert, 
  Briefcase, 
  Tag, 
  Building2, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  EyeOff
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user, 
    profile, 
    isMasterAdmin, 
    clientId, 
    impersonatedClientId, 
    setImpersonatedClient, 
    signOut 
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientName, setClientName] = useState<string>('');

  // Fetch client name if clientId exists
  useEffect(() => {
    if (clientId) {
      supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setClientName(data.name);
        });
    } else {
      setClientName('');
    }
  }, [clientId]);

  const handleStopImpersonation = () => {
    setImpersonatedClient(null);
    navigate('/master');
  };

  const menuItems = [];

  // 1. Regular Client/Impersonated Client Menu
  if (clientId) {
    menuItems.push(
      { path: '/', label: 'Gravimetria', icon: Scale },
      { path: '/sectors', label: 'Setores', icon: Grid },
      { path: '/types', label: 'Tipos', icon: Layers },
      { path: '/users', label: 'Usuários', icon: Users },
      { path: '/reports', label: 'Relatórios', icon: BarChart2 }
    );
  }

  // 2. Master Admin Menu
  if (isMasterAdmin) {
    // Add spacer/header for administration
    menuItems.push({ isHeader: true, label: 'Painel Master' });
    menuItems.push(
      { path: '/master', label: 'Dashboard Master', icon: ShieldAlert },
      { path: '/master/clients', label: 'Clientes', icon: Briefcase },
      { path: '/master/categories', label: 'Categorias Globais', icon: Tag },
      { path: '/master/company-types', label: 'Tipos de Empresa', icon: Building2 }
    );
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      


      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Mobile Header */}
        <header 
          style={{
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(135deg, #157a43, #0c4a24)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0 1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 900,
          }}
          className="mobile-header-el"
        >
          <button 
            onClick={toggleSidebar} 
            className="btn btn-ghost btn-icon"
            style={{ color: '#ffffff' }}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo_ciclo.png?v=3" alt="Logo" style={{ height: '40px', width: 'auto', display: 'block' }} />
          </div>
          <div style={{ width: '36px' }} /> {/* Spacer */}
        </header>

        {/* Sidebar Navigation */}
        <aside 
          style={{
            width: '260px',
            background: 'linear-gradient(165deg, #157a43, #0c4a24)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 950,
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`sidebar-nav-el ${sidebarOpen ? 'open' : ''}`}
        >
          {/* Sidebar Header */}
          <div 
            style={{
              padding: '1.5rem 0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <img 
                src="/logo_ciclo.png?v=3" 
                alt="Ciclo Lixo Zero Logo" 
                style={{
                  width: '92%',
                  maxWidth: '220px',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>
            <button 
              onClick={toggleSidebar} 
              className="btn btn-ghost btn-icon mobile-close-btn"
              style={{ display: 'none', color: '#fff' }}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* User/Client Details */}
          {clientName && (
            <div 
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <p className="text-xs font-medium uppercase" style={{ letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.6)' }}>Cliente Ativo</p>
              <p className="font-semibold text-sm truncate" style={{ marginTop: '0.125rem', color: '#fff' }}>{clientName}</p>
            </div>
          )}

          {/* Navigation Links */}
          <nav style={{ flex: 1, padding: '1.25rem 0', overflowY: 'auto' }} className="flex flex-col">
            {menuItems.map((item, idx) => {
              if ('isHeader' in item) {
                return (
                  <div 
                    key={`header-${idx}`} 
                    style={{ 
                      padding: '1.5rem 1.25rem 0.5rem', 
                      fontSize: '0.875rem', 
                      fontWeight: 800, 
                      color: '#ffffff',
                      letterSpacing: '0.02em'
                    }}
                  >
                    {item.label}
                  </div>
                );
              }

              const Icon = item.icon!;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path!}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem',
                    fontWeight: isActive ? 800 : 500,
                    fontSize: '0.85rem',
                    color: isActive ? '#06522c' : 'rgba(255, 255, 255, 0.82)',
                    backgroundColor: isActive ? '#9bbb59' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  className={`menu-link ${isActive ? '' : 'hoverable'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={17} opacity={isActive ? 1 : 0.85} style={{ color: isActive ? '#06522c' : 'inherit' }} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Impersonation Card */}
          {isMasterAdmin && impersonatedClientId && (
            <div 
              style={{
                margin: '0 0.75rem 1rem',
                backgroundColor: '#fbbf24',
                color: '#78350f',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <EyeOff size={14} />
                <span>Acesso Simulado</span>
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.375rem', lineHeight: '1.3', fontWeight: 500 }}>
                Visualizando como: <strong style={{ fontWeight: 700 }}>{clientName || 'Carregando...'}</strong>
              </div>
              <button 
                onClick={handleStopImpersonation}
                style={{
                  width: '100%',
                  marginTop: '0.625rem',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#78350f',
                  color: '#fef3c7',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#92400e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#78350f'}
              >
                Voltar ao Painel Master
              </button>
            </div>
          )}

          {/* Sidebar Footer (Logout) */}
          <div 
            style={{
              padding: '1rem 0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div className="flex items-center gap-3" style={{ padding: '0 0.5rem' }}>
              <div 
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <UserIcon size={16} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p className="font-semibold text-xs truncate" style={{ color: '#ffffff' }}>{profile?.full_name || user?.email}</p>
                <p className="text-xs truncate" style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)' }}>{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="btn"
              style={{ 
                width: '100%', 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={16} />
              <span>Sair do sistema</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div 
            onClick={toggleSidebar}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(2px)',
              zIndex: 920,
            }}
            className="sidebar-backdrop"
          />
        )}

        {/* Main Content Area */}
        <main 
          style={{
            flex: 1,
            padding: '2rem 2.5rem',
            marginLeft: '260px',
            backgroundColor: 'hsl(var(--background))',
            minHeight: '100vh',
            transition: 'margin-left 0.3s ease',
          }}
          className="main-content-el"
        >
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>

      {/* CSS adjustments in JSX for responsive styling */}
      <style>{`
        @media (max-width: 991px) {
          .mobile-header-el {
            display: flex !important;
          }
          .sidebar-nav-el {
            transform: translateX(-260px);
            top: 60px !important;
          }
          .sidebar-nav-el.open {
            transform: translateX(0);
          }
          .main-content-el {
            margin-left: 0 !important;
            padding: 5.5rem 1rem 2rem !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
        }
        .menu-link.hoverable:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
};
