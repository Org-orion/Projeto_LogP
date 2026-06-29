-- ============================================================
-- Novos produtos Seccionadora — lote 2
-- Régua de Alizar (8), Aba de Alizar (3),
-- C.H de Quadro (2), Rodapé (1), Sarrafo (3)
-- Códigos provisórios — serão substituídos pelos do Construshow
-- ============================================================

INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
  -- ── Régua de Alizar (MDF Comum) ───────────────────────────
  ('RA217x914e15C', 'REGUA DE ALIZAR 217X91,4X15MM',  'REGUA_ALIZAR_SC', 0, true, 91.4, 217, 15, 'Seccionadora', 'MDF Comum'),
  ('RA227x914e9C',  'REGUA DE ALIZAR 227X91,4X9MM',   'REGUA_ALIZAR_SC', 0, true, 91.4, 227,  9, 'Seccionadora', 'MDF Comum'),
  ('RA216x924e15C', 'REGUA DE ALIZAR 216X92,4X15MM',  'REGUA_ALIZAR_SC', 0, true, 92.4, 216, 15, 'Seccionadora', 'MDF Comum'),
  ('RA218x924e9C',  'REGUA DE ALIZAR 218X92,4X9MM',   'REGUA_ALIZAR_SC', 0, true, 92.4, 218,  9, 'Seccionadora', 'MDF Comum'),
  ('RA218x924e15C', 'REGUA DE ALIZAR 218X92,4X15MM',  'REGUA_ALIZAR_SC', 0, true, 92.4, 218, 15, 'Seccionadora', 'MDF Comum'),
  ('RA227x924e9C',  'REGUA DE ALIZAR 227X92,4X9MM',   'REGUA_ALIZAR_SC', 0, true, 92.4, 227,  9, 'Seccionadora', 'MDF Comum'),
  ('RA228x924e9C',  'REGUA DE ALIZAR 228X92,4X9MM',   'REGUA_ALIZAR_SC', 0, true, 92.4, 228,  9, 'Seccionadora', 'MDF Comum'),
  ('RA270x924e15C', 'REGUA DE ALIZAR 270X92,4X15MM',  'REGUA_ALIZAR_SC', 0, true, 92.4, 270, 15, 'Seccionadora', 'MDF Comum'),

  -- ── Aba de Alizar (MDF Hidro) ─────────────────────────────
  ('AA217x914H',    'ABA DE ALIZAR 217X91,4X3,0MM',   'ABA_ALIZAR_SC',   0, true, 91.4, 217,  3, 'Seccionadora', 'MDF Hidro'),
  ('AA217x920H',    'ABA DE ALIZAR 217X92X3,0MM',     'ABA_ALIZAR_SC',   0, true, 92.0, 217,  3, 'Seccionadora', 'MDF Hidro'),
  ('AA270x920H',    'ABA DE ALIZAR 270X92X3,0MM',     'ABA_ALIZAR_SC',   0, true, 92.0, 270,  3, 'Seccionadora', 'MDF Hidro'),

  -- ── C.H de Quadro (MDF Hidro) ─────────────────────────────
  ('Q211x620H',     'C.H DE QUADRO 211X62X30MM',      'QUADRO_SC',       0, true, 62.0, 211, 30, 'Seccionadora', 'MDF Hidro'),
  ('Q209x915H',     'C.H DE QUADRO 209X91,5X30MM',    'QUADRO_SC',       0, true, 91.5, 209, 30, 'Seccionadora', 'MDF Hidro'),

  -- ── Rodapé (MDF Comum) ────────────────────────────────────
  ('RD243x924e9C',  'RODAPÉ 243X92,4X9MM',            'RODAPE_SC',       0, true, 92.4, 243,  9, 'Seccionadora', 'MDF Comum'),

  -- ── Sarrafo (MDF Comum) ───────────────────────────────────
  ('SR246x610e3C',  'SARRAFO 246X61X3,0MM',           'SARRAFO_SC',      0, true, 61.0, 246,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x711e3C',  'SARRAFO 275X71,1X3,0MM',         'SARRAFO_SC',      0, true, 71.1, 275,  3, 'Seccionadora', 'MDF Comum'),
  ('SR275x733e3C',  'SARRAFO 275X73,3X3,0MM',         'SARRAFO_SC',      0, true, 73.3, 275,  3, 'Seccionadora', 'MDF Comum')

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
  'RA217x914e15C','RA227x914e9C',
  'RA216x924e15C','RA218x924e9C','RA218x924e15C',
  'RA227x924e9C','RA228x924e9C','RA270x924e15C',
  'AA217x914H','AA217x920H','AA270x920H',
  'Q211x620H','Q209x915H',
  'RD243x924e9C',
  'SR246x610e3C','SR275x711e3C','SR275x733e3C'
)
ORDER BY categoria, dim_largura, dim_comprimento;
