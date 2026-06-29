-- =============================================================
-- PREVIEW: quantos registros serão apagados
-- Execute este SELECT primeiro para conferir
-- =============================================================
SELECT
  COUNT(*)                      AS total_a_apagar,
  MIN(data)                     AS data_mais_antiga,
  MAX(data)                     AS data_mais_recente,
  COUNT(DISTINCT maquina)       AS variantes_de_nome
FROM registros_producao
WHERE maquina ILIKE '%SECCIONADORA 1%'
  AND data <= '2026-03-31';

-- =============================================================
-- DELETE: apaga os registros (execute APÓS confirmar o SELECT)
-- =============================================================
DELETE FROM registros_producao
WHERE maquina ILIKE '%SECCIONADORA 1%'
  AND data <= '2026-03-31';
