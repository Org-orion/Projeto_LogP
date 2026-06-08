-- Adiciona coluna para produção lançada manualmente (máquinas sem app de registro)
-- A produção total do setor = soma automática das máquinas com app + producao_manual
ALTER TABLE indicadores_producao
  ADD COLUMN IF NOT EXISTS producao_manual integer NOT NULL DEFAULT 0;
