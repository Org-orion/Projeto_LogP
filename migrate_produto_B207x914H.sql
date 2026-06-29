-- Adiciona B207x914H ao catálogo de produtos
-- Batente 207cm × 9,14cm × 30mm, MDF Hidro
-- Código provisório — será substituído pelo código do Construshow futuramente

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('B207x914H',
   'C.H BATENTE 207X9,14X30MM HIDRO',
   'BATENTE_SC',
   0,
   true,
   91.4,   -- cm
   207,    -- cm
   30,     -- mm
   'Seccionadora',
   'MDF Hidro')
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
WHERE codigo = 'B207x914H';
