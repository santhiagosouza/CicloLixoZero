-- =========================================================================
-- MIGRATION: 20260721_change_hierarchy.sql
-- Nova hierarquia: Categoria (1) -> Subcategoria (2, Global) -> Tipo (3, Cliente)
-- =========================================================================

-- 1. Limpar e apagar tabelas e RLS anteriores para recriação limpa
DROP TABLE IF EXISTS public.weighings CASCADE;
DROP TABLE IF EXISTS public.subcategories CASCADE;
DROP TABLE IF EXISTS public.types CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.classifications CASCADE;

-- 2. Recriar Classificações Normativas (Global)
CREATE TABLE public.classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;

-- 3. Recriar Categorias (Global, Nível 1)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Recriar Subcategorias (Global, Nível 2 - vinculadas diretamente a Categorias)
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_subcategories_updated_at BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Recriar Tipos (Multi-tenant por Cliente, Nível 3 - vinculados a Subcategorias)
CREATE TABLE public.types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  default_classification_id UUID REFERENCES public.classifications(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, subcategory_id, name)
);
ALTER TABLE public.types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_types_updated_at BEFORE UPDATE ON public.types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Recriar Pesagens (Weighings) com referências para a nova estrutura
CREATE TABLE public.weighings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gravimetria_id UUID NOT NULL REFERENCES public.gravimetrias(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  type_id UUID NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  classification_id UUID NOT NULL REFERENCES public.classifications(id) ON DELETE RESTRICT,
  peso_kg NUMERIC(12,3) NOT NULL CHECK (peso_kg > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weighings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_weighings_gravimetria ON public.weighings(gravimetria_id);
CREATE INDEX idx_weighings_client ON public.weighings(client_id);

-- =========================================================================
-- SEED DE DADOS INICIAIS (PADRÕES GLOBAIS E ESTRUTURAIS)
-- =========================================================================

-- Inserir Classificações
INSERT INTO public.classifications (name, description) VALUES
  ('Classe I - Perigoso', 'Resíduos que apresentam periculosidade, inflamabilidade, corrosividade, reatividade, toxicidade ou patogenicidade.'),
  ('Classe II A - Não Inerte', 'Resíduos não inertes que podem apresentar propriedades de biodegradabilidade, combustibilidade ou solubilidade em água.'),
  ('Classe II B - Inerte', 'Resíduos que não são solubilizados nem sofrem alterações físicas, químicas ou biológicas ao entrar em contato com a água.');

-- Inserir Categorias (Nível 1)
INSERT INTO public.categories (name, color) VALUES
  ('Orgânico', '#10b981'),   -- Emerald-500
  ('Reciclável', '#3b82f6'), -- Blue-500
  ('Perigoso', '#ef4444'),   -- Red-500
  ('Rejeito', '#6b7280');    -- Gray-500

-- Inserir Subcategorias Globais (Nível 2)
DO $$
DECLARE
  cat_reciclavel UUID;
  cat_organico UUID;
  cat_perigoso UUID;
  cat_rejeito UUID;
BEGIN
  SELECT id INTO cat_reciclavel FROM public.categories WHERE name = 'Reciclável' LIMIT 1;
  SELECT id INTO cat_organico FROM public.categories WHERE name = 'Orgânico' LIMIT 1;
  SELECT id INTO cat_perigoso FROM public.categories WHERE name = 'Perigoso' LIMIT 1;
  SELECT id INTO cat_rejeito FROM public.categories WHERE name = 'Rejeito' LIMIT 1;

  INSERT INTO public.subcategories (category_id, name) VALUES
    (cat_reciclavel, 'Plástico'),
    (cat_reciclavel, 'Papel/Papelão'),
    (cat_reciclavel, 'Vidro'),
    (cat_reciclavel, 'Metal'),
    (cat_organico, 'Restos de Alimentos'),
    (cat_organico, 'Jardinagem/Poda'),
    (cat_perigoso, 'Pilhas/Baterias'),
    (cat_perigoso, 'Lâmpadas'),
    (cat_perigoso, 'Óleos/Graxas'),
    (cat_rejeito, 'Sanitário'),
    (cat_rejeito, 'EPIs/Panos Sujos');
END $$;

-- =========================================================================
-- TRIGGER PARA CADASTRAR OS TIPOS PADRÃO AUTOMATICAMENTE
-- =========================================================================

CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cls_classe1 UUID;
  cls_classe2a UUID;
  cls_classe2b UUID;
  
  sub_plastico UUID;
  sub_papel UUID;
  sub_vidro UUID;
  sub_metal UUID;
  sub_alimento UUID;
  sub_jardinagem UUID;
  sub_pilhas UUID;
  sub_lampadas UUID;
  sub_oleos UUID;
  sub_sanitario UUID;
  sub_epis UUID;
BEGIN
  -- 1. Cria setor Geral padrão para a nova empresa
  INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');

  -- 2. Carrega IDs das classificações
  SELECT id INTO cls_classe1 FROM public.classifications WHERE name = 'Classe I - Perigoso' LIMIT 1;
  SELECT id INTO cls_classe2a FROM public.classifications WHERE name = 'Classe II A - Não Inerte' LIMIT 1;
  SELECT id INTO cls_classe2b FROM public.classifications WHERE name = 'Classe II B - Inerte' LIMIT 1;

  -- 3. Carrega IDs das subcategorias globais
  SELECT id INTO sub_plastico FROM public.subcategories WHERE name = 'Plástico' LIMIT 1;
  SELECT id INTO sub_papel FROM public.subcategories WHERE name = 'Papel/Papelão' LIMIT 1;
  SELECT id INTO sub_vidro FROM public.subcategories WHERE name = 'Vidro' LIMIT 1;
  SELECT id INTO sub_metal FROM public.subcategories WHERE name = 'Metal' LIMIT 1;
  SELECT id INTO sub_alimento FROM public.subcategories WHERE name = 'Restos de Alimentos' LIMIT 1;
  SELECT id INTO sub_jardinagem FROM public.subcategories WHERE name = 'Jardinagem/Poda' LIMIT 1;
  SELECT id INTO sub_pilhas FROM public.subcategories WHERE name = 'Pilhas/Baterias' LIMIT 1;
  SELECT id INTO sub_lampadas FROM public.subcategories WHERE name = 'Lâmpadas' LIMIT 1;
  SELECT id INTO sub_oleos FROM public.subcategories WHERE name = 'Óleos/Graxas' LIMIT 1;
  SELECT id INTO sub_sanitario FROM public.subcategories WHERE name = 'Sanitário' LIMIT 1;
  SELECT id INTO sub_epis FROM public.subcategories WHERE name = 'EPIs/Panos Sujos' LIMIT 1;

  -- 4. Cadastra os Tipos de Resíduos padrão (Nível 3) específicos para este Cliente
  
  -- Plástico
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_plastico, NEW.id, 'PET Transparente', '#60a5fa', cls_classe2b),
    (sub_plastico, NEW.id, 'PET Colorido', '#3b82f6', cls_classe2b),
    (sub_plastico, NEW.id, 'PEAD', '#1d4ed8', cls_classe2b),
    (sub_plastico, NEW.id, 'PEBD', '#2563eb', cls_classe2b),
    (sub_plastico, NEW.id, 'PVC', '#3b82f6', cls_classe2b),
    (sub_plastico, NEW.id, 'PP', '#60a5fa', cls_classe2b),
    (sub_plastico, NEW.id, 'ABS', '#93c5fd', cls_classe2b),
    (sub_plastico, NEW.id, 'Plástico Misto', '#bfdbfe', cls_classe2b),
    (sub_plastico, NEW.id, 'Copos Descartáveis', '#93c5fd', cls_classe2b),
    (sub_plastico, NEW.id, 'Garrafas PET', '#3b82f6', cls_classe2b),
    (sub_plastico, NEW.id, 'Embalagens Flexíveis', '#60a5fa', cls_classe2b);

  -- Papel/Papelão
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_papel, NEW.id, 'Papel Branco', '#bfdbfe', cls_classe2a),
    (sub_papel, NEW.id, 'Jornal', '#93c5fd', cls_classe2a),
    (sub_papel, NEW.id, 'Papelão', '#60a5fa', cls_classe2a),
    (sub_papel, NEW.id, 'Arquivo Misto', '#3b82f6', cls_classe2a),
    (sub_papel, NEW.id, 'Revista', '#93c5fd', cls_classe2a),
    (sub_papel, NEW.id, 'Papel Kraft', '#60a5fa', cls_classe2a),
    (sub_papel, NEW.id, 'Cartolina', '#93c5fd', cls_classe2a),
    (sub_papel, NEW.id, 'Papel Misto', '#dbeafe', cls_classe2a),
    (sub_papel, NEW.id, 'Papel de Escritório (A4)', '#bfdbfe', cls_classe2a),
    (sub_papel, NEW.id, 'Caixas de Papelão', '#60a5fa', cls_classe2a);

  -- Vidro
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_vidro, NEW.id, 'Vidro Branco', '#34d399', cls_classe2b),
    (sub_vidro, NEW.id, 'Vidro Verde', '#10b981', cls_classe2b),
    (sub_vidro, NEW.id, 'Vidro Âmbar', '#059669', cls_classe2b),
    (sub_vidro, NEW.id, 'Vidro Temperado', '#34d399', cls_classe2b),
    (sub_vidro, NEW.id, 'Vidro Laminado', '#6ee7b7', cls_classe2b),
    (sub_vidro, NEW.id, 'Cacos Mistos', '#a7f3d0', cls_classe2b),
    (sub_vidro, NEW.id, 'Garrafa Inteira', '#10b981', cls_classe2b),
    (sub_vidro, NEW.id, 'Vidro Misto', '#34d399', cls_classe2b);

  -- Metal
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_metal, NEW.id, 'Ferro', '#f3f4f6', cls_classe2b),
    (sub_metal, NEW.id, 'Alumínio', '#e5e7eb', cls_classe2b),
    (sub_metal, NEW.id, 'Cobre', '#f59e0b', cls_classe2b),
    (sub_metal, NEW.id, 'Latão', '#fbbf24', cls_classe2b),
    (sub_metal, NEW.id, 'Chumbo', '#9ca3af', cls_classe1),
    (sub_metal, NEW.id, 'Metal Misturado', '#d1d5db', cls_classe2b);

  -- Restos de Alimentos
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_alimento, NEW.id, 'Restos de Refeição', '#059669', cls_classe2a),
    (sub_alimento, NEW.id, 'Cascas de Frutas/Legumes', '#10b981', cls_classe2a),
    (sub_alimento, NEW.id, 'Composto Orgânico', '#047857', cls_classe2a),
    (sub_alimento, NEW.id, 'Húmus', '#065f46', cls_classe2a),
    (sub_alimento, NEW.id, 'Biofertilizante Líquido', '#34d399', cls_classe2a);

  -- Jardinagem
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_jardinagem, NEW.id, 'Galhos e Poda', '#10b981', cls_classe2a),
    (sub_jardinagem, NEW.id, 'Grama Cortada', '#34d399', cls_classe2a),
    (sub_jardinagem, NEW.id, 'Folhas Secas', '#059669', cls_classe2a);

  -- Pilhas/Baterias
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_pilhas, NEW.id, 'Pilhas Alcalinas', '#ef4444', cls_classe1),
    (sub_pilhas, NEW.id, 'Baterias de Lítio', '#dc2626', cls_classe1),
    (sub_pilhas, NEW.id, 'Pilhas Comuns', '#f87171', cls_classe1),
    (sub_pilhas, NEW.id, 'Baterias de Celular', '#dc2626', cls_classe1),
    (sub_pilhas, NEW.id, 'Placas Eletrônicas', '#991b1b', cls_classe1);

  -- Lâmpadas
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_lampadas, NEW.id, 'Lâmpadas Fluorescentes', '#fbbf24', cls_classe1),
    (sub_lampadas, NEW.id, 'Lâmpadas de LED', '#f59e0b', cls_classe1);

  -- Óleos/Graxas
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_oleos, NEW.id, 'Óleo de Cozinha Usado', '#fbbf24', cls_classe1),
    (sub_oleos, NEW.id, 'Graxas e Lubrificantes', '#d97706', cls_classe1);

  -- Sanitários
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_sanitario, NEW.id, 'Papel Higiênico Usado', '#9ca3af', cls_classe2a),
    (sub_sanitario, NEW.id, 'Fraldas Descartáveis', '#6b7280', cls_classe2a),
    (sub_sanitario, NEW.id, 'Copos e Pratos Sujos', '#4b5563', cls_classe2a),
    (sub_sanitario, NEW.id, 'Embalagens Engraxadas', '#374151', cls_classe2a),
    (sub_sanitario, NEW.id, 'Resíduo de Varrição', '#6b7280', cls_classe2a),
    (sub_sanitario, NEW.id, 'Fezes de Animais', '#9ca3af', cls_classe2a);

  -- EPIs
  INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id) VALUES
    (sub_epis, NEW.id, 'Luvas e Máscaras Descartáveis', '#6b7280', cls_classe2a),
    (sub_epis, NEW.id, 'Panos e Estopas Sujas de Óleo', '#ef4444', cls_classe1),
    (sub_epis, NEW.id, 'Capacetes e Óculos Danificados', '#9ca3af', cls_classe2a);

  RETURN NEW;
END;
$$;

-- Recriar trigger trg_seed_client_defaults
DROP TRIGGER IF EXISTS trg_seed_client_defaults ON public.clients;
CREATE TRIGGER trg_seed_client_defaults
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_client_defaults();

-- =========================================================================
-- APLICAR CARGA DOS TIPOS PADRÕES NAS EMPRESAS JÁ EXISTENTES
-- =========================================================================

DO $$
DECLARE
  client_rec RECORD;
BEGIN
  FOR client_rec IN SELECT id FROM public.clients LOOP
    -- Inserir os setores e tipos para esse cliente usando o bloco de código
    -- Para não duplicar setor Geral caso já exista:
    IF NOT EXISTS (SELECT 1 FROM public.sectors WHERE client_id = client_rec.id AND name = 'Geral') THEN
      INSERT INTO public.sectors (client_id, name) VALUES (client_rec.id, 'Geral');
    END IF;

    -- Cadastrar os Tipos de Resíduos
    INSERT INTO public.types (subcategory_id, client_id, name, color, default_classification_id)
    SELECT 
      sub.id,
      client_rec.id,
      tp_seed.name,
      tp_seed.color,
      cls.id
    FROM (
      -- Lista temporária de mapeamentos para inserção
      VALUES
        ('Plástico', 'PET Transparente', '#60a5fa', 'Classe II B - Inerte'),
        ('Plástico', 'PET Colorido', '#3b82f6', 'Classe II B - Inerte'),
        ('Plástico', 'PEAD', '#1d4ed8', 'Classe II B - Inerte'),
        ('Plástico', 'PEBD', '#2563eb', 'Classe II B - Inerte'),
        ('Plástico', 'PVC', '#3b82f6', 'Classe II B - Inerte'),
        ('Plástico', 'PP', '#60a5fa', 'Classe II B - Inerte'),
        ('Plástico', 'ABS', '#93c5fd', 'Classe II B - Inerte'),
        ('Plástico', 'Plástico Misto', '#bfdbfe', 'Classe II B - Inerte'),
        ('Plástico', 'Copos Descartáveis', '#93c5fd', 'Classe II B - Inerte'),
        ('Plástico', 'Garrafas PET', '#3b82f6', 'Classe II B - Inerte'),
        ('Plástico', 'Embalagens Flexíveis', '#60a5fa', 'Classe II B - Inerte'),
        
        ('Papel/Papelão', 'Papel Branco', '#bfdbfe', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Jornal', '#93c5fd', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Papelão', '#60a5fa', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Arquivo Misto', '#3b82f6', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Revista', '#93c5fd', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Papel Kraft', '#60a5fa', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Cartolina', '#93c5fd', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Papel Misto', '#dbeafe', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Papel de Escritório (A4)', '#bfdbfe', 'Classe II A - Não Inerte'),
        ('Papel/Papelão', 'Caixas de Papelão', '#60a5fa', 'Classe II A - Não Inerte'),
        
        ('Vidro', 'Vidro Branco', '#34d399', 'Classe II B - Inerte'),
        ('Vidro', 'Vidro Verde', '#10b981', 'Classe II B - Inerte'),
        ('Vidro', 'Vidro Âmbar', '#059669', 'Classe II B - Inerte'),
        ('Vidro', 'Vidro Temperado', '#34d399', 'Classe II B - Inerte'),
        ('Vidro', 'Vidro Laminado', '#6ee7b7', 'Classe II B - Inerte'),
        ('Vidro', 'Cacos Mistos', '#a7f3d0', 'Classe II B - Inerte'),
        ('Vidro', 'Garrafa Inteira', '#10b981', 'Classe II B - Inerte'),
        ('Vidro', 'Vidro Misto', '#34d399', 'Classe II B - Inerte'),
        
        ('Metal', 'Ferro', '#f3f4f6', 'Classe II B - Inerte'),
        ('Metal', 'Alumínio', '#e5e7eb', 'Classe II B - Inerte'),
        ('Metal', 'Cobre', '#f59e0b', 'Classe II B - Inerte'),
        ('Metal', 'Latão', '#fbbf24', 'Classe II B - Inerte'),
        ('Metal', 'Chumbo', '#9ca3af', 'Classe I - Perigoso'),
        ('Metal', 'Metal Misturado', '#d1d5db', 'Classe II B - Inerte'),
        
        ('Restos de Alimentos', 'Restos de Refeição', '#059669', 'Classe II A - Não Inerte'),
        ('Restos de Alimentos', 'Cascas de Frutas/Legumes', '#10b981', 'Classe II A - Não Inerte'),
        ('Restos de Alimentos', 'Composto Orgânico', '#047857', 'Classe II A - Não Inerte'),
        ('Restos de Alimentos', 'Húmus', '#065f46', 'Classe II A - Não Inerte'),
        ('Restos de Alimentos', 'Biofertilizante Líquido', '#34d399', 'Classe II A - Não Inerte'),
        
        ('Jardinagem/Poda', 'Galhos e Poda', '#10b981', 'Classe II A - Não Inerte'),
        ('Jardinagem/Poda', 'Grama Cortada', '#34d399', 'Classe II A - Não Inerte'),
        ('Jardinagem/Poda', 'Folhas Secas', '#059669', 'Classe II A - Não Inerte'),
        
        ('Pilhas/Baterias', 'Pilhas Alcalinas', '#ef4444', 'Classe I - Perigoso'),
        ('Pilhas/Baterias', 'Baterias de Lítio', '#dc2626', 'Classe I - Perigoso'),
        ('Pilhas/Baterias', 'Pilhas Comuns', '#f87171', 'Classe I - Perigoso'),
        ('Pilhas/Baterias', 'Baterias de Celular', '#dc2626', 'Classe I - Perigoso'),
        ('Pilhas/Baterias', 'Placas Eletrônicas', '#991b1b', 'Classe I - Perigoso'),
        
        ('Lâmpadas', 'Lâmpadas Fluorescentes', '#fbbf24', 'Classe I - Perigoso'),
        ('Lâmpadas', 'Lâmpadas de LED', '#f59e0b', 'Classe I - Perigoso'),
        
        ('Óleos/Graxas', 'Óleo de Cozinha Usado', '#fbbf24', 'Classe I - Perigoso'),
        ('Óleos/Graxas', 'Graxas e Lubrificantes', '#d97706', 'Classe I - Perigoso'),
        
        ('Sanitário', 'Papel Higiênico Usado', '#9ca3af', 'Classe II A - Não Inerte'),
        ('Sanitário', 'Fraldas Descartáveis', '#6b7280', 'Classe II A - Não Inerte'),
        ('Sanitário', 'Copos e Pratos Sujos', '#4b5563', 'Classe II A - Não Inerte'),
        ('Sanitário', 'Embalagens Engraxadas', '#374151', 'Classe II A - Não Inerte'),
        ('Sanitário', 'Resíduo de Varrição', '#6b7280', 'Classe II A - Não Inerte'),
        ('Sanitário', 'Fezes de Animais', '#9ca3af', 'Classe II A - Não Inerte'),
        
        ('EPIs/Panos Sujos', 'Luvas e Máscaras Descartáveis', '#6b7280', 'Classe II A - Não Inerte'),
        ('EPIs/Panos Sujos', 'Panos e Estopas Sujas de Óleo', '#ef4444', 'Classe I - Perigoso'),
        ('EPIs/Panos Sujos', 'Capacetes e Óculos Danificados', '#9ca3af', 'Classe II A - Não Inerte')
    ) AS tp_seed(sub_name, name, color, class_name)
    JOIN public.subcategories sub ON sub.name = tp_seed.sub_name
    JOIN public.classifications cls ON cls.name = tp_seed.class_name
    ON CONFLICT (client_id, subcategory_id, name) DO NOTHING;

  END LOOP;
END $$;

-- =========================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- 1. CATEGORIES RLS
CREATE POLICY "Anyone authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage categories" ON public.categories FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 2. SUBCATEGORIES RLS
CREATE POLICY "Anyone authenticated can view subcategories" ON public.subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage subcategories" ON public.subcategories FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 3. TYPES RLS
CREATE POLICY "Client members can view types of own client" ON public.types FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client admin can manage types of own client" ON public.types FOR ALL USING (public.is_client_admin(auth.uid(), client_id)) WITH CHECK (public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Master admin can manage all types" ON public.types FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 4. WEIGHINGS RLS
CREATE POLICY "Client members can view weighings of own client" ON public.weighings FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client members can insert weighings of own client" ON public.weighings FOR INSERT WITH CHECK (client_id = public.get_user_client_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Client members can delete own weighings" ON public.weighings FOR DELETE USING (client_id = public.get_user_client_id(auth.uid()) AND (created_by = auth.uid() OR public.is_client_admin(auth.uid(), client_id)));
CREATE POLICY "Master admin can manage all weighings" ON public.weighings FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
