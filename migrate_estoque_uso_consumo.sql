-- ============================================================
-- Uso e Consumo — Controle de Estoque de Materiais
-- ============================================================

-- Catálogo de materiais
CREATE TABLE IF NOT EXISTS estoque_materiais (
  id              serial PRIMARY KEY,
  nome            text NOT NULL,
  categoria       text NOT NULL DEFAULT 'painel', -- 'painel' | 'laminado' | 'outro'
  unidade         text NOT NULL DEFAULT 'm³',      -- 'm³' | 'm²' | 'kg' | 'l' | 'un'
  preco_unitario  numeric NOT NULL DEFAULT 0,       -- R$ por unidade
  estoque_minimo  numeric NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  obs             text,
  criado_em       timestamptz DEFAULT now()
);

-- Movimentações (entradas, saídas, ajustes)
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id              serial PRIMARY KEY,
  material_id     integer NOT NULL REFERENCES estoque_materiais(id),
  tipo            text NOT NULL,   -- 'entrada' | 'saida' | 'ajuste'
  data            date NOT NULL,
  quantidade      numeric NOT NULL, -- sempre positivo; tipo define a direção
  preco_unitario  numeric,          -- preço no momento da movimentação
  nota_fiscal     text,
  obs             text,
  criado_por      text,
  criado_em       timestamptz DEFAULT now()
);

-- Coeficientes de consumo por produto (integração futura com produção)
CREATE TABLE IF NOT EXISTS estoque_coeficientes (
  id                  serial PRIMARY KEY,
  material_id         integer NOT NULL REFERENCES estoque_materiais(id),
  produto             text NOT NULL,  -- nome do produto ou '*' = todos
  maquina             text,           -- máquina específica ou NULL = todas
  quantidade_por_peca numeric NOT NULL,
  ativo               boolean NOT NULL DEFAULT true
);

-- Materiais de exemplo para começar
INSERT INTO estoque_materiais (nome, categoria, unidade, preco_unitario, estoque_minimo) VALUES
  ('MDF Cru 18mm', 'painel', 'm³', 1800.00, 5),
  ('MDF Cru 15mm', 'painel', 'm³', 1750.00, 3),
  ('MDF Cru 12mm', 'painel', 'm³', 1700.00, 3),
  ('Laminado BP Branco', 'laminado', 'm²', 12.50, 200),
  ('Laminado BP Madeirado', 'laminado', 'm²', 14.00, 150)
ON CONFLICT DO NOTHING;
