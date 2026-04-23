
-- sectors
ALTER TABLE public.sectors DROP CONSTRAINT IF EXISTS sectors_client_id_fkey;
ALTER TABLE public.sectors ADD CONSTRAINT sectors_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- subcategories
ALTER TABLE public.subcategories DROP CONSTRAINT IF EXISTS subcategories_client_id_fkey;
ALTER TABLE public.subcategories ADD CONSTRAINT subcategories_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- gravimetrias
ALTER TABLE public.gravimetrias DROP CONSTRAINT IF EXISTS gravimetrias_client_id_fkey;
ALTER TABLE public.gravimetrias ADD CONSTRAINT gravimetrias_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- weighings
ALTER TABLE public.weighings DROP CONSTRAINT IF EXISTS weighings_client_id_fkey;
ALTER TABLE public.weighings ADD CONSTRAINT weighings_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.weighings DROP CONSTRAINT IF EXISTS weighings_gravimetria_id_fkey;
ALTER TABLE public.weighings ADD CONSTRAINT weighings_gravimetria_id_fkey
  FOREIGN KEY (gravimetria_id) REFERENCES public.gravimetrias(id) ON DELETE CASCADE;

ALTER TABLE public.weighings DROP CONSTRAINT IF EXISTS weighings_sector_id_fkey;
ALTER TABLE public.weighings ADD CONSTRAINT weighings_sector_id_fkey
  FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;

ALTER TABLE public.weighings DROP CONSTRAINT IF EXISTS weighings_subcategory_id_fkey;
ALTER TABLE public.weighings ADD CONSTRAINT weighings_subcategory_id_fkey
  FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;

-- user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_client_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- profiles (preserva conta auth, só desvincula)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
