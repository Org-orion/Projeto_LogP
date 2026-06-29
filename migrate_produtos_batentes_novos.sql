-- ============================================================
-- Novos C.H de Batente — comprimentos faltantes
-- Inclui variantes pré-cola (esp=15mm): 2 chapas de 15mm
-- serão coladas para formar 1 batente de 30mm
-- Códigos provisórios — serão substituídos pelos do Construshow
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  -- ── Batentes 30mm (produto final) ─────────────────────────
  ('B209x914H',    'C.H BATENTE 209X91,4X30MM HIDRO',          'BATENTE_SC', 0, true, 91.4, 209, 30, 'Seccionadora', 'MDF Hidro'),
  ('B225x914H',    'C.H BATENTE 225X91,4X30MM HIDRO',          'BATENTE_SC', 0, true, 91.4, 225, 30, 'Seccionadora', 'MDF Hidro'),
  ('B260x914H',    'C.H BATENTE 260X91,4X30MM HIDRO',          'BATENTE_SC', 0, true, 91.4, 260, 30, 'Seccionadora', 'MDF Hidro'),
  ('B275x914H',    'C.H BATENTE 275X91,4X30MM HIDRO',          'BATENTE_SC', 0, true, 91.4, 275, 30, 'Seccionadora', 'MDF Hidro'),

  -- ── Batentes 15mm pré-cola (2 peças → 1 batente 30mm) ────
  ('B214x914e15H', 'C.H BATENTE PRE-COLA 214X91,4X15MM HIDRO', 'BATENTE_SC', 0, true, 91.4, 214, 15, 'Seccionadora', 'MDF Hidro'),
  ('B217x914e15H', 'C.H BATENTE PRE-COLA 217X91,4X15MM HIDRO', 'BATENTE_SC', 0, true, 91.4, 217, 15, 'Seccionadora', 'MDF Hidro')

ON CONFLICT (codigo) DO UPDATE SET
  descricao        = EXCLUDED.descricao,
  dim_largura      = EXCLUDED.dim_largura,
  dim_comprimento  = EXCLUDED.dim_comprimento,
  dim_espessura    = EXCLUDED.dim_espessura,
  tipo_material    = EXCLUDED.tipo_material,
  maquina_entrada  = EXCLUDED.maquina_entrada,
  categoria        = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_comprimento, dim_largura, dim_espessura,
       ROUND(volume_m3, 6) AS volume_m3
FROM produtos
WHERE codigo IN ('B209x914H','B225x914H','B260x914H','B275x914H','B214x914e15H','B217x914e15H')
ORDER BY dim_espessura, dim_comprimento;
