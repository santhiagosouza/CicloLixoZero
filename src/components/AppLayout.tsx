import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Recycle, LogOut, Building2, Tags, Scale, LayoutDashboard,
  Users, Layers, BarChart3, Menu, X, Briefcase, UserCog, Settings, ChevronDown
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Recycle;
}

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { isMasterAdmin, isClientAdmin, clientId, fullName, signOut, impersonatedClientId, setImpersonatedClient } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (clientId) {
      supabase.from("clients").select("name").eq("id", clientId).maybeSingle()
        .then(({ data }) => setClientName(data?.name ?? ""));
    } else {
      setClientName("");
    }
  }, [clientId]);

  const masterItems: NavItem[] = [
    { to: "/master", label: "Visão Geral", icon: LayoutDashboard },
    { to: "/master/clients", label: "Clientes", icon: Building2 },
    { to: "/master/company-types", label: "Tipos de Empresa", icon: Briefcase },
    { to: "/master/categories", label: "Categorias", icon: Tags },
  ];

  const clientItems: NavItem[] = [
    { to: "/", label: "Gravimetria", icon: Scale },
    { to: "/reports", label: "Relatórios", icon: BarChart3 },
  ];

  const settingsItems: NavItem[] = [
    { to: "/sectors", label: "Setores", icon: Layers },
    { to: "/subcategories", label: "Categorias", icon: Tags },
    ...(isClientAdmin ? [{ to: "/users", label: "Usuários", icon: Users }] : []),
  ];

  const settingsActive = settingsItems.some((i) => location.pathname === i.to);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  useEffect(() => { if (settingsActive) setSettingsOpen(true); }, [settingsActive]);

  const items = isMasterAdmin && location.pathname.startsWith("/master") ? masterItems : clientItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Recycle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">Ciclo Lixo Zero</p>
          <p className="text-xs opacity-70 leading-tight">{isMasterAdmin && location.pathname.startsWith("/master") ? "Master Admin" : clientName || "Cliente"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {!(isMasterAdmin && location.pathname.startsWith("/master")) && settingsItems.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                settingsActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-expanded={settingsOpen}
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1 text-left">Configurações</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen && "rotate-180")} />
            </button>
            {settingsOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-1">
                {settingsItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isMasterAdmin && (
          <div className="pt-3 mt-3 border-t border-sidebar-border space-y-1">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wider opacity-60">Mudar área</p>
            <Link
              to="/master"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Área Master
            </Link>
            {impersonatedClientId && !location.pathname.startsWith("/master") && (
              <button
                onClick={() => { setImpersonatedClient(null); setOpen(false); navigate("/master/clients"); }}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <X className="h-4 w-4" />
                Sair da personificação
              </button>
            )}
          </div>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <p className="px-2 py-1 text-xs opacity-70 truncate">{fullName || "Usuário"}</p>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">{SidebarContent}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-64">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b bg-card px-4 md:px-6 py-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1 md:flex-initial flex items-center gap-2">
            <h1 className="text-sm md:text-base font-medium">{clientName || (isMasterAdmin ? "Painel Master" : "")}</h1>
            {isMasterAdmin && impersonatedClientId && !location.pathname.startsWith("/master") && (
              <span className="inline-flex items-center gap-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <UserCog className="h-3 w-3" /> Visualizando como cliente
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">{fullName}</div>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-background overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
