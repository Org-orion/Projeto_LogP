-- ============================================================
-- Novos Tampos — dimensões não-padrão que aparecem na produção
-- Códigos provisórios — serão substituídos pelos do Construshow
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  -- ── Tampo Comum ───────────────────────────────────────────
  ('T211x665C',  'TAMPO 211X66.5X3.0MM COMUM',  'TAMPO_SC', 0, true,  66.5, 211, 3, 'Seccionadora', 'MDF Comum'),
  ('T226x1015C', 'TAMPO 226X101.5X3.0MM COMUM', 'TAMPO_SC', 0, true, 101.5, 226, 3, 'Seccionadora', 'MDF Comum'),
  ('T231x1015C', 'TAMPO 231X101.5X3.0MM COMUM', 'TAMPO_SC', 0, true, 101.5, 231, 3, 'Seccionadora', 'MDF Comum'),
  ('T245x1135C', 'TAMPO 245X113.5X3.0MM COMUM', 'TAMPO_SC', 0, true, 113.5, 245, 3, 'Seccionadora', 'MDF Comum'),
  ('T211x1215C', 'TAMPO 211X121.5X3.0MM COMUM', 'TAMPO_SC', 0, true, 121.5, 211, 3, 'Seccionadora', 'MDF Comum'),

  -- ── Tampo Super (MDF Hidro) ───────────────────────────────
  ('T211x755S',  'TAMPO 211X75.5X3.0MM SUPER',  'TAMPO_SC', 0, true,  75.5, 211, 3, 'Seccionadora', 'MDF Hidro'),
  ('T166x815S',  'TAMPO 166X81.5X3.0MM SUPER',  'TAMPO_SC', 0, true,  81.5, 166, 3, 'Seccionadora', 'MDF Hidro'),
  ('T221x815S',  'TAMPO 221X81.5X3.0MM SUPER',  'TAMPO_SC', 0, true,  81.5, 221, 3, 'Seccionadora', 'MDF Hidro'),
  ('T241x1115S', 'TAMPO 241X111.5X3.0MM SUPER', 'TAMPO_SC', 0, true, 111.5, 241, 3, 'Seccionadora', 'MDF Hidro')

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
WHERE codigo IN (
  'T211x665C','T226x1015C','T231x1015C','T245x1135C','T211x1215C',
  'T211x755S','T166x815S','T221x815S','T241x1115S'
)
ORDER BY tipo_material, dim_largura, dim_comprimento;
