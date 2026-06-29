-- ============================================================
-- Novos produtos — Lixadeira 1
-- Aba de Alizar 70.9cm (vem como sobra da Seccionadora),
-- Tampos fora do padrão (larg=70.5, 101.5, 121.5)
-- Tampo Hidro 121.5 (versão Super do T211x1215C já cadastrado)
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  -- ── Aba de Alizar 70.9cm (Hidro) ─────────────────────────
  ('AA226x709H', 'ABA DE ALIZAR 226X70,9X3,0MM', 'ABA_ALIZAR_SC', 0, true, 70.9, 226, 3, 'Seccionadora', 'MDF Hidro'),
  ('AA230x709H', 'ABA DE ALIZAR 230X70,9X3,0MM', 'ABA_ALIZAR_SC', 0, true, 70.9, 230, 3, 'Seccionadora', 'MDF Hidro'),

  -- ── Tampos fora do padrão ─────────────────────────────────
  ('T211x705S',  'TAMPO 211X70.5X3.0MM SUPER',   'TAMPO_SC',      0, true,  70.5, 211, 3, 'Seccionadora', 'MDF Hidro'),
  ('T211x1015C', 'TAMPO 211X101.5X3.0MM COMUM',  'TAMPO_SC',      0, true, 101.5, 211, 3, 'Seccionadora', 'MDF Comum'),
  ('T211x1215S', 'TAMPO 211X121.5X3.0MM SUPER',  'TAMPO_SC',      0, true, 121.5, 211, 3, 'Seccionadora', 'MDF Hidro')

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
WHERE codigo IN (
  'AA226x709H','AA230x709H',
  'T211x705S','T211x1015C','T211x1215S'
)
ORDER BY categoria, dim_largura;
