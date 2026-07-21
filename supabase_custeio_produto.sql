-- =============================================================================
-- CUSTEIO DE PRODUTO: importação de matriz de custos (planilha) + preços de
-- insumos + snapshots por produto/competência
-- Executar no SQL Editor do Supabase
-- =============================================================================

-- ─── 1. Tabelas ───────────────────────────────────────────────────────────────

-- Um registro por arquivo importado (matriz de produtos OU preços de insumos).
-- Serve de trilha de auditoria e de "período" pros gráficos de tendência.
CREATE TABLE IF NOT EXISTS custeio_imports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                text        NOT NULL
                                  CHECK (tipo IN ('matriz_produtos', 'precos_insumos')),
  nome_arquivo        text        NOT NULL,
  arquivo_url         text,
  tamanho_bytes       int,
  -- Mês de referência que este import representa. Escolhido no formulário de
  -- import, não vem da planilha. Convenção: sempre dia 1.
  competencia         date        NOT NULL,
  status              text        NOT NULL DEFAULT 'processando'
                                  CHECK (status IN ('processando', 'concluido', 'parcial', 'erro')),
  total_linhas        int         NOT NULL DEFAULT 0,
  linhas_importadas   int         NOT NULL DEFAULT 0,
  linhas_com_erro     int         NOT NULL DEFAULT 0,
  erros               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  observacoes         text        NOT NULL DEFAULT '',
  importado_por       uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  importado_por_nome  text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Uma linha por produto/SKU calculado pelo Excel, dentro de um import.
CREATE TABLE IF NOT EXISTS custeio_snapshots (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id             uuid        NOT NULL REFERENCES custeio_imports(id) ON DELETE CASCADE,
  competencia           date        NOT NULL,
  sku                   text        NOT NULL,
  descricao             text        NOT NULL,
  tipo_produto          text        NOT NULL
                                    CHECK (tipo_produto IN ('porta', 'batente', 'alizar', 'kit')),

  -- Ficha técnica/configuração (largura, altura, modelo, recobrimento...) —
  -- livre, sem normalizar. Fase 3 (editor de ficha técnica) decide se isso
  -- ganha colunas próprias depois.
  configuracao          jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Totais finais (já calculados pelo Excel)
  custo_direto          numeric(14,4) NOT NULL DEFAULT 0,
  custo_overhead        numeric(14,4) NOT NULL DEFAULT 0,
  custo_total           numeric(14,4) NOT NULL DEFAULT 0,
  preco_venda           numeric(14,4),
  margem_liquida_pct    numeric(7,4),
  margem_liquida_valor  numeric(14,4),

  -- Breakdown por categoria: {"MDF": {"valor":123.45,"percentual":12.3}, ...,
  -- "Custos Gerais": {"valor":456.7,"percentual":34.1}}
  detalhamento          jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Encargos de precificação: {"Montagem": {...}, "DIFAL": {...}, "Frete": {...}}
  encargos              jsonb       NOT NULL DEFAULT '{}'::jsonb,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_custeio_snapshot_import_sku UNIQUE (import_id, sku)
);

-- Tabela mestre de preço de insumo, versionada por import (histórico, não
-- update-in-place).
CREATE TABLE IF NOT EXISTS custeio_insumos_precos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         uuid        REFERENCES custeio_imports(id) ON DELETE CASCADE,
  competencia       date        NOT NULL,
  tipo              text        NOT NULL,
  produto           text        NOT NULL,
  unidade           text        NOT NULL,
  preco_atual       numeric(14,6) NOT NULL DEFAULT 0,
  preco_anterior    numeric(14,6),
  variacao_pct      numeric(9,4),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_custeio_insumo_import_item UNIQUE (import_id, tipo, produto)
);

-- ─── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_custeio_imports_tipo         ON custeio_imports(tipo);
CREATE INDEX IF NOT EXISTS idx_custeio_imports_competencia  ON custeio_imports(competencia);
CREATE INDEX IF NOT EXISTS idx_custeio_imports_status       ON custeio_imports(status);

CREATE INDEX IF NOT EXISTS idx_custeio_snapshots_import      ON custeio_snapshots(import_id);
CREATE INDEX IF NOT EXISTS idx_custeio_snapshots_sku         ON custeio_snapshots(sku);
CREATE INDEX IF NOT EXISTS idx_custeio_snapshots_tipo        ON custeio_snapshots(tipo_produto);
CREATE INDEX IF NOT EXISTS idx_custeio_snapshots_competencia ON custeio_snapshots(competencia);
CREATE INDEX IF NOT EXISTS idx_custeio_snapshots_sku_comp    ON custeio_snapshots(sku, competencia);

CREATE INDEX IF NOT EXISTS idx_custeio_insumos_tipo          ON custeio_insumos_precos(tipo);
CREATE INDEX IF NOT EXISTS idx_custeio_insumos_produto       ON custeio_insumos_precos(produto);
CREATE INDEX IF NOT EXISTS idx_custeio_insumos_competencia   ON custeio_insumos_precos(competencia);

-- ─── 3. Trigger updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custeio_imports_updated_at ON custeio_imports;
CREATE TRIGGER trg_custeio_imports_updated_at
  BEFORE UPDATE ON custeio_imports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_custeio_snapshots_updated_at ON custeio_snapshots;
CREATE TRIGGER trg_custeio_snapshots_updated_at
  BEFORE UPDATE ON custeio_snapshots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_custeio_insumos_updated_at ON custeio_insumos_precos;
CREATE TRIGGER trg_custeio_insumos_updated_at
  BEFORE UPDATE ON custeio_insumos_precos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. RLS (controle fino fica na aplicação, via RequirePagina/hasPageAccess) ─
-- O cliente Supabase do navegador (src/lib/supabase.ts) nunca chama
-- auth.signInWithPassword — o login deste app é 100% server-side (cookie
-- próprio, ver /api/auth/login), então toda chamada feita do browser roda
-- como role "anon" no Postgres/Storage, nunca "authenticated". As policies
-- precisam liberar "anon" também, senão INSERT/UPDATE a partir da tela falha
-- com "new row violates row-level security policy".

ALTER TABLE custeio_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE custeio_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE custeio_insumos_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custeio_imports_all" ON custeio_imports;
CREATE POLICY "custeio_imports_all" ON custeio_imports
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "custeio_snapshots_all" ON custeio_snapshots;
CREATE POLICY "custeio_snapshots_all" ON custeio_snapshots
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "custeio_insumos_precos_all" ON custeio_insumos_precos;
CREATE POLICY "custeio_insumos_precos_all" ON custeio_insumos_precos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── 5. Storage bucket para os arquivos originais (.xlsx) ─────────────────────
-- Dado financeiro sensível: bucket PRIVADO (public: false), diferente do
-- padrão de outros buckets do projeto. Re-download via createSignedUrl().

INSERT INTO storage.buckets (id, name, public)
VALUES ('custeio-planilhas', 'custeio-planilhas', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "custeio_planilhas_insert_auth" ON storage.objects;
CREATE POLICY "custeio_planilhas_insert_auth" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'custeio-planilhas');

DROP POLICY IF EXISTS "custeio_planilhas_select_auth" ON storage.objects;
CREATE POLICY "custeio_planilhas_select_auth" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'custeio-planilhas');

DROP POLICY IF EXISTS "custeio_planilhas_delete_auth" ON storage.objects;
CREATE POLICY "custeio_planilhas_delete_auth" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'custeio-planilhas');

-- ─── 6. Verificação ────────────────────────────────────────────────────────────
-- SELECT count(*) FROM custeio_imports;
-- SELECT count(*) FROM custeio_snapshots;
-- SELECT count(*) FROM custeio_insumos_precos;
