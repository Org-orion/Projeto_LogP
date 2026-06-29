-- ============================================================
-- Corrige typo: comp_produzido_2_cm = 2.11 → 211
-- Operador digitou o valor em metros em vez de centímetros
-- Afeta 304 peças da SECCIONADORA 2
-- ============================================================

-- Verificar antes
SELECT id, data, maquina, larg_produzido_2_cm, comp_produzido_2_cm, qtd_producao_2
FROM registros_producao
WHERE comp_produzido_2_cm = 2.11;

-- Verificar se o mesmo erro existe em outros campos de comprimento
SELECT 'comprimento_cm'     AS campo, COUNT(*) AS n FROM registros_producao WHERE comprimento_cm      < 5 AND comprimento_cm      > 0
UNION ALL
SELECT 'comp_produzido_2_cm',         COUNT(*)        FROM registros_producao WHERE comp_produzido_2_cm < 5 AND comp_produzido_2_cm > 0
UNION ALL
SELECT 'comp_sobra_cm',               COUNT(*)        FROM registros_producao WHERE comp_sobra_cm       < 5 AND comp_sobra_cm      > 0;

-- Corrigir
UPDATE registros_producao
SET comp_produzido_2_cm = 211
WHERE comp_produzido_2_cm = 2.11;
