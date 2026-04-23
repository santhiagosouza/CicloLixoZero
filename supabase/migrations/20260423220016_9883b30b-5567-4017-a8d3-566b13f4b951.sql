
-- Limpa padrões existentes em Escola
DELETE FROM public.company_type_default_sectors WHERE company_type_id = '7664d930-8e98-4724-9ec1-1fa9e6fa8394';
DELETE FROM public.company_type_default_subcategories WHERE company_type_id = '7664d930-8e98-4724-9ec1-1fa9e6fa8394';

-- Move de Comércio para Escola
UPDATE public.company_type_default_sectors
  SET company_type_id = '7664d930-8e98-4724-9ec1-1fa9e6fa8394'
  WHERE company_type_id = 'ca997699-dcd3-4521-8c7f-9bf0c7f1be1a';

UPDATE public.company_type_default_subcategories
  SET company_type_id = '7664d930-8e98-4724-9ec1-1fa9e6fa8394'
  WHERE company_type_id = 'ca997699-dcd3-4521-8c7f-9bf0c7f1be1a';
