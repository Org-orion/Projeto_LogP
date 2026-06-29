-- Adiciona coluna maquinas[] em indicadores_producao
-- Execute no Supabase SQL Editor

ALTER TABLE indicadores_producao
  ADD COLUMN IF NOT EXISTS maquinas TEXT[] NOT NULL DEFAULT '{}';
