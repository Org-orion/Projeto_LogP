-- Adiciona T241x935H ao catálogo de produtos
-- Tampo Hidro 241cm × 93,5cm × 3mm
-- Código provisório — será substituído pelo código do Construshow futuramente

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('T241x935H',
   'TAMPO HIDRO 241X93,5X3MM',
   'TAMPO_SC',
   0, true,
   93.5, 241, 3,
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
SELECT codigo, descricao, dim_comprimento, dim_largura, dim_espessura,
       ROUND(volume_m3, 6) AS volume_m3
FROM produtos
WHERE codigo = 'T241x935H';
