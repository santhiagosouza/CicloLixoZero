-- =========================================
-- TIPOS DE EMPRESA E SETORES PADRÃO
-- =========================================

-- Tabela de Tipos de Empresa
CREATE TABLE public.company_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.company_types TO authenticated;
GRANT ALL ON public.company_types TO service_role;

-- Tabela de Setores Padrão por Tipo de Empresa
CREATE TABLE public.company_type_default_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_type_id UUID NOT NULL REFERENCES public.company_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_type_id, name)
);
ALTER TABLE public.company_type_default_sectors ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.company_type_default_sectors TO authenticated;
GRANT ALL ON public.company_type_default_sectors TO service_role;

-- Modificar a tabela de clients para adicionar o tipo de empresa
ALTER TABLE public.clients ADD COLUMN company_type_id UUID REFERENCES public.company_types(id) ON DELETE SET NULL;

-- =========================================
-- RLS POLICIES FOR NEW TABLES
-- =========================================
CREATE POLICY "Anyone authenticated can view company_types" ON public.company_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin manages company_types" ON public.company_types FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Anyone authenticated can view default sectors" ON public.company_type_default_sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin manages default sectors" ON public.company_type_default_sectors FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- =========================================
-- RE-SEED DEFAULTS TRIGGER FOR CLIENTS
-- =========================================
CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o cliente tiver um tipo de empresa cadastrado, injeta os setores padrão dele
  IF NEW.company_type_id IS NOT NULL THEN
    INSERT INTO public.sectors (client_id, name)
    SELECT NEW.id, s.name
    FROM public.company_type_default_sectors s
    WHERE s.company_type_id = NEW.company_type_id;
  END IF;

  -- Se não foi inserido nenhum setor, cria o setor 'Geral' padrão
  IF NOT EXISTS (SELECT 1 FROM public.sectors WHERE client_id = NEW.id) THEN
    INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');
  END IF;

  -- Copia todas as subcategorias padrões globais (com client_id nulo) para o cliente localmente
  -- Para que o cliente possa gerenciar individualmente o status ativo/inativo de cada uma
  INSERT INTO public.subcategories (client_id, type_id, name, active)
  SELECT NEW.id, ds.type_id, ds.name, true
  FROM public.subcategories ds
  WHERE ds.client_id IS NULL;

  RETURN NEW;
END;
$$;

-- =========================================
-- SEED DE DADOS INICIAIS
-- =========================================
INSERT INTO public.company_types (name) VALUES
  ('Escritório Corporativo'),
  ('Escola / Universidade'),
  ('Restaurante / Alimentício'),
  ('Condomínio Residencial');

DO $$
DECLARE
  tp_escritorio UUID;
  tp_escola UUID;
  tp_restaurante UUID;
BEGIN
  SELECT id INTO tp_escritorio FROM public.company_types WHERE name = 'Escritório Corporativo' LIMIT 1;
  SELECT id INTO tp_escola FROM public.company_types WHERE name = 'Escola / Universidade' LIMIT 1;
  SELECT id INTO tp_restaurante FROM public.company_types WHERE name = 'Restaurante / Alimentício' LIMIT 1;

  -- Setores para Escritório
  INSERT INTO public.company_type_default_sectors (company_type_id, name) VALUES
    (tp_escritorio, 'Recepção'),
    (tp_escritorio, 'Copa / Cozinha'),
    (tp_escritorio, 'Estações de Trabalho'),
    (tp_escritorio, 'Almoxarifado');

  -- Setores para Escola
  INSERT INTO public.company_type_default_sectors (company_type_id, name) VALUES
    (tp_escola, 'Salas de Aula'),
    (tp_escola, 'Refeitório'),
    (tp_escola, 'Pátio / Áreas Comuns'),
    (tp_escola, 'Administrativo');

  -- Setores para Restaurante
  INSERT INTO public.company_type_default_sectors (company_type_id, name) VALUES
    (tp_restaurante, 'Cozinha Principal'),
    (tp_restaurante, 'Salão de Refeições'),
    (tp_restaurante, 'Estoque / Despensa'),
    (tp_restaurante, 'Banheiros');
END $$;
