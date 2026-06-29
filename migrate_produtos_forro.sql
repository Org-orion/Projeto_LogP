-- Forro — 3 produtos (MDF Hidro)
-- Códigos provisórios — serão substituídos pelos do Construshow

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('FR218x924e15H',  'FORRO 218X92,4X15MM HIDRO',  'FORRO_SC', 0, true,  92.4, 218, 15, 'Seccionadora', 'MDF Hidro'),
  ('FR217x970e15H',  'FORRO 217X97X15MM HIDRO',     'FORRO_SC', 0, true,  97.0, 217, 15, 'Seccionadora', 'MDF Hidro'),
  ('FR220x1220e15H', 'FORRO 220X122X15MM HIDRO',    'FORRO_SC', 0, true, 122.0, 220, 15, 'Seccionadora', 'MDF Hidro')

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
WHERE codigo IN ('FR218x924e15H', 'FR217x970e15H', 'FR220x1220e15H')
ORDER BY dim_largura;
