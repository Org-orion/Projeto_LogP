-- ============================================================
-- Adiciona coluna volume_m3 gerada automaticamente em produtos
-- Fórmula: dim_largura(cm) × dim_comprimento(cm) × dim_espessura(mm) / 10.000.000
-- Resultado em m³ por peça
-- NULL quando qualquer dimensão não estiver preenchida
-- ============================================================

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS volume_m3 numeric
    GENERATED ALWAYS AS (
      ROUND(
        (dim_largura * dim_comprimento * dim_espessura / 10000000.0)::numeric,
        6
      )
    ) STORED;

-- Confirma: mostra tampos com volume calculado
SELECT codigo, descricao, dim_largura, dim_comprimento, dim_espessura, volume_m3
FROM produtos
WHERE categoria = 'TAMPO_SC'
  AND volume_m3 IS NOT NULL
ORDER BY descricao
LIMIT 10;
