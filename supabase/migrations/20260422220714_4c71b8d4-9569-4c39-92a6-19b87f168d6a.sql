
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('master_admin', 'client_admin', 'client_user');

-- =========================================
-- UTIL: updated_at trigger function
-- =========================================
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
-- CLIENTS
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
-- PROFILES
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
-- USER ROLES
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

-- =========================================
-- SECURITY DEFINER HELPERS
-- =========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'client_admin'
      AND client_id = _client_id
  )
$$;

-- =========================================
-- CATEGORIES (global)
-- =========================================
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

INSERT INTO public.categories (name, color) VALUES
  ('Orgânico', '#16a34a'),
  ('Reciclável', '#2563eb'),
  ('Perigoso', '#dc2626'),
  ('Rejeito', '#6b7280');

-- =========================================
-- SUBCATEGORIES (per client)
-- =========================================
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subcategories_updated_at BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SECTORS (per client)
-- =========================================
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

-- =========================================
-- GRAVIMETRIAS
-- =========================================
CREATE TABLE public.gravimetrias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  started_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, numero)
);
ALTER TABLE public.gravimetrias ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_gravimetrias_updated_at BEFORE UPDATE ON public.gravimetrias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- only one active gravimetria per client
CREATE UNIQUE INDEX uniq_active_gravimetria_per_client
  ON public.gravimetrias (client_id)
  WHERE ended_at IS NULL;

-- auto-numbering trigger
CREATE OR REPLACE FUNCTION public.set_gravimetria_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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

-- =========================================
-- WEIGHINGS
-- =========================================
CREATE TABLE public.weighings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gravimetria_id UUID NOT NULL REFERENCES public.gravimetrias(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  peso_kg NUMERIC(12,3) NOT NULL CHECK (peso_kg > 0),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weighings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_weighings_gravimetria ON public.weighings(gravimetria_id);
CREATE INDEX idx_weighings_client ON public.weighings(client_id);

-- =========================================
-- HANDLE NEW USER
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- =========================================
-- SEED DEFAULTS ON CLIENT CREATION
-- =========================================
CREATE OR REPLACE FUNCTION public.seed_client_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_organico UUID;
  cat_reciclavel UUID;
  cat_perigoso UUID;
BEGIN
  SELECT id INTO cat_organico FROM public.categories WHERE name = 'Orgânico' LIMIT 1;
  SELECT id INTO cat_reciclavel FROM public.categories WHERE name = 'Reciclável' LIMIT 1;
  SELECT id INTO cat_perigoso FROM public.categories WHERE name = 'Perigoso' LIMIT 1;

  -- default sector
  INSERT INTO public.sectors (client_id, name) VALUES (NEW.id, 'Geral');

  -- default subcategories
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
$$;

CREATE TRIGGER trg_seed_client_defaults
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_client_defaults();

-- =========================================
-- RLS POLICIES
-- =========================================

-- CLIENTS
CREATE POLICY "Master admin full access on clients"
  ON public.clients FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Users can view own client"
  ON public.clients FOR SELECT
  USING (id = public.get_user_client_id(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Master admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Master admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Client admin can view profiles of own client"
  ON public.profiles FOR SELECT
  USING (
    client_id IS NOT NULL
    AND public.is_client_admin(auth.uid(), client_id)
  );

CREATE POLICY "Client admin can update profiles of own client"
  ON public.profiles FOR UPDATE
  USING (
    client_id IS NOT NULL
    AND public.is_client_admin(auth.uid(), client_id)
  );

-- USER_ROLES
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Master admin full access on user_roles"
  ON public.user_roles FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Client admin can view roles of own client"
  ON public.user_roles FOR SELECT
  USING (
    client_id IS NOT NULL
    AND public.is_client_admin(auth.uid(), client_id)
  );

CREATE POLICY "Client admin can manage client_user roles of own client"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    role = 'client_user'
    AND client_id IS NOT NULL
    AND public.is_client_admin(auth.uid(), client_id)
  );

CREATE POLICY "Client admin can delete client_user roles of own client"
  ON public.user_roles FOR DELETE
  USING (
    role = 'client_user'
    AND client_id IS NOT NULL
    AND public.is_client_admin(auth.uid(), client_id)
  );

-- CATEGORIES
CREATE POLICY "Anyone authenticated can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Master admin can manage categories"
  ON public.categories FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- SUBCATEGORIES
CREATE POLICY "Master admin full access on subcategories"
  ON public.subcategories FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Client members can view subcategories"
  ON public.subcategories FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client admin can manage subcategories"
  ON public.subcategories FOR ALL
  USING (public.is_client_admin(auth.uid(), client_id))
  WITH CHECK (public.is_client_admin(auth.uid(), client_id));

-- SECTORS
CREATE POLICY "Master admin full access on sectors"
  ON public.sectors FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Client members can view sectors"
  ON public.sectors FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client admin can manage sectors"
  ON public.sectors FOR ALL
  USING (public.is_client_admin(auth.uid(), client_id))
  WITH CHECK (public.is_client_admin(auth.uid(), client_id));

-- GRAVIMETRIAS
CREATE POLICY "Master admin full access on gravimetrias"
  ON public.gravimetrias FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Client members can view gravimetrias"
  ON public.gravimetrias FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client admin can insert gravimetrias"
  ON public.gravimetrias FOR INSERT
  WITH CHECK (public.is_client_admin(auth.uid(), client_id));

CREATE POLICY "Client admin can update gravimetrias"
  ON public.gravimetrias FOR UPDATE
  USING (public.is_client_admin(auth.uid(), client_id));

CREATE POLICY "Client admin can delete gravimetrias"
  ON public.gravimetrias FOR DELETE
  USING (public.is_client_admin(auth.uid(), client_id));

-- WEIGHINGS
CREATE POLICY "Master admin full access on weighings"
  ON public.weighings FOR ALL
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Client members can view weighings"
  ON public.weighings FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client members can insert weighings"
  ON public.weighings FOR INSERT
  WITH CHECK (
    client_id = public.get_user_client_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Client members can delete own weighings"
  ON public.weighings FOR DELETE
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND (created_by = auth.uid() OR public.is_client_admin(auth.uid(), client_id))
  );
