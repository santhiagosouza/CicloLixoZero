-- =========================================
-- ENUMS E FUNÇÕES AUXILIARES
-- =========================================
CREATE TYPE public.app_role AS ENUM ('master_admin', 'client_admin', 'client_user');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- CLIENTS (Inquilinos/Tenants)
-- =========================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- PROFILES (Perfis de Usuários)
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES (Papéis e Permissões)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, client_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helpers de Segurança
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'client_admin'
      AND client_id = _client_id
  )
$$;

-- =========================================
-- HIERARQUIA DE RESÍDUOS (4 NÍVEIS)
-- =========================================

-- Nível 4: Classificações (Global)
CREATE TABLE public.classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;

-- Nível 1: Categorias (Global)
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

-- Nível 2: Tipos (Global, vinculados a Categorias e com Classificação Padrão)
CREATE TABLE public.types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  default_classification_id UUID REFERENCES public.classifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
ALTER TABLE public.types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_types_updated_at BEFORE UPDATE ON public.types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Nível 3: Subcategorias (Multi-tenant ou Padrão Global)
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- Nullable = Global/Padrão
  type_id UUID NOT NULL REFERENCES public.types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, type_id, name)
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_subcategories_updated_at BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- NEGÓCIO: SETORES, GRAVIMETRIAS E PESAGENS
-- =========================================

-- Setores (Multi-tenant)
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_sectors_updated_at BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gravimetrias (Multi-tenant)
CREATE TABLE public.gravimetrias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  sample_days INTEGER,
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, numero)
);
ALTER TABLE public.gravimetrias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_gravimetrias_updated_at BEFORE UPDATE ON public.gravimetrias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apenas uma gravimetria ativa por cliente
CREATE UNIQUE INDEX uniq_active_gravimetria_per_client
  ON public.gravimetrias (client_id)
  WHERE ended_at IS NULL;

-- Auto-incremento do número da gravimetria por cliente
CREATE OR REPLACE FUNCTION public.set_gravimetria_numero()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1
      INTO NEW.numero
      FROM public.gravimetrias
      WHERE client_id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gravimetrias_set_numero
  BEFORE INSERT ON public.gravimetrias
  FOR EACH ROW EXECUTE FUNCTION public.set_gravimetria_numero();

-- Pesagens (Weighings) - Registros Físicos
CREATE TABLE public.weighings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gravimetria_id UUID NOT NULL REFERENCES public.gravimetrias(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type_id UUID NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  classification_id UUID NOT NULL REFERENCES public.classifications(id) ON DELETE RESTRICT,
  peso_kg NUMERIC(12,3) NOT NULL CHECK (peso_kg > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weighings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_weighings_gravimetria ON public.weighings(gravimetria_id);
CREATE INDEX idx_weighings_client ON public.weighings(client_id);

-- =========================================
-- TRIGGERS DE AUTOMAÇÃO E SETUP
-- =========================================

-- Trigger para criar perfil de usuário a partir do Auth.Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, client_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'client_id', '')::UUID
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para inserir setores padrão e subcategorias padrão no cadastro de cliente
CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Cria setor Geral
  INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_client_defaults
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_client_defaults();

-- =========================================
-- SEED DE DADOS INICIAIS (PADRÕES GLOBAIS)
-- =========================================

-- Classificações
INSERT INTO public.classifications (name, description) VALUES
  ('Classe I - Perigoso', 'Resíduos que apresentam periculosidade, inflamabilidade, corrosividade, reatividade, toxicidade ou patogenicidade.'),
  ('Classe II A - Não Inerte', 'Resíduos não inertes que podem apresentar propriedades de biodegradabilidade, combustibilidade ou solubilidade em água.'),
  ('Classe II B - Inerte', 'Resíduos que não são solubilizados nem sofrem alterações físicas, químicas ou biológicas ao entrar em contato com a água.');

-- Categorias (com cores padrão de sustentabilidade)
INSERT INTO public.categories (name, color) VALUES
  ('Orgânico', '#10b981'),   -- Emerald-500
  ('Reciclável', '#3b82f6'), -- Blue-500
  ('Perigoso', '#ef4444'),   -- Red-500
  ('Rejeito', '#6b7280');    -- Gray-500

-- Tipos padrão com classificação padrão
DO $$
DECLARE
  cat_reciclavel UUID;
  cat_organico UUID;
  cat_perigoso UUID;
  cat_rejeito UUID;
  cls_classe1 UUID;
  cls_classe2a UUID;
  cls_classe2b UUID;
BEGIN
  -- Pega IDs das categorias
  SELECT id INTO cat_reciclavel FROM public.categories WHERE name = 'Reciclável' LIMIT 1;
  SELECT id INTO cat_organico FROM public.categories WHERE name = 'Orgânico' LIMIT 1;
  SELECT id INTO cat_perigoso FROM public.categories WHERE name = 'Perigoso' LIMIT 1;
  SELECT id INTO cat_rejeito FROM public.categories WHERE name = 'Rejeito' LIMIT 1;
  
  -- Pega IDs das classificações
  SELECT id INTO cls_classe1 FROM public.classifications WHERE name = 'Classe I - Perigoso' LIMIT 1;
  SELECT id INTO cls_classe2a FROM public.classifications WHERE name = 'Classe II A - Não Inerte' LIMIT 1;
  SELECT id INTO cls_classe2b FROM public.classifications WHERE name = 'Classe II B - Inerte' LIMIT 1;

  -- Insere Tipos de resíduos e vincula à classificação padrão
  -- Plástico (Reciclável -> Classe II B)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_reciclavel, 'Plástico', '#60a5fa', cls_classe2b);
  
  -- Papel/Papelão (Reciclável -> Classe II A)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_reciclavel, 'Papel/Papelão', '#93c5fd', cls_classe2a);
  
  -- Vidro (Reciclável -> Classe II B)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_reciclavel, 'Vidro', '#34d399', cls_classe2b);
  
  -- Metal (Reciclável -> Classe II B)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_reciclavel, 'Metal', '#f3f4f6', cls_classe2b);
  
  -- Alimento (Orgânico -> Classe II A)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_organico, 'Restos de Alimentos', '#059669', cls_classe2a);
  
  -- Jardinagem (Orgânico -> Classe II A)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_organico, 'Jardinagem/Poda', '#10b981', cls_classe2a);
  
  -- Pilhas/Baterias (Perigoso -> Classe I)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_perigoso, 'Pilhas/Baterias', '#f87171', cls_classe1);
  
  -- Lâmpadas (Perigoso -> Classe I)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_perigoso, 'Lâmpadas', '#fbbf24', cls_classe1);
  
  -- Óleo de Cozinha (Perigoso/Reciclável -> Classe I ou II A)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_perigoso, 'Óleos/Graxas', '#f59e0b', cls_classe1);
  
  -- Sanitários (Rejeito -> Classe II A)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_rejeito, 'Sanitário', '#9ca3af', cls_classe2a);
  
  -- EPIs Sujos (Rejeito -> Classe II A ou I)
  INSERT INTO public.types (category_id, name, color, default_classification_id)
  VALUES (cat_rejeito, 'EPIs/Panos Sujos', '#4b5563', cls_classe2a);
END $$;

-- Subcategorias padrões globais (client_id IS NULL)
DO $$
DECLARE
  tp_plastico UUID;
  tp_papel UUID;
  tp_alimento UUID;
  tp_pilhas UUID;
BEGIN
  SELECT id INTO tp_plastico FROM public.types WHERE name = 'Plástico' LIMIT 1;
  SELECT id INTO tp_papel FROM public.types WHERE name = 'Papel/Papelão' LIMIT 1;
  SELECT id INTO tp_alimento FROM public.types WHERE name = 'Restos de Alimentos' LIMIT 1;
  SELECT id INTO tp_pilhas FROM public.types WHERE name = 'Pilhas/Baterias' LIMIT 1;

  INSERT INTO public.subcategories (client_id, type_id, name) VALUES
    (NULL, tp_plastico, 'Copos Descartáveis'),
    (NULL, tp_plastico, 'Garrafas PET'),
    (NULL, tp_plastico, 'Embalagens Flexíveis'),
    (NULL, tp_papel, 'Papel de Escritório (A4)'),
    (NULL, tp_papel, 'Caixas de Papelão'),
    (NULL, tp_alimento, 'Restos de Refeição'),
    (NULL, tp_alimento, 'Cascas de Frutas/Legumes'),
    (NULL, tp_pilhas, 'Pilhas Alcalinas'),
    (NULL, tp_pilhas, 'Baterias de Lítio');
END $$;

-- =========================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =========================================

-- 1. CLIENTS
CREATE POLICY "Master admin full access on clients" ON public.clients FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
CREATE POLICY "Users can view own client" ON public.clients FOR SELECT USING (id = public.get_user_client_id(auth.uid()));

-- 2. PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Master admin can view all profiles" ON public.profiles FOR SELECT USING (public.is_master_admin(auth.uid()));
CREATE POLICY "Master admin can update all profiles" ON public.profiles FOR UPDATE USING (public.is_master_admin(auth.uid()));
CREATE POLICY "Client admin can view profiles of own client" ON public.profiles FOR SELECT USING (client_id IS NOT NULL AND public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Client admin can update profiles of own client" ON public.profiles FOR UPDATE USING (client_id IS NOT NULL AND public.is_client_admin(auth.uid(), client_id));

-- 3. USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Master admin full access on user_roles" ON public.user_roles FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
CREATE POLICY "Client admin can view roles of own client" ON public.user_roles FOR SELECT USING (client_id IS NOT NULL AND public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Client admin can manage client_user roles of own client" ON public.user_roles FOR INSERT WITH CHECK (role = 'client_user' AND client_id IS NOT NULL AND public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Client admin can delete client_user roles of own client" ON public.user_roles FOR DELETE USING (role = 'client_user' AND client_id IS NOT NULL AND public.is_client_admin(auth.uid(), client_id));

-- 4. CLASSIFICATIONS
CREATE POLICY "Anyone authenticated can view classifications" ON public.classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage classifications" ON public.classifications FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 5. CATEGORIES
CREATE POLICY "Anyone authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage categories" ON public.categories FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 6. TYPES
CREATE POLICY "Anyone authenticated can view types" ON public.types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage types" ON public.types FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 7. SUBCATEGORIES
CREATE POLICY "Anyone authenticated can view global subcategories" ON public.subcategories FOR SELECT TO authenticated USING (client_id IS NULL);
CREATE POLICY "Client members can view subcategories of own client" ON public.subcategories FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client admin can manage subcategories of own client" ON public.subcategories FOR ALL USING (public.is_client_admin(auth.uid(), client_id)) WITH CHECK (public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Master admin can manage all subcategories" ON public.subcategories FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 8. SECTORS
CREATE POLICY "Client members can view sectors of own client" ON public.sectors FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client admin can manage sectors of own client" ON public.sectors FOR ALL USING (public.is_client_admin(auth.uid(), client_id)) WITH CHECK (public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Master admin can manage all sectors" ON public.sectors FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 9. GRAVIMETRIAS
CREATE POLICY "Client members can view gravimetrias of own client" ON public.gravimetrias FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client admin can manage gravimetrias of own client" ON public.gravimetrias FOR ALL USING (public.is_client_admin(auth.uid(), client_id)) WITH CHECK (public.is_client_admin(auth.uid(), client_id));
CREATE POLICY "Master admin can manage all gravimetrias" ON public.gravimetrias FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- 10. WEIGHINGS
CREATE POLICY "Client members can view weighings of own client" ON public.weighings FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Client members can insert weighings of own client" ON public.weighings FOR INSERT WITH CHECK (client_id = public.get_user_client_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Client members can delete own weighings" ON public.weighings FOR DELETE USING (client_id = public.get_user_client_id(auth.uid()) AND (created_by = auth.uid() OR public.is_client_admin(auth.uid(), client_id)));
CREATE POLICY "Master admin can manage all weighings" ON public.weighings FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
