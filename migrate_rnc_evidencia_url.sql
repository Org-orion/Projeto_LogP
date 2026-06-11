-- Adiciona campo de link do Google Drive na tabela de RNC
ALTER TABLE rnc_relatorios
  ADD COLUMN IF NOT EXISTS evidencia_url text;
