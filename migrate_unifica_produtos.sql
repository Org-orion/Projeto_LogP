-- ============================================================
-- Unifica produtos + produtos_catalog em uma única tabela
-- Usa id::text do catalog como codigo
-- ============================================================

-- 1. Insere os itens do catalog que ainda não existem em produtos
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario, ativo, criado_em)
SELECT
  id::text                   AS codigo,
  produto                    AS descricao,
  grupo                      AS categoria,
  0                          AS preco_unitario,
  true                       AS ativo,
  created_at                 AS criado_em
FROM produtos_catalog
WHERE id::text NOT IN (SELECT codigo FROM produtos WHERE codigo IS NOT NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Confirma o que foi inserido
SELECT COUNT(*) AS total_apos_insercao FROM produtos;

-- 2. Remove a tabela legada
DROP TABLE IF EXISTS produtos_catalog;

-- 3. Garante que a política anon existe (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'produtos_anon'
  ) THEN
    CREATE POLICY "produtos_anon" ON produtos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Confirma resultado final
SELECT categoria, COUNT(*) AS qtd
FROM produtos
GROUP BY categoria
ORDER BY categoria;
