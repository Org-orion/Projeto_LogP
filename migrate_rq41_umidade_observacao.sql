-- Adiciona coluna umidade ao controle_qualidade (RQ41)
-- A coluna observacao já existe na tabela (usada por gramatura)
ALTER TABLE controle_qualidade
  ADD COLUMN IF NOT EXISTS umidade text;
