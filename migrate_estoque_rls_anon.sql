-- ============================================================
-- Fix: RLS das tabelas de estoque — usa anon (app tem auth própria)
-- ============================================================

-- Remove políticas authenticated que bloqueavam o cliente anon
DROP POLICY IF EXISTS "estoque_materiais_all"     ON estoque_materiais;
DROP POLICY IF EXISTS "estoque_movimentacoes_all" ON estoque_movimentacoes;
DROP POLICY IF EXISTS "estoque_coeficientes_all"  ON estoque_coeficientes;
DROP POLICY IF EXISTS "produtos_all"              ON produtos;

-- Cria políticas para anon (o app gerencia auth via cookie próprio)
CREATE POLICY "estoque_materiais_anon"
  ON estoque_materiais FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "estoque_movimentacoes_anon"
  ON estoque_movimentacoes FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "estoque_coeficientes_anon"
  ON estoque_coeficientes FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "produtos_anon"
  ON produtos FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Confirma que os materiais estão lá
SELECT id, nome, unidade, preco_unitario FROM estoque_materiais ORDER BY id;
