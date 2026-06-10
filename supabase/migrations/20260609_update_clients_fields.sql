-- ==========================================================
-- ADICIONAR CAMPOS DETALHADOS DE CADASTRO NA TABELA CLIENTS
-- ==========================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SP';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS people_count INTEGER;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS team_count INTEGER;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_area_m2 NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gas_consumption_m3 NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS energy_consumption_kwh NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS operating_days TEXT[] DEFAULT '{}';
