
CREATE TABLE public.default_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX default_subcategories_cat_name_uniq
  ON public.default_subcategories (category_id, lower(name));

GRANT SELECT ON public.default_subcategories TO authenticated;
GRANT ALL ON public.default_subcategories TO service_role;

ALTER TABLE public.default_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view default subcategories list"
ON public.default_subcategories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin manages default_subcategories"
ON public.default_subcategories FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

CREATE TRIGGER trg_default_subcategories_updated
BEFORE UPDATE ON public.default_subcategories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.default_subcategories (category_id, name)
SELECT DISTINCT ON (category_id, lower(name)) category_id, name
FROM public.subcategories
WHERE category_id IS NOT NULL
ORDER BY category_id, lower(name), created_at ASC;

DROP TABLE IF EXISTS public.company_type_default_subcategories;

CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.company_type_id IS NOT NULL THEN
    INSERT INTO public.sectors (client_id, name)
    SELECT NEW.id, s.name
    FROM public.company_type_default_sectors s
    WHERE s.company_type_id = NEW.company_type_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sectors WHERE client_id = NEW.id) THEN
    INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');
  END IF;

  INSERT INTO public.subcategories (client_id, category_id, name)
  SELECT NEW.id, ds.category_id, ds.name
  FROM public.default_subcategories ds;

  RETURN NEW;
END;
$function$;
