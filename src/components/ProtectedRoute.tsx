import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children, requireMaster, requireClient }: { children: ReactNode; requireMaster?: boolean; requireClient?: boolean }) => {
  const { user, loading, isMasterAdmin, clientId } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (requireMaster && !isMasterAdmin) return <Navigate to="/" replace />;
  if (requireClient && !clientId && !isMasterAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
