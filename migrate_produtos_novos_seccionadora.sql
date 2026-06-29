-- ============================================================
-- Novos produtos da Seccionadora (18 itens)
-- Categorias: ABA_ALIZAR_SC, QUADRO_SC, REGUA_ALIZAR_SC,
--             RODAPE_SC, S_CORRER_SC, SARRAFO_SC, TOUPA_SC
-- Códigos provisórios — serão substituídos pelos do Construshow
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  -- ── Aba de Alizar ─────────────────────────────────────────
  ('AA226x709C',    'ABA DE ALIZAR 226X70,9X3,0MM',    'ABA_ALIZAR_SC',   0, true,  70.9, 226,  3, 'Seccionadora', 'MDF Hidro'),
  ('AA230x709C',    'ABA DE ALIZAR 230X70,9X3,0MM',    'ABA_ALIZAR_SC',   0, true,  70.9, 230,  3, 'Seccionadora', 'MDF Hidro'),
  ('AA215x920C',    'ABA DE ALIZAR 215X92X3,0MM',      'ABA_ALIZAR_SC',   0, true,  92.0, 215,  3, 'Seccionadora', 'MDF Hidro'),

  -- ── C.H de Quadro ─────────────────────────────────────────
  ('Q211x914H',     'C.H DE QUADRO 211X91,4X30MM',     'QUADRO_SC',       0, true,  91.4, 211, 30, 'Seccionadora', 'MDF Hidro'),

  -- ── Régua de Alizar ───────────────────────────────────────
  ('RA216x924e9C',  'REGUA DE ALIZAR 216X92,4X9MM',    'REGUA_ALIZAR_SC', 0, true,  92.4, 216,  9, 'Seccionadora', 'MDF Comum'),
  ('RA231x924e15C', 'REGUA DE ALIZAR 231X92,4X15MM',   'REGUA_ALIZAR_SC', 0, true,  92.4, 231, 15, 'Seccionadora', 'MDF Comum'),
  ('RA275x924e15C', 'REGUA DE ALIZAR 275X92,4X15MM',   'REGUA_ALIZAR_SC', 0, true,  92.4, 275, 15, 'Seccionadora', 'MDF Comum'),

  -- ── Rodapé ────────────────────────────────────────────────
  ('RD243x924e15C', 'RODAPÉ 243X92,4X15MM',            'RODAPE_SC',       0, true,  92.4, 243, 15, 'Seccionadora', 'MDF Comum'),

  -- ── S. de Correr ──────────────────────────────────────────
  ('SS228x614e15C', 'S. DE CORRER 228X61,4X15MM',      'S_CORRER_SC',     0, true,  61.4, 228, 15, 'Seccionadora', 'MDF Hidro'),

  -- ── Sarrafo ───────────────────────────────────────────────
  ('SR244x610e3C',  'SARRAFO 244X61X3,0MM',            'SARRAFO_SC',      0, true,  61.0, 244,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x610e3C',  'SARRAFO 275X61X3,0MM',            'SARRAFO_SC',      0, true,  61.0, 275,  3, 'Seccionadora', 'MDF Comum'),
  ('SR247x625e3C',  'SARRAFO 247X62,5X3,0MM',          'SARRAFO_SC',      0, true,  62.5, 247,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x703e3C',  'SARRAFO 275X70,3X3,0MM',          'SARRAFO_SC',      0, true,  70.3, 275,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x705e3C',  'SARRAFO 275X70,5X3,0MM',          'SARRAFO_SC',      0, true,  70.5, 275,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x924e3C',  'SARRAFO 275X92,4X3,0MM',          'SARRAFO_SC',      0, true,  92.4, 275,  3, 'Seccionadora', 'MDF Comum'),
  ('SR244x610e6C',  'SARRAFO 244X61X6MM',              'SARRAFO_SC',      0, true,  61.0, 244,  6, 'Seccionadora', 'MDF Comum'),
  ('SR275x924e6C',  'SARRAFO 275X92,4X6MM',            'SARRAFO_SC',      0, true,  92.4, 275,  6, 'Seccionadora', 'MDF Comum'),

  -- ── Toupa ─────────────────────────────────────────────────
  ('TP220x914H',    'TOUPA 220X91,4X30MM',             'TOUPA_SC',        0, true,  91.4, 220, 30, 'Seccionadora', 'MDF Hidro')

ON CONFLICT (codigo) DO UPDATE SET
  descricao        = EXCLUDED.descricao,
  dim_largura      = EXCLUDED.dim_largura,
  dim_comprimento  = EXCLUDED.dim_comprimento,
  dim_espessura    = EXCLUDED.dim_espessura,
  tipo_material    = EXCLUDED.tipo_material,
  maquina_entrada  = EXCLUDED.maquina_entrada,
  categoria        = EXCLUDED.categoria;

-- Verificar
SELECT codigo, descricao, dim_comprimento, dim_largura, dim_espessura, ROUND(volume_m3, 6) AS volume_m3
FROM produtos
WHERE codigo IN (
  'AA226x709C','AA230x709C','AA215x920C',
  'Q211x914H',
  'RA216x924e9C','RA231x924e15C','RA275x924e15C',
  'RD243x924e15C',
  'SS228x614e15C',
  'SR244x610e3C','SR275x610e3C','SR247x625e3C',
  'SR275x703e3C','SR275x705e3C','SR275x924e3C',
  'SR244x610e6C','SR275x924e6C',
  'TP220x914H'
)
ORDER BY categoria, dim_largura, dim_comprimento;
