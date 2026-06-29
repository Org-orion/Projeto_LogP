-- ============================================================
-- Diagnóstico: produtos que aparecem nos registros mas não
-- têm match no catálogo da Seccionadora
-- Roda nas duas seccionadoras (ILIKE '%seccionadora%')
-- ============================================================

-- 1. Todas as combinações únicas de produto + dimensões nos registros
--    agrupando PRODUÇÃO 1 e PRODUÇÃO 2
SELECT
  r.maquina,
  r.produto,
  r.tipo_material,
  -- Produção 1
  r.largura_cm      AS larg1,
  r.comprimento_cm  AS comp1,
  r.espessura_mm    AS esp1,
  COUNT(*)          AS registros,
  SUM(COALESCE(r.qtd_producao_1, r.qtd_conforme, 0)) AS total_pecas
FROM registros_producao r
WHERE r.maquina ILIKE '%seccionadora%'
  AND r.data >= '2026-01-01'
  AND r.largura_cm > 0
  AND r.comprimento_cm > 0
GROUP BY r.maquina, r.produto, r.tipo_material, r.largura_cm, r.comprimento_cm, r.espessura_mm
ORDER BY r.produto, r.largura_cm, r.comprimento_cm;

-- ============================================================
-- 2. Quais dessas combinações NÃO encontram match no catálogo?
-- ============================================================
WITH combinacoes AS (
  SELECT DISTINCT
    r.maquina,
    r.produto,
    r.tipo_material        AS tipo_mat_registro,
    r.largura_cm           AS larg,
    r.comprimento_cm       AS comp,
    r.espessura_mm         AS esp,
    COUNT(*) OVER (PARTITION BY r.produto, r.largura_cm, r.comprimento_cm, r.espessura_mm) AS n_registros,
    SUM(COALESCE(r.qtd_producao_1, r.qtd_conforme, 0)) OVER (PARTITION BY r.produto, r.largura_cm, r.comprimento_cm, r.espessura_mm) AS total_pecas
  FROM registros_producao r
  WHERE r.maquina ILIKE '%seccionadora%'
    AND r.data >= '2026-01-01'
    AND r.largura_cm > 0
    AND r.comprimento_cm > 0
),
com_match AS (
  SELECT
    c.*,
    (SELECT p.codigo
     FROM produtos p
     WHERE p.ativo = true
       AND p.maquina_entrada = 'Seccionadora'
       AND ABS(p.dim_largura - c.larg) <= 1.0
       AND ABS(p.dim_comprimento - c.comp) <= 1.0
       AND (c.esp IS NULL OR p.dim_espessura IS NULL OR ABS(p.dim_espessura - c.esp) <= 5.0)
     ORDER BY ABS(p.dim_largura - c.larg) + ABS(p.dim_comprimento - c.comp)
     LIMIT 1) AS codigo_match
  FROM combinacoes c
)
SELECT
  maquina,
  produto,
  tipo_mat_registro,
  larg,
  comp,
  esp,
  n_registros,
  total_pecas,
  codigo_match,
  CASE WHEN codigo_match IS NULL THEN '*** SEM MATCH ***' ELSE 'ok' END AS status
FROM com_match
WHERE codigo_match IS NULL
ORDER BY produto, larg, comp;

-- ============================================================
-- 3. Produção 2 — verificar dimensões de prod_2 sem match
-- ============================================================
WITH combinacoes2 AS (
  SELECT DISTINCT
    r.maquina,
    r.produto,
    r.tipo_material        AS tipo_mat_registro,
    r.larg_produzido_2_cm  AS larg,
    r.comp_produzido_2_cm  AS comp,
    r.esp_produzido_2_mm   AS esp,
    COUNT(*) OVER (PARTITION BY r.produto, r.larg_produzido_2_cm, r.comp_produzido_2_cm) AS n_registros,
    SUM(COALESCE(r.qtd_producao_2, 0)) OVER (PARTITION BY r.produto, r.larg_produzido_2_cm, r.comp_produzido_2_cm) AS total_pecas2
  FROM registros_producao r
  WHERE r.maquina ILIKE '%seccionadora%'
    AND r.data >= '2026-01-01'
    AND r.larg_produzido_2_cm > 0
    AND r.comp_produzido_2_cm > 0
),
com_match2 AS (
  SELECT
    c.*,
    (SELECT p.codigo
     FROM produtos p
     WHERE p.ativo = true
       AND p.maquina_entrada = 'Seccionadora'
       AND ABS(p.dim_largura - c.larg) <= 1.0
       AND ABS(p.dim_comprimento - c.comp) <= 1.0
       AND (c.esp IS NULL OR p.dim_espessura IS NULL OR ABS(p.dim_espessura - c.esp) <= 5.0)
     ORDER BY ABS(p.dim_largura - c.larg) + ABS(p.dim_comprimento - c.comp)
     LIMIT 1) AS codigo_match
  FROM combinacoes2 c
)
SELECT
  maquina,
  produto,
  tipo_mat_registro,
  larg,
  comp,
  esp,
  n_registros,
  total_pecas2,
  codigo_match,
  CASE WHEN codigo_match IS NULL THEN '*** SEM MATCH ***' ELSE 'ok' END AS status
FROM com_match2
WHERE codigo_match IS NULL
ORDER BY produto, larg, comp;
