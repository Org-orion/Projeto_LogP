-- ============================================================
-- Corrige typo: MOLDUREIRA DE ALIZA → MOLDUREIRA DE ALIZAR
-- O campo maquina foi gravado sem o R final em 7495 registros.
-- Execute no Supabase SQL Editor
-- ============================================================

UPDATE registros_producao
SET maquina = 'MOLDUREIRA DE ALIZAR 1'
WHERE maquina = 'MOLDUREIRA DE ALIZA 1';

UPDATE registros_producao
SET maquina = 'MOLDUREIRA DE ALIZAR 2'
WHERE maquina = 'MOLDUREIRA DE ALIZA 2';

-- Verificação: deve retornar as contagens corrigidas
SELECT maquina, COUNT(*) AS registros
FROM registros_producao
WHERE maquina IN ('MOLDUREIRA DE ALIZAR 1', 'MOLDUREIRA DE ALIZAR 2')
GROUP BY maquina
ORDER BY maquina;
