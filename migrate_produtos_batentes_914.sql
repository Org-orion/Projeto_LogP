-- Adiciona batentes 91,4cm largura × 30mm espessura
-- B207x914H: 207cm, B220x914H: 220cm, B240x914H: 240cm
-- Códigos provisórios — serão substituídos pelos códigos do Construshow futuramente

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('B207x914H',
   'C.H BATENTE 207X91,4X30MM HIDRO',
   'BATENTE_SC',
   0, true,
   91.4, 207, 30,
   'Seccionadora', 'MDF Hidro'),

  ('B220x914H',
   'C.H BATENTE 220X91,4X30MM HIDRO',
   'BATENTE_SC',
   0, true,
   91.4, 220, 30,
   'Seccionadora', 'MDF Hidro'),

  ('B240x914H',
   'C.H BATENTE 240X91,4X30MM HIDRO',
   'BATENTE_SC',
   0, true,
   91.4, 240, 30,
   'Seccionadora', 'MDF Hidro')

ON CONFLICT (codigo) DO UPDATE SET
  descricao        = EXCLUDED.descricao,
  dim_largura      = EXCLUDED.dim_largura,
  dim_comprimento  = EXCLUDED.dim_comprimento,
  dim_espessura    = EXCLUDED.dim_espessura,
  tipo_material    = EXCLUDED.tipo_material,
  maquina_entrada  = EXCLUDED.maquina_entrada,
  categoria        = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_comprimento, dim_largura, dim_espessura, volume_m3
FROM produtos
WHERE codigo IN ('B207x914H', 'B220x914H', 'B240x914H')
ORDER BY dim_comprimento;
