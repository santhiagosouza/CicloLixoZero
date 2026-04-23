INSERT INTO public.profiles (id, full_name, email, client_id)
VALUES ('0e3f57ab-0a32-4b18-ace7-dd7a0ba385f3', 'Teste', 'teste@santhiagosouza.com.br', 'bfc7d5dd-9f2e-43cf-9a49-3fd77f6770f4')
ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id, email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role, client_id)
VALUES ('0e3f57ab-0a32-4b18-ace7-dd7a0ba385f3', 'client_admin', 'bfc7d5dd-9f2e-43cf-9a49-3fd77f6770f4')
ON CONFLICT DO NOTHING;