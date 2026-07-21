-- =========================================================================
-- MIGRATION: 20260721_add_default_types.sql
-- Adiciona tabela de tipos de resíduos padrão para gerenciamento pelo Master Admin
-- =========================================================================

-- 1. Criar tabela default_types
CREATE TABLE IF NOT EXISTS public.default_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  default_classification_id UUID REFERENCES public.classifications(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subcategory_id, name)
);

-- 2. Habilitar RLS
ALTER TABLE public.default_types ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas RLS
DROP POLICY IF EXISTS "Anyone authenticated can view default_types" ON public.default_types;
CREATE POLICY "Anyone authenticated can view default_types" ON public.default_types 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Master admin can manage default_types" ON public.default_types;
CREATE POLICY "Master admin can manage default_types" ON public.default_types 
  FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 4. Popular default_types com os tipos de resíduos atualmente existentes no banco de dados
INSERT INTO public.default_types (subcategory_id, name, color, default_classification_id, active)
SELECT DISTINCT subcategory_id, name, color, default_classification_id, active
FROM public.types
ON CONFLICT (subcategory_id, name) DO NOTHING;

-- 5. Atualizar a função trigger seed_client_defaults para usar a tabela default_types
CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. Cria setor Geral padrão para a nova empresa
  IF NOT EXISTS (SELECT 1 FROM public.sectors WHERE client_id = NEW.id AND name = 'Geral') THEN
    INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');
  END IF;

  -- 2. Copia os tipos padrão da tabela default_types para esta nova empresa
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id, active)
  SELECT subcategory_id, NEW.id, name, color, default_classification_id, active
  FROM public.default_types
  WHERE active = true
  ON CONFLICT (client_id, subcategory_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;
