
-- Tipos de empresa (gerenciado pelo master)
CREATE TABLE public.company_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_types ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_company_types_updated_at BEFORE UPDATE ON public.company_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view company_types"
  ON public.company_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin manages company_types"
  ON public.company_types FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

INSERT INTO public.company_types (name) VALUES
  ('Restaurante'), ('Hotel'), ('Indústria'), ('Comércio'), ('Escritório'), ('Hospital'), ('Escola');

-- Expansão da tabela clients
ALTER TABLE public.clients
  ADD COLUMN license_number TEXT,
  ADD COLUMN company_type_id UUID REFERENCES public.company_types(id) ON DELETE SET NULL,
  ADD COLUMN responsible_name TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN zip_code TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN people_count INTEGER,
  ADD COLUMN team_count INTEGER,
  ADD COLUMN total_area_m2 NUMERIC(12,2),
  ADD COLUMN gas_consumption_m3 NUMERIC(12,2),
  ADD COLUMN energy_consumption_kwh NUMERIC(12,2),
  ADD COLUMN operating_days TEXT[] DEFAULT ARRAY[]::TEXT[];
