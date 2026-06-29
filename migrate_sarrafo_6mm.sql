-- ============================================================
-- Sarrafo 6mm — aparece na Seccionadora 1 mas sem catálogo
-- Sistema estava matcheando ao 3mm mais próximo (volume errado)
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  ('SR244x610e6C', 'SARRAFO 244X61X6,0MM',    'SARRAFO_SC', 0, true, 61.0, 244, 6, 'Seccionadora', 'MDF Comum'),
  ('SR275x610e6C', 'SARRAFO 275X61X6,0MM',    'SARRAFO_SC', 0, true, 61.0, 275, 6, 'Seccionadora', 'MDF Comum'),
  ('SR275x614e6C', 'SARRAFO 275X61,4X6,0MM',  'SARRAFO_SC', 0, true, 61.4, 275, 6, 'Seccionadora', 'MDF Comum'),
  ('SR275x914e6C', 'SARRAFO 275X91,4X6,0MM',  'SARRAFO_SC', 0, true, 91.4, 275, 6, 'Seccionadora', 'MDF Comum'),
  ('SR275x924e6C', 'SARRAFO 275X92,4X6,0MM',  'SARRAFO_SC', 0, true, 92.4, 275, 6, 'Seccionadora', 'MDF Comum')

ON CONFLICT (codigo) DO UPDATE SET
  descricao       = EXCLUDED.descricao,
  dim_largura     = EXCLUDED.dim_largura,
  dim_comprimento = EXCLUDED.dim_comprimento,
  dim_espessura   = EXCLUDED.dim_espessura,
  tipo_material   = EXCLUDED.tipo_material,
  maquina_entrada = EXCLUDED.maquina_entrada,
  categoria       = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_largura, dim_comprimento, dim_espessura,
       ROUND(volume_m3, 6) AS volume_m3
FROM produtos
WHERE codigo IN (
  'SR244x610e6C','SR275x610e6C','SR275x614e6C',
  'SR275x914e6C','SR275x924e6C'
)
ORDER BY dim_largura, dim_comprimento;
