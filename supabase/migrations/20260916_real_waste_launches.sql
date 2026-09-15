-- =========================================================================
-- MIGRATION: 20260916_real_waste_launches.sql
-- Lançamentos Reais de Resíduos e Registros de Consumo / Logística
-- =========================================================================

-- 1. TABELA DE LANÇAMENTOS REAIS DE RESÍDUOS
CREATE TABLE IF NOT EXISTS public.waste_launches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  type_id UUID NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  classification_id UUID REFERENCES public.classifications(id) ON DELETE RESTRICT,
  peso_kg NUMERIC(12,3) NOT NULL CHECK (peso_kg > 0),
  destino TEXT NOT NULL DEFAULT 'Aterro', -- 'Aterro', 'Compostagem', 'Cooperativa', 'Reciclagem', 'Incineração', 'Outro'
  observacao TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_launches ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at em waste_launches
DROP TRIGGER IF EXISTS trg_waste_launches_updated_at ON public.waste_launches;
CREATE TRIGGER trg_waste_launches_updated_at 
  BEFORE UPDATE ON public.waste_launches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_waste_launches_client ON public.waste_launches(client_id);
CREATE INDEX IF NOT EXISTS idx_waste_launches_data ON public.waste_launches(data);
CREATE INDEX IF NOT EXISTS idx_waste_launches_sector ON public.waste_launches(sector_id);

-- RLS para waste_launches
DROP POLICY IF EXISTS "Client members can view waste launches of own client" ON public.waste_launches;
CREATE POLICY "Client members can view waste launches of own client" 
  ON public.waste_launches FOR SELECT 
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Client members can insert waste launches of own client" ON public.waste_launches;
CREATE POLICY "Client members can insert waste launches of own client" 
  ON public.waste_launches FOR INSERT 
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Client members can update waste launches of own client" ON public.waste_launches;
CREATE POLICY "Client members can update waste launches of own client" 
  ON public.waste_launches FOR UPDATE 
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Client members can delete waste launches of own client" ON public.waste_launches;
CREATE POLICY "Client members can delete waste launches of own client" 
  ON public.waste_launches FOR DELETE 
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));


-- 2. TABELA DE LOGS DE CONSUMO E LOGÍSTICA OPERACIONAL (UTILITIES)
CREATE TABLE IF NOT EXISTS public.utility_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  periodo_mes DATE NOT NULL, -- Primeiro dia do mês (ex: 2026-03-01)
  energia_kwh NUMERIC(12,2) NOT NULL DEFAULT 0,
  agua_m3 NUMERIC(12,2) NOT NULL DEFAULT 0,
  km_aterro NUMERIC(12,2) NOT NULL DEFAULT 0,
  km_reciclagem NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, periodo_mes)
);

ALTER TABLE public.utility_logs ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at em utility_logs
DROP TRIGGER IF EXISTS trg_utility_logs_updated_at ON public.utility_logs;
CREATE TRIGGER trg_utility_logs_updated_at 
  BEFORE UPDATE ON public.utility_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para utility_logs
DROP POLICY IF EXISTS "Client members can view utility logs of own client" ON public.utility_logs;
CREATE POLICY "Client members can view utility logs of own client" 
  ON public.utility_logs FOR SELECT 
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Client members can manage utility logs of own client" ON public.utility_logs;
CREATE POLICY "Client members can manage utility logs of own client" 
  ON public.utility_logs FOR ALL 
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()) OR public.is_master_admin(auth.uid()));
