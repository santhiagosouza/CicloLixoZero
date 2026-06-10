import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMaster?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireMaster = false }) => {
  const { user, isMasterAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando permissões...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireMaster && !isMasterAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
