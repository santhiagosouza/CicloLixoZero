import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

import Auth from './pages/Auth';
import Gravimetria from './pages/Gravimetria';
import GravimetriaDetail from './pages/GravimetriaDetail';
import Sectors from './pages/Sectors';
import Subcategories from './pages/Subcategories';
import Users from './pages/Users';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

import MasterDashboard from './pages/master/MasterDashboard';
import Clients from './pages/master/Clients';
import ClientForm from './pages/master/ClientForm';
import Categories from './pages/master/Categories';
import CompanyTypes from './pages/master/CompanyTypes';

// Home Redirect Component: Handles conditional landing page based on User role
const HomeRedirect = () => {
  const { isMasterAdmin, clientId, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <p className="text-muted font-medium pulse-active">Redirecionando...</p>
      </div>
    );
  }

  // If master admin has no active impersonated client, direct to master admin dashboard
  if (!clientId && isMasterAdmin) {
    return <Navigate to="/master" replace />;
  }

  // Otherwise, default landing is Gravimetria weighings page
  return <AppLayout><Gravimetria /></AppLayout>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/auth" element={<Auth />} />

          {/* Authenticated Client/General Routes */}
          <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
          <Route path="/gravimetria/:id" element={<ProtectedRoute><AppLayout><GravimetriaDetail /></AppLayout></ProtectedRoute>} />
          <Route path="/sectors" element={<ProtectedRoute><AppLayout><Sectors /></AppLayout></ProtectedRoute>} />
          <Route path="/subcategories" element={<ProtectedRoute><AppLayout><Subcategories /></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AppLayout><Users /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />

          {/* Master Admin Administration Routes */}
          <Route path="/master" element={<ProtectedRoute requireMaster><AppLayout><MasterDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/master/clients/new" element={<ProtectedRoute requireMaster><AppLayout><ClientForm /></AppLayout></ProtectedRoute>} />
          <Route path="/master/clients/:id/edit" element={<ProtectedRoute requireMaster><AppLayout><ClientForm /></AppLayout></ProtectedRoute>} />
          <Route path="/master/clients" element={<ProtectedRoute requireMaster><AppLayout><Clients /></AppLayout></ProtectedRoute>} />
          <Route path="/master/categories" element={<ProtectedRoute requireMaster><AppLayout><Categories /></AppLayout></ProtectedRoute>} />
          <Route path="/master/company-types" element={<ProtectedRoute requireMaster><AppLayout><CompanyTypes /></AppLayout></ProtectedRoute>} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
