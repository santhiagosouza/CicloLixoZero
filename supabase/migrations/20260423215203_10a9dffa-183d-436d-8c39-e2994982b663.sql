DO $$
DECLARE
  ct UUID := 'ca997699-dcd3-4521-8c7f-9bf0c7f1be1a';
  cat_org UUID;
  cat_rec UUID;
  cat_per UUID;
  cat_rej UUID;
BEGIN
  SELECT id INTO cat_org FROM public.categories WHERE name = 'Orgânico' LIMIT 1;
  SELECT id INTO cat_rec FROM public.categories WHERE name = 'Reciclável' LIMIT 1;
  SELECT id INTO cat_per FROM public.categories WHERE name = 'Perigoso' LIMIT 1;
  SELECT id INTO cat_rej FROM public.categories WHERE name = 'Rejeito' LIMIT 1;

  -- Setores
  INSERT INTO public.company_type_default_sectors (company_type_id, name) VALUES
    (ct, 'Almoxarifado'), (ct, 'Área externa'), (ct, 'Banheiro coletivo'),
    (ct, 'Banheiro dos professores'), (ct, 'Biblioteca'), (ct, 'Cantina'),
    (ct, 'Corredores'), (ct, 'Cozinha'), (ct, 'Diretoria'), (ct, 'Quadra'),
    (ct, 'Recepção'), (ct, 'Refeitório'), (ct, 'Sala de coordenação'),
    (ct, 'Sala de aula'), (ct, 'Sala de direção'), (ct, 'Sala dos professores')
  ON CONFLICT (company_type_id, name) DO NOTHING;

  -- Orgânico
  INSERT INTO public.company_type_default_subcategories (company_type_id, category_id, name) VALUES
    (ct, cat_org, 'Alimento'), (ct, cat_org, 'Poda e capina'),
    (ct, cat_org, 'Outros'), (ct, cat_org, 'Serragem')
  ON CONFLICT (company_type_id, category_id, name) DO NOTHING;

  -- Reciclável
  INSERT INTO public.company_type_default_subcategories (company_type_id, category_id, name) VALUES
    (ct, cat_rec, 'Alumínio'), (ct, cat_rec, 'Isopor'), (ct, cat_rec, 'Metal misto'),
    (ct, cat_rec, 'Papel e papelão'), (ct, cat_rec, 'Plástico'), (ct, cat_rec, 'Tetra Pak'),
    (ct, cat_rec, 'Vidro'), (ct, cat_rec, 'Madeira'), (ct, cat_rec, 'Têxteis'),
    (ct, cat_rec, 'Borracha e couro')
  ON CONFLICT (company_type_id, category_id, name) DO NOTHING;

  -- Perigoso
  INSERT INTO public.company_type_default_subcategories (company_type_id, category_id, name) VALUES
    (ct, cat_per, 'Baterias'), (ct, cat_per, 'Cortantes'), (ct, cat_per, 'Eletrônicos'),
    (ct, cat_per, 'Lâmpadas'), (ct, cat_per, 'Óleo'), (ct, cat_per, 'Perfurocortantes'),
    (ct, cat_per, 'Pilhas'), (ct, cat_per, 'Químicos'), (ct, cat_per, 'Graxa'),
    (ct, cat_per, 'Remédios')
  ON CONFLICT (company_type_id, category_id, name) DO NOTHING;

  -- Rejeito
  INSERT INTO public.company_type_default_subcategories (company_type_id, category_id, name) VALUES
    (ct, cat_rej, 'Absorvente'), (ct, cat_rej, 'Adesivos'), (ct, cat_rej, 'Canetas'),
    (ct, cat_rej, 'Celofane'), (ct, cat_rej, 'Cerâmicas'), (ct, cat_rej, 'Cigarro'),
    (ct, cat_rej, 'Contaminados'), (ct, cat_rej, 'Cristais'), (ct, cat_rej, 'Descartáveis'),
    (ct, cat_rej, 'Espelhos'), (ct, cat_rej, 'Esponjas'), (ct, cat_rej, 'EVA'),
    (ct, cat_rej, 'Fitas adesivas'), (ct, cat_rej, 'Metalizados'), (ct, cat_rej, 'Palha de aço'),
    (ct, cat_rej, 'Papel higiênico'), (ct, cat_rej, 'Papel toalha'),
    (ct, cat_rej, 'Papel fotográfico'), (ct, cat_rej, 'Porcelanas'), (ct, cat_rej, 'Tecidos')
  ON CONFLICT (company_type_id, category_id, name) DO NOTHING;
END $$;