-- Tabelas de padrões por tipo de empresa
CREATE TABLE public.company_type_default_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_type_id UUID NOT NULL REFERENCES public.company_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_type_id, name)
);

CREATE TABLE public.company_type_default_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_type_id UUID NOT NULL REFERENCES public.company_types(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_type_id, category_id, name)
);

ALTER TABLE public.company_type_default_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_type_default_subcategories ENABLE ROW LEVEL SECURITY;

-- Policies: master_admin gerencia tudo; authenticated pode ver
CREATE POLICY "Authenticated can view default sectors"
  ON public.company_type_default_sectors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin manages default sectors"
  ON public.company_type_default_sectors FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Authenticated can view default subcategories"
  ON public.company_type_default_subcategories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin manages default subcategories"
  ON public.company_type_default_subcategories FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Triggers updated_at
CREATE TRIGGER trg_ctds_updated_at
  BEFORE UPDATE ON public.company_type_default_sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ctdsub_updated_at
  BEFORE UPDATE ON public.company_type_default_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar função de seed: se tipo informado, copia padrões do tipo; senão, seed genérico
CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cat_organico UUID;
  cat_reciclavel UUID;
  cat_perigoso UUID;
  has_type_defaults BOOLEAN := false;
BEGIN
  IF NEW.company_type_id IS NOT NULL THEN
    -- Copia setores padrão do tipo
    INSERT INTO public.sectors (client_id, name)
    SELECT NEW.id, s.name
    FROM public.company_type_default_sectors s
    WHERE s.company_type_id = NEW.company_type_id;

    -- Copia subcategorias padrão do tipo
    INSERT INTO public.subcategories (client_id, category_id, name)
    SELECT NEW.id, sub.category_id, sub.name
    FROM public.company_type_default_subcategories sub
    WHERE sub.company_type_id = NEW.company_type_id;

    SELECT EXISTS (
      SELECT 1 FROM public.company_type_default_sectors WHERE company_type_id = NEW.company_type_id
      UNION ALL
      SELECT 1 FROM public.company_type_default_subcategories WHERE company_type_id = NEW.company_type_id
    ) INTO has_type_defaults;

    IF has_type_defaults THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Fallback: seed genérico
  SELECT id INTO cat_organico FROM public.categories WHERE name = 'Orgânico' LIMIT 1;
  SELECT id INTO cat_reciclavel FROM public.categories WHERE name = 'Reciclável' LIMIT 1;
  SELECT id INTO cat_perigoso FROM public.categories WHERE name = 'Perigoso' LIMIT 1;

  INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');

  INSERT INTO public.subcategories (client_id, category_id, name) VALUES
    (NEW.id, cat_organico, 'Alimento'),
    (NEW.id, cat_perigoso, 'Baterias'),
    (NEW.id, cat_perigoso, 'Eletrônicos'),
    (NEW.id, cat_perigoso, 'Lâmpadas'),
    (NEW.id, cat_reciclavel, 'Metalizados'),
    (NEW.id, cat_perigoso, 'Óleo'),
    (NEW.id, cat_reciclavel, 'Papel Branco');

  RETURN NEW;
END;
$function$;