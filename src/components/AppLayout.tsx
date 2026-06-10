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
  ChevronRight,
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
      { path: '/subcategories', label: 'Subcategorias', icon: Layers },
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
      
      {/* Impersonation Banner */}
      {isMasterAdmin && impersonatedClientId && (
        <div 
          style={{
            backgroundColor: '#fbbf24',
            color: '#78350f',
            padding: '0.5rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1100,
            boxShadow: 'var(--shadow-sm)',
            borderBottom: '1px solid #d97706',
          }}
        >
          <div className="flex items-center gap-2">
            <EyeOff size={16} />
            <span>Você está acessando o sistema como: <strong>{clientName || 'Carregando...'}</strong></span>
          </div>
          <button 
            onClick={handleStopImpersonation}
            className="btn"
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: '#78350f',
              color: '#fef3c7',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Sair do acesso simulado
          </button>
        </div>
      )}

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
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            borderBottom: '1px solid hsl(var(--card-border))',
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
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px' }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
              Ciclo Lixo Zero
            </span>
          </div>
          <div style={{ width: '36px' }} /> {/* Spacer */}
        </header>

        {/* Sidebar Navigation */}
        <aside 
          style={{
            width: '260px',
            backgroundColor: 'hsl(var(--card))',
            borderRight: '1px solid hsl(var(--card-border))',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: isMasterAdmin && impersonatedClientId ? '45px' : 0,
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
              padding: '1.5rem 1.25rem',
              borderBottom: '1px solid hsl(var(--card-border))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
             <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Ciclo Lixo Zero Logo" 
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'cover'
                }}
              />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                Ciclo Lixo Zero
              </span>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="btn btn-ghost btn-icon mobile-close-btn"
              style={{ display: 'none' }}
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
                borderBottom: '1px solid hsl(var(--card-border))',
                backgroundColor: 'rgba(34, 197, 94, 0.02)',
              }}
            >
              <p className="text-muted text-xs font-medium uppercase" style={{ letterSpacing: '0.05em' }}>Cliente Ativo</p>
              <p className="font-semibold text-sm truncate" style={{ marginTop: '0.125rem' }}>{clientName}</p>
            </div>
          )}

          {/* Navigation Links */}
          <nav style={{ flex: 1, padding: '1.25rem 0.75rem', overflowY: 'auto' }} className="flex flex-col gap-1">
            {menuItems.map((item, idx) => {
              if ('isHeader' in item) {
                return (
                  <div 
                    key={`header-${idx}`} 
                    style={{ 
                      padding: '1.25rem 0.5rem 0.5rem', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      color: 'hsl(var(--muted-foreground))',
                      letterSpacing: '0.08em'
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
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 500,
                    fontSize: '0.925rem',
                    color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                    backgroundColor: isActive ? 'hsl(var(--primary))' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                  className={`menu-link ${isActive ? '' : 'hoverable'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} opacity={isActive ? 1 : 0.75} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer (Logout) */}
          <div 
            style={{
              padding: '1rem 0.75rem',
              borderTop: '1px solid hsl(var(--card-border))',
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
                  backgroundColor: 'hsl(var(--secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'hsl(var(--secondary-foreground))'
                }}
              >
                <UserIcon size={16} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p className="font-semibold text-xs truncate">{profile?.full_name || user?.email}</p>
                <p className="text-muted text-xs truncate" style={{ fontSize: '0.7rem' }}>{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="btn btn-outline"
              style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
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
          {children}
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
          background-color: hsl(var(--muted));
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
};
