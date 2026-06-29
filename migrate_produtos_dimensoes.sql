-- ============================================================
-- Dimensões de referência nos produtos + função de matching
-- ============================================================

-- Colunas de dimensão e tipo de matéria-prima na tabela produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS dim_largura     numeric,  -- cm
  ADD COLUMN IF NOT EXISTS dim_comprimento numeric,  -- cm (quando aplicável)
  ADD COLUMN IF NOT EXISTS dim_espessura   numeric,  -- mm
  ADD COLUMN IF NOT EXISTS maquina_entrada text,     -- 'Seccionadora' | 'Mesa de Montagem do Quadro'
  ADD COLUMN IF NOT EXISTS tipo_material   text;     -- tipo de chapa que origina este produto
                                                     -- ex: 'MDF Comum' | 'MDF Hidro' | 'MDF' | null=a definir

-- ── TAMPO_SC  (largura_cm × espessura_mm=3) ──────────────────────────────────
-- COMUM = MDF Comum  |  SUPER = MDF Hidro (hidrofugado)
UPDATE produtos SET dim_largura=100, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005635';
UPDATE produtos SET dim_largura=100, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005644';
UPDATE produtos SET dim_largura=102, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='014256';
UPDATE produtos SET dim_largura=110, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='14230';
UPDATE produtos SET dim_largura=110, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='006463';
UPDATE produtos SET dim_largura= 20, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='008159';
UPDATE produtos SET dim_largura= 40, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='44729';
UPDATE produtos SET dim_largura= 60, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='5631';
UPDATE produtos SET dim_largura= 60, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005640';
UPDATE produtos SET dim_largura= 62, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='5636';
UPDATE produtos SET dim_largura= 62, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005645';
UPDATE produtos SET dim_largura= 70, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='5632';
UPDATE produtos SET dim_largura= 70, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005641';
UPDATE produtos SET dim_largura= 72, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005637';
UPDATE produtos SET dim_largura= 72, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005646';
UPDATE produtos SET dim_largura= 80, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005633';
UPDATE produtos SET dim_largura= 80, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005642';
UPDATE produtos SET dim_largura= 82, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005638';
UPDATE produtos SET dim_largura= 82, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005647';
UPDATE produtos SET dim_largura= 90, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005634';
UPDATE produtos SET dim_largura= 90, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005643';
UPDATE produtos SET dim_largura= 92, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005639';
UPDATE produtos SET dim_largura= 92, dim_espessura=3.0, maquina_entrada='Seccionadora', tipo_material='MDF Hidro' WHERE codigo='005648';

-- ── RODAPE_SC  (comprimento=240cm × largura em cm × espessura=10mm) — MDF Comum
UPDATE produtos SET dim_comprimento=240, dim_largura=2.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='14154';
UPDATE produtos SET dim_comprimento=240, dim_largura=1.5, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='14153';
UPDATE produtos SET dim_comprimento=240, dim_largura=1.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='13554';
UPDATE produtos SET dim_comprimento=240, dim_largura=0.7, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='14152';

-- ── BATENTE_SC  (comprimento=218cm × largura_cm) — MDF Comum
UPDATE produtos SET dim_comprimento=218, dim_largura= 9.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005880';
UPDATE produtos SET dim_comprimento=218, dim_largura= 8.5, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005881';
UPDATE produtos SET dim_comprimento=218, dim_largura= 7.5, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005879';
UPDATE produtos SET dim_comprimento=218, dim_largura= 6.5, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='015065';
UPDATE produtos SET dim_comprimento=218, dim_largura= 5.5, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005878';
UPDATE produtos SET dim_comprimento=218, dim_largura=21.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005885';
UPDATE produtos SET dim_comprimento=218, dim_largura=18.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005884';
UPDATE produtos SET dim_comprimento=218, dim_largura=15.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005883';
UPDATE produtos SET dim_comprimento=218, dim_largura=12.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005882';
UPDATE produtos SET dim_comprimento=218, dim_largura=10.0, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='007152';

-- ── ALIZAR_REGUA_SC  (comprimento=223cm × largura_cm × espessura em mm) — MDF Comum
UPDATE produtos SET dim_comprimento=223, dim_largura= 7.0, dim_espessura=15, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='5894';
UPDATE produtos SET dim_comprimento=223, dim_largura=10.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='15939';
UPDATE produtos SET dim_comprimento=223, dim_largura= 5.0, dim_espessura=15, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='5893';
UPDATE produtos SET dim_comprimento=223, dim_largura=11.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='012515';
UPDATE produtos SET dim_comprimento=223, dim_largura= 3.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='8134';
UPDATE produtos SET dim_comprimento=223, dim_largura= 5.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005891';
UPDATE produtos SET dim_comprimento=223, dim_largura= 7.0, dim_espessura=10, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005892';

-- ── ALIZAR_ABA_SC  (comprimento=223cm × largura_cm × espessura=3mm) — MDF Comum
-- 5899 e 005900 têm mesmas dimensões: serão diferenciados por contexto de uso (a definir)
UPDATE produtos SET dim_comprimento=223, dim_largura=7.0, dim_espessura=3, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo IN ('5899','005900');
UPDATE produtos SET dim_comprimento=223, dim_largura=7.5, dim_espessura=3, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='007377';
UPDATE produtos SET dim_comprimento=223, dim_largura=5.0, dim_espessura=3, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005898';
UPDATE produtos SET dim_comprimento=223, dim_largura=2.5, dim_espessura=3, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='007374';
UPDATE produtos SET dim_comprimento=223, dim_largura=2.0, dim_espessura=3, maquina_entrada='Seccionadora', tipo_material='MDF Comum' WHERE codigo='005895';

-- ── SARRAFO  (comprimento=altura cm × largura=2.95cm × espessura=6mm ou 3mm) ──
-- espessura 6mm = chapa MDF 6mm | espessura 3mm = chapa MDF 3mm
UPDATE produtos SET dim_comprimento=100, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora', tipo_material='MDF 6mm' WHERE codigo='005688';
UPDATE produtos SET dim_comprimento=100, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014079';
UPDATE produtos SET dim_comprimento=102, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='000117';
UPDATE produtos SET dim_comprimento=102, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014080';
UPDATE produtos SET dim_comprimento=110, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='970';
UPDATE produtos SET dim_comprimento=110, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='44909';
UPDATE produtos SET dim_comprimento= 20, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='8158';
UPDATE produtos SET dim_comprimento= 60, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='14068';
UPDATE produtos SET dim_comprimento= 60, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005680';
UPDATE produtos SET dim_comprimento= 62, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014069';
UPDATE produtos SET dim_comprimento= 62, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='5690';
UPDATE produtos SET dim_comprimento= 70, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='14070';
UPDATE produtos SET dim_comprimento= 72, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='14071';
UPDATE produtos SET dim_comprimento= 70, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005682';
UPDATE produtos SET dim_comprimento= 80, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014073';
UPDATE produtos SET dim_comprimento= 72, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005692';
UPDATE produtos SET dim_comprimento= 80, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005684';
UPDATE produtos SET dim_comprimento= 82, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014077';
UPDATE produtos SET dim_comprimento= 82, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005694';
UPDATE produtos SET dim_comprimento= 90, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014075';
UPDATE produtos SET dim_comprimento= 90, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='5686';
UPDATE produtos SET dim_comprimento= 92, dim_largura=2.95, dim_espessura=6, maquina_entrada='Seccionadora' WHERE codigo='005696';
UPDATE produtos SET dim_comprimento= 92, dim_largura=2.95, dim_espessura=3, maquina_entrada='Seccionadora' WHERE codigo='014078';

-- tipo_material para os sarrafos restantes (em massa, mais simples)
UPDATE produtos SET tipo_material='MDF 3mm' WHERE categoria='SARRAFO' AND descricao LIKE '%3MM%' AND tipo_material IS NULL;
UPDATE produtos SET tipo_material='MDF 6mm' WHERE categoria='SARRAFO' AND descricao LIKE '%6MM%' AND tipo_material IS NULL;

-- ── QUADRO SÓLIDA/COLMEIA  (largura=altura cm × espessura≈29.5mm) ─────────────
-- Mesa de Montagem do Quadro — tipo_material a definir nos próximos passos
UPDATE produtos SET dim_largura= 20, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo='17632';
UPDATE produtos SET dim_largura= 40, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('18409','18418');
UPDATE produtos SET dim_largura= 57, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo='006698';
UPDATE produtos SET dim_largura= 60, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005700','005659');
UPDATE produtos SET dim_largura= 62, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005712','005671');
UPDATE produtos SET dim_largura= 70, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005704','005662');
UPDATE produtos SET dim_largura= 72, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005714','005673');
UPDATE produtos SET dim_largura= 80, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005706','005664');
UPDATE produtos SET dim_largura= 82, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('5716','005675');
UPDATE produtos SET dim_largura= 90, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005708','005667');
UPDATE produtos SET dim_largura= 92, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005718','005677');
UPDATE produtos SET dim_largura=100, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('005710','005669');
UPDATE produtos SET dim_largura=102, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('22613','014257');
UPDATE produtos SET dim_largura=110, dim_espessura=29.5, maquina_entrada='Mesa de Montagem do Quadro' WHERE codigo IN ('018407','6466');

-- ============================================================
-- Função de matching — nearest-neighbor na largura
--
-- Lógica:
--   1. Encontra a dim_largura do catálogo MAIS PRÓXIMA do valor medido
--      (sem tolerância rígida — sempre arredonda para o código mais próximo)
--   2. Dentre os produtos com essa largura, ranqueia por:
--      - espessura mais próxima
--      - comprimento mais próximo
--      - tipo_material exato (MDF Comum / MDF Hidro etc.)
--
-- Exemplo: operador mede 99,8 cm → arredonda para 100 → retorna 005635 ou 005644
-- ============================================================
CREATE OR REPLACE FUNCTION match_produto_por_dimensoes(
  p_largura        numeric,
  p_comprimento    numeric DEFAULT NULL,
  p_espessura      numeric DEFAULT NULL,
  p_maquina        text    DEFAULT NULL,
  p_tipo_material  text    DEFAULT NULL,
  p_tol_sec        numeric DEFAULT 0.6   -- tolerância para espessura e comprimento (cm/mm)
)
RETURNS TABLE(
  codigo           text,
  descricao        text,
  categoria        text,
  maquina_entrada  text,
  tipo_material    text,
  largura_ref      numeric,   -- valor do catálogo para o qual foi arredondado
  dist_largura     numeric,   -- diferença entre medida e catálogo
  confianca        int        -- 0-3: espessura + comprimento + tipo_material que bateram
) LANGUAGE sql STABLE AS $$
  WITH
  -- Passo 1: largura do catálogo mais próxima da medida (nearest-neighbor)
  nearest AS (
    SELECT MIN(ABS(p.dim_largura - p_largura)) AS min_dist
    FROM produtos p
    WHERE p.ativo = true
      AND p.dim_largura IS NOT NULL
      AND (p_maquina       IS NULL OR p.maquina_entrada = p_maquina)
      AND (p_tipo_material IS NULL OR p.tipo_material   = p_tipo_material)
  )
  -- Passo 2: todos os produtos com essa largura mais próxima,
  --          ranqueados pelos demais critérios
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
  ORDER BY confianca DESC, p.categoria, p.descricao;
$$;

-- Índice para acelerar buscas por dimensão
CREATE INDEX IF NOT EXISTS idx_produtos_dim_largura    ON produtos(dim_largura);
CREATE INDEX IF NOT EXISTS idx_produtos_dim_espessura  ON produtos(dim_espessura);
CREATE INDEX IF NOT EXISTS idx_produtos_maquina        ON produtos(maquina_entrada);
