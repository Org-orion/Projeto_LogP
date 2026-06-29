-- Adiciona colunas específicas da EMBALAGEM DE PERFIL em registros_producao
ALTER TABLE registros_producao
  ADD COLUMN IF NOT EXISTS modelo_batente           TEXT,
  ADD COLUMN IF NOT EXISTS unidade                  TEXT,
  ADD COLUMN IF NOT EXISTS dim_cabeceira_alizar_cm  NUMERIC,
  ADD COLUMN IF NOT EXISTS largura_rebaixo_bat_mm   NUMERIC,
  ADD COLUMN IF NOT EXISTS prof_rebaixo_bat_mm      NUMERIC;
