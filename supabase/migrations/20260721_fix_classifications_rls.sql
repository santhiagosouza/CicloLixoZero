-- =========================================================================
-- MIGRATION: 20260721_fix_classifications_rls.sql
-- Permite que usuários autenticados visualizem as Classificações Normativas
-- =========================================================================

-- Criar Políticas RLS para classifications
DROP POLICY IF EXISTS "Anyone authenticated can view classifications" ON public.classifications;
CREATE POLICY "Anyone authenticated can view classifications" ON public.classifications 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Master admin can manage classifications" ON public.classifications;
CREATE POLICY "Master admin can manage classifications" ON public.classifications 
  FOR ALL USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
