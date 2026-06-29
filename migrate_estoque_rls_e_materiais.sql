-- ============================================================
-- Uso e Consumo — RLS + materiais reais para TAMPO
-- ============================================================

-- ── 1. Habilita RLS nas 3 tabelas de estoque ────────────────
ALTER TABLE estoque_materiais    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_coeficientes  ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem (idempotente)
DROP POLICY IF EXISTS "estoque_materiais_all"     ON estoque_materiais;
DROP POLICY IF EXISTS "estoque_movimentacoes_all" ON estoque_movimentacoes;
DROP POLICY IF EXISTS "estoque_coeficientes_all"  ON estoque_coeficientes;
DROP POLICY IF EXISTS "produtos_all"              ON produtos;

-- Políticas: autenticado pode tudo
CREATE POLICY "estoque_materiais_all"
  ON estoque_materiais FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "estoque_movimentacoes_all"
  ON estoque_movimentacoes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "estoque_coeficientes_all"
  ON estoque_coeficientes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 2. RLS para tabela produtos (catálogo) ──────────────────
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_all"
  ON produtos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 3. Materiais reais para produção de TAMPO ───────────────
-- Remove dados de amostra e insere os materiais corretos
DELETE FROM estoque_materiais WHERE nome IN (
  'MDF Cru 18mm', 'MDF Cru 15mm', 'MDF Cru 12mm',
  'Laminado BP Branco', 'Laminado BP Madeirado'
);

-- Chapas brutas que entram na Seccionadora
INSERT INTO estoque_materiais (nome, categoria, unidade, preco_unitario, estoque_minimo, obs)
VALUES
  ('Chapa MDF Comum',  'painel', 'm²', 12.50, 100,
   'MDF standard — cortado na Seccionadora para TAMPO COMUM, BATENTE, ALIZAR, RODAPE'),
  ('Chapa MDF Hidro',  'painel', 'm²', 16.80, 50,
   'MDF Hidrofugado (SUPER) — cortado na Seccionadora para TAMPO SUPER')
ON CONFLICT DO NOTHING;
