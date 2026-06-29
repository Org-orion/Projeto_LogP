-- ============================================================
-- Corrige registros da Moldureira de Alizar 1 e 2
-- Problema: maquina ficou vazia, nome foi gravado em n_maquina
-- Período afetado: 2024-07-08 → 2026-04-01
-- Execute no Supabase SQL Editor
-- ============================================================

UPDATE registros_producao
SET maquina = n_maquina
WHERE n_maquina IN ('MOLDUREIRA DE ALIZA 1', 'MOLDUREIRA DE ALIZA 2')
  AND (maquina IS NULL OR maquina = '');

-- Verificação: deve retornar 0 após executar o UPDATE acima
SELECT n_maquina, COUNT(*) AS registros_ainda_errados
FROM registros_producao
WHERE n_maquina IN ('MOLDUREIRA DE ALIZA 1', 'MOLDUREIRA DE ALIZA 2')
  AND (maquina IS NULL OR maquina = '')
GROUP BY n_maquina;
