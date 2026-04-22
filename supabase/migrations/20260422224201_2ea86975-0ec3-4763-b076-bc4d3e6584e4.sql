INSERT INTO public.user_roles (user_id, role, client_id)
SELECT p.id, 'client_admin'::app_role, p.client_id
FROM public.profiles p
WHERE p.id = '0e3f57ab-0a32-4b18-ace7-dd7a0ba385f3'
  AND p.client_id IS NOT NULL
ON CONFLICT (user_id, role, client_id) DO NOTHING;