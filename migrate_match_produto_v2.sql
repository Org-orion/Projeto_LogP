-- ============================================================
-- match_produto_por_dimensoes v2
-- Corrige falso-match quando produtos com espessuras muito
-- diferentes compartilham a mesma largura (ex: tampo 3mm vs
-- batente 30mm com largura ≈ 91,4 cm).
--
-- Mudança: adiciona pré-filtro de espessura no CTE `nearest`
-- (tolerância 5 mm). Assim tampos (3mm) nunca competem com
-- batentes (30mm) no nearest-neighbor de largura.
-- ============================================================

-- Remove a versão anterior (assinatura de 6 parâmetros) para evitar ambiguidade
DROP FUNCTION IF EXISTS match_produto_por_dimensoes(numeric, numeric, numeric, text, text, numeric);

CREATE OR REPLACE FUNCTION match_produto_por_dimensoes(
  p_largura        numeric,
  p_comprimento    numeric DEFAULT NULL,
  p_espessura      numeric DEFAULT NULL,
  p_maquina        text    DEFAULT NULL,
  p_tipo_material  text    DEFAULT NULL,
  p_tol_sec        numeric DEFAULT 0.6,
  p_tol_esp        numeric DEFAULT 5.0   -- tolerância de pré-filtro para espessura (mm)
)
RETURNS TABLE(
  codigo           text,
  descricao        text,
  categoria        text,
  maquina_entrada  text,
  tipo_material    text,
  largura_ref      numeric,
  dist_largura     numeric,
  confianca        int
) LANGUAGE sql STABLE AS $$
  WITH
  nearest AS (
    SELECT MIN(ABS(p.dim_largura - p_largura)) AS min_dist
    FROM produtos p
    WHERE p.ativo = true
      AND p.dim_largura IS NOT NULL
      AND (p_maquina       IS NULL OR p.maquina_entrada = p_maquina)
      AND (p_tipo_material IS NULL OR p.tipo_material   = p_tipo_material)
      -- pré-filtro espessura: ignora produtos com espessura muito diferente
      AND (p_espessura     IS NULL OR p.dim_espessura   IS NULL
           OR ABS(p.dim_espessura - p_espessura) <= p_tol_esp)
  )
  SELECT
    p.codigo,
    p.descricao,
    p.categoria,
    p.maquina_entrada,
    p.tipo_material,
    p.dim_largura                         AS largura_ref,
    ABS(p.dim_largura - p_largura)        AS dist_largura,
    (
      CASE WHEN p.dim_espessura IS NOT NULL AND p_espessura IS NOT NULL
                AND ABS(p.dim_espessura - p_espessura) <= p_tol_sec         THEN 1 ELSE 0 END
    + CASE WHEN p.dim_comprimento IS NOT NULL AND p_comprimento IS NOT NULL
                AND ABS(p.dim_comprimento - p_comprimento) <= p_tol_sec     THEN 1 ELSE 0 END
    + CASE WHEN p.tipo_material IS NOT NULL AND p_tipo_material IS NOT NULL
                AND p.tipo_material = p_tipo_material                       THEN 1 ELSE 0 END
    )::int AS confianca
  FROM produtos p, nearest
  WHERE p.ativo = true
    AND p.dim_largura IS NOT NULL
    AND ABS(p.dim_largura - p_largura) = nearest.min_dist
    AND (p_maquina       IS NULL OR p.maquina_entrada = p_maquina)
    AND (p_tipo_material IS NULL OR p.tipo_material   = p_tipo_material)
    AND (p_espessura     IS NULL OR p.dim_espessura   IS NULL
         OR ABS(p.dim_espessura - p_espessura) <= p_tol_esp)
  ORDER BY confianca DESC, p.categoria, p.descricao;
$$;

GRANT EXECUTE ON FUNCTION match_produto_por_dimensoes(numeric,numeric,numeric,text,text,numeric,numeric) TO anon;
GRANT EXECUTE ON FUNCTION match_produto_por_dimensoes(numeric,numeric,numeric,text,text,numeric,numeric) TO authenticated;

-- Teste: tampo (esp=3mm) não deve retornar batente (esp=30mm)
SELECT codigo, descricao, largura_ref, confianca
FROM match_produto_por_dimensoes(91.4, 211, 3, 'Seccionadora', NULL);

-- Teste: batente (esp=30mm) deve retornar B207x914H
SELECT codigo, descricao, largura_ref, confianca
FROM match_produto_por_dimensoes(91.4, 207, 30, 'Seccionadora', NULL);
