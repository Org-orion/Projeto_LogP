-- ============================================================
-- Uso e Consumo — Setup COMPLETO (idempotente)
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 1. Cria tabelas (se não existirem) ──────────────────────

CREATE TABLE IF NOT EXISTS estoque_materiais (
  id              serial PRIMARY KEY,
  nome            text NOT NULL,
  categoria       text NOT NULL DEFAULT 'painel',
  unidade         text NOT NULL DEFAULT 'm²',
  preco_unitario  numeric NOT NULL DEFAULT 0,
  estoque_minimo  numeric NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  obs             text,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id              serial PRIMARY KEY,
  material_id     integer NOT NULL REFERENCES estoque_materiais(id),
  tipo            text NOT NULL,
  data            date NOT NULL,
  quantidade      numeric NOT NULL,
  preco_unitario  numeric,
  nota_fiscal     text,
  obs             text,
  criado_por      text,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_coeficientes (
  id                  serial PRIMARY KEY,
  material_id         integer NOT NULL REFERENCES estoque_materiais(id),
  produto             text NOT NULL,
  maquina             text,
  quantidade_por_peca numeric NOT NULL,
  ativo               boolean NOT NULL DEFAULT true
);

-- ── 2. RLS ──────────────────────────────────────────────────

ALTER TABLE estoque_materiais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_coeficientes  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estoque_materiais' AND policyname = 'estoque_materiais_all'
  ) THEN
    CREATE POLICY "estoque_materiais_all"
      ON estoque_materiais FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estoque_movimentacoes' AND policyname = 'estoque_movimentacoes_all'
  ) THEN
    CREATE POLICY "estoque_movimentacoes_all"
      ON estoque_movimentacoes FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estoque_coeficientes' AND policyname = 'estoque_coeficientes_all'
  ) THEN
    CREATE POLICY "estoque_coeficientes_all"
      ON estoque_coeficientes FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 3. Insere materiais reais (chapas de MDF) ───────────────
-- Remove dados de exemplo antigos
DELETE FROM estoque_materiais
WHERE nome IN ('MDF Cru 18mm','MDF Cru 15mm','MDF Cru 12mm',
               'Laminado BP Branco','Laminado BP Madeirado');

-- Chapas brutas que entram na Seccionadora → produzem TAMPOs
INSERT INTO estoque_materiais (nome, categoria, unidade, preco_unitario, estoque_minimo, obs)
SELECT nome, categoria, unidade, preco_unitario, estoque_minimo, obs
FROM (VALUES
  ('Chapa MDF Comum', 'painel', 'm²', 12.50, 100,
   'MDF standard — Seccionadora → TAMPO COMUM, BATENTE, ALIZAR, RODAPE'),
  ('Chapa MDF Hidro',  'painel', 'm²', 16.80, 50,
   'MDF Hidrofugado — Seccionadora → TAMPO SUPER')
) AS v(nome, categoria, unidade, preco_unitario, estoque_minimo, obs)
WHERE NOT EXISTS (
  SELECT 1 FROM estoque_materiais m WHERE m.nome = v.nome
);

-- ── 4. Confirma ─────────────────────────────────────────────
SELECT id, nome, categoria, unidade, preco_unitario, estoque_minimo
FROM estoque_materiais
ORDER BY id;
