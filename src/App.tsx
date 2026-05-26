import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Gravimetria from "./pages/Gravimetria";
import GravimetriaDetail from "./pages/GravimetriaDetail";
import Sectors from "./pages/Sectors";
import Subcategories from "./pages/Subcategories";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import MasterDashboard from "./pages/master/MasterDashboard";
import Clients from "./pages/master/Clients";
import Categories from "./pages/master/Categories";
import CompanyTypes from "./pages/master/CompanyTypes";
import CompanyTypeDetail from "./pages/master/CompanyTypeDetail";
import CategoryDetail from "./pages/master/CategoryDetail";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { isMasterAdmin, clientId, loading } = useAuth();
  if (loading) return null;
  if (!clientId && isMasterAdmin) return <Navigate to="/master" replace />;
  return <AppLayout><Gravimetria /></AppLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            <Route path="/gravimetria/:id" element={<ProtectedRoute><AppLayout><GravimetriaDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/sectors" element={<ProtectedRoute><AppLayout><Sectors /></AppLayout></ProtectedRoute>} />
            <Route path="/subcategories" element={<ProtectedRoute><AppLayout><Subcategories /></AppLayout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><AppLayout><Users /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />

            <Route path="/master" element={<ProtectedRoute requireMaster><AppLayout><MasterDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/master/clients" element={<ProtectedRoute requireMaster><AppLayout><Clients /></AppLayout></ProtectedRoute>} />
            <Route path="/master/categories" element={<ProtectedRoute requireMaster><AppLayout><Categories /></AppLayout></ProtectedRoute>} />
            <Route path="/master/categories/:id" element={<ProtectedRoute requireMaster><AppLayout><CategoryDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/master/company-types" element={<ProtectedRoute requireMaster><AppLayout><CompanyTypes /></AppLayout></ProtectedRoute>} />
            <Route path="/master/company-types/:id" element={<ProtectedRoute requireMaster><AppLayout><CompanyTypeDetail /></AppLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
