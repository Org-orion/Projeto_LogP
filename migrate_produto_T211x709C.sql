-- Adiciona T211x709C ao catálogo de produtos
-- Registros com largura_cm=70.9 estavam caindo em T211x715C via tolerância
-- (dist=0.6, no limite) por falta deste código. Após inserção, o match retorna
-- T211x709C diretamente (dist=0).

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('T211x709C', 'TAMPO 211X70.9X3.0MM COMUM', 'TAMPO_SC', 0, true,
   '70.9', '211', '3', 'Seccionadora', 'MDF Comum')
ON CONFLICT (codigo) DO UPDATE SET
  descricao        = EXCLUDED.descricao,
  dim_largura      = EXCLUDED.dim_largura,
  dim_comprimento  = EXCLUDED.dim_comprimento,
  dim_espessura    = EXCLUDED.dim_espessura,
  tipo_material    = EXCLUDED.tipo_material,
  maquina_entrada  = EXCLUDED.maquina_entrada,
  categoria        = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_largura, volume_m3
FROM produtos
WHERE codigo = 'T211x709C';
