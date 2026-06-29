-- ============================================================
-- Régua de Alizar 216x92,4x9mm Hidro — aparece na Lixadeira 1
-- 5 registros em 2 datas (abr/jun 2026), 80 conforme por batch
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('RA216x924e9H', 'RÉGUA DE ALIZAR 216X92,4X9,0MM HIDRO',
   'REGUA_ALIZAR_LX', 0, true,
   92.4, 216, 9, 'Lixadeira', 'MDF Hidro')

ON CONFLICT (codigo) DO UPDATE SET
  descricao       = EXCLUDED.descricao,
  dim_largura     = EXCLUDED.dim_largura,
  dim_comprimento = EXCLUDED.dim_comprimento,
  dim_espessura   = EXCLUDED.dim_espessura,
  tipo_material   = EXCLUDED.tipo_material,
  maquina_entrada = EXCLUDED.maquina_entrada,
  categoria       = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_comprimento, dim_largura, dim_espessura,
       tipo_material, ROUND(volume_m3, 6) AS volume_m3
FROM produtos
WHERE codigo = 'RA216x924e9H';
