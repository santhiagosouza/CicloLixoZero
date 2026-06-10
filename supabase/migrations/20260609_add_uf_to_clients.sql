-- =========================================
-- ADICIONAR COLUNA UF NA TABELA CLIENTS
-- =========================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SP';
