-- =============================================================================
-- CUSTEIO DE PRODUTO — MOTOR DE CÁLCULO (Fase 2)
-- Catálogo de insumos + ficha técnica (regras de consumo) + overhead + exceções
-- de consolidação, extraídos e validados a partir de
-- Custo_de_Produção_2025.15.04.xlsx (ver C:\Users\PC101\Desktop\Custeio\extracao_custo_producao)
-- Executar no SQL Editor do Supabase, depois de supabase_custeio_produto.sql
-- =============================================================================

-- ─── 1. Camada 0 — Catálogo de insumos ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custeio_insumos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text        NOT NULL,   -- MDF, Recobrimento, Fita de Borda, Cola, Pintura, Embalagem, Pallet, Borracha, Ferragem
  produto         text        NOT NULL,
  chave           text        NOT NULL,   -- tipo||produto, montada na aplicação — bate com a Chave da planilha
  unidade         text        NOT NULL,
  preco_atual     numeric(14,6) NOT NULL DEFAULT 0,
  preco_anterior  numeric(14,6),
  -- false para itens órfãos (ex.: "MDF 3 RU Berneck", nunca referenciado por
  -- nenhuma regra de consumo — mantido só de registro histórico).
  ativo           boolean     NOT NULL DEFAULT true,
  observacao      text        NOT NULL DEFAULT '',
  atualizado_em   date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_custeio_insumos_chave UNIQUE (chave)
);

-- ─── 2. Camada 1 — Regras de consumo (ficha técnica) ──────────────────────────

CREATE TABLE IF NOT EXISTS custeio_regras_consumo (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  componente     text        NOT NULL CHECK (componente IN ('porta', 'batente', 'alizar', 'kit')),
  categoria      text        NOT NULL,   -- MDF, Recobrimento, Fita de Borda, Cola, Pintura, Embalagem, Pallet, Ferragem
  -- Nome do item de custo — bate com custeio_insumos.produto (join por
  -- categoria=tipo, item=produto) quando aplicável. Pode conter um placeholder
  -- tipo "{L}" que a aplicação substitui pela largura antes de casar
  -- (ex.: item "Colméia {L}" -> "Colméia 70").
  item           text        NOT NULL,
  ordem          int         NOT NULL DEFAULT 1,
  -- Expressão booleana em texto (ex.: "Enchimento = 'Colméia'"); vazio = regra
  -- sempre válida. Quando há mais de uma regra pro mesmo item, a aplicação
  -- avalia em ordem e usa a primeira cuja condição seja satisfeita.
  condicao       text        NOT NULL DEFAULT '',
  tipo_valor     text        NOT NULL CHECK (tipo_valor IN ('fixo', 'formula', 'lookup')),
  valor_fixo     numeric(16, 8),
  -- Expressão aritmética em texto usando as variáveis documentadas em
  -- 02_regras_de_consumo.md (L, A, Modelo, Ench, LB, Esp, Vista, Reg, e,
  -- Linha, Padrao, Acabamento...), avaliada por um interpretador seguro.
  formula        text,
  lookup_tabela  text,       -- nome de uma tabela custeio_param_*
  lookup_chave   text,       -- expressão de montagem da chave de busca
  lookup_coluna  text,       -- coluna a extrair do resultado do lookup
  unidade        text,
  observacao     text        NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. Camada 1b — Tabelas de parâmetro (espelham os CSVs extraídos) ─────────

CREATE TABLE IF NOT EXISTS custeio_param_batente_larguras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  largura_cm   numeric NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS custeio_param_alizar_perfis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espessura_mm    numeric NOT NULL,
  perfil          text    NOT NULL,   -- ex.: "7x9Plus", "5x10.3"
  vista_cm        numeric NOT NULL,
  regulagem_cm    numeric NOT NULL,
  coef_x_berneck  numeric,
  observacao      text    NOT NULL DEFAULT '',

  CONSTRAINT uq_custeio_param_alizar_perfis UNIQUE (espessura_mm, perfil)
);

CREATE TABLE IF NOT EXISTS custeio_param_embalagem (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  componente   text    NOT NULL,   -- Porta, Alizar, Kit
  item         text    NOT NULL,
  unidade      text    NOT NULL,
  quantidade   numeric NOT NULL,

  CONSTRAINT uq_custeio_param_embalagem UNIQUE (componente, item)
);

CREATE TABLE IF NOT EXISTS custeio_param_ferragem (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- "item_custeio" NÃO é único: itens do kit de correr (guia, parador, trilho,
  -- roldana) compartilham o mesmo rótulo "Correr" — cada linha é uma peça
  -- comprada distinta dentro daquele grupo.
  item_custeio           text    NOT NULL,
  descricao_compra       text    NOT NULL,   -- descrição + código do produto comprado
  quantidade_por_kit     numeric NOT NULL,
  valor_unit_referencia  numeric,

  CONSTRAINT uq_custeio_param_ferragem UNIQUE (item_custeio, descricao_compra)
);

-- Corrige a constraint de uma execução anterior deste script (idempotente).
ALTER TABLE custeio_param_ferragem DROP CONSTRAINT IF EXISTS custeio_param_ferragem_item_custeio_key;

CREATE TABLE IF NOT EXISTS custeio_param_mapa_recobrimento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recobrimento   text NOT NULL UNIQUE,
  tipo           text NOT NULL,   -- Melamínico | PET
  fita_de_borda  text NOT NULL,
  borracha       text NOT NULL
);

CREATE TABLE IF NOT EXISTS custeio_param_pallet_porta (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave                         text NOT NULL UNIQUE,   -- Largura&Material, ex.: "60Madeira"
  custo_por_folha_referencia    numeric,
  volume_madeira_m3             numeric,
  quantidade_por_folha          numeric
);

CREATE TABLE IF NOT EXISTS custeio_param_pallet_kit (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave                   text NOT NULL UNIQUE,   -- "Batente"|"Porta" & Largura & Material
  volume_madeira_m3       numeric,
  quantidade_por_unidade  numeric
);

CREATE TABLE IF NOT EXISTS custeio_param_pintura_gramaturas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha             text    NOT NULL,   -- Linha Principal | Linha Primer
  pintura           text    NOT NULL,   -- UV BRANCO | UV CURUPIXA
  item              text    NOT NULL,
  gramatura_g_m2    numeric NOT NULL,

  CONSTRAINT uq_custeio_param_pintura UNIQUE (linha, pintura, item)
);

-- ─── 4. Camada 2 — Overhead (DRE da fábrica) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS custeio_overhead_categorias (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria                text NOT NULL UNIQUE,
  percentual_faturamento   numeric(9, 6) NOT NULL,
  -- Comportamento padrão de escalonamento pelo fator de rateio do componente;
  -- desvios específicos por componente vão em custeio_overhead_excecoes.
  escala_padrao            text NOT NULL DEFAULT 'sim' CHECK (escala_padrao IN ('sim', 'nao', 'parcial')),
  observacao               text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS custeio_overhead_fatores_componente (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Perfil de configuração — não é 1 por componente, é 1 por combinação
  -- relevante (ex.: "PORTA PINTADA LISA", "PORTA RECOBERTA FRISADA USINADA",
  -- "KIT MONTADO", "KIT DESMONTADO", "ALIZAR", "BATENTE").
  perfil  text NOT NULL UNIQUE,
  fator   numeric(14, 10) NOT NULL
);

-- Granularidade fina por máquina/setor (% de participação no volume total de
-- produção) — hoje só alimenta os fatores já agregados acima (estáticos), mas
-- é o gancho para a Fase 2 recalcular esses fatores a partir do volume real de
-- produção já existente no Supabase, em vez de digitar manualmente.
CREATE TABLE IF NOT EXISTS custeio_overhead_atividades (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  componente                 text    NOT NULL,   -- ALIZAR, BATENTE, KIT, PORTA, RODAPÉ
  atividade                  text    NOT NULL,   -- máquina/setor, ex.: "COLADEIRA DE ALIZAR"
  pct_participacao_producao  numeric NOT NULL,
  multiplicador              numeric NOT NULL DEFAULT 1,
  fator_normalizado          numeric NOT NULL,

  CONSTRAINT uq_custeio_overhead_atividades UNIQUE (componente, atividade)
);

CREATE TABLE IF NOT EXISTS custeio_overhead_excecoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  componente     text NOT NULL CHECK (componente IN ('porta', 'batente', 'alizar', 'kit')),
  categoria      text NOT NULL DEFAULT 'TODAS',   -- nome da categoria ou 'TODAS'
  tipo_excecao   text NOT NULL CHECK (tipo_excecao IN ('sem_fator', 'multiplicador_condicional', 'zerado', 'multiplicador_fora_padrao')),
  condicao       text NOT NULL DEFAULT '',
  valor          numeric,
  observacao     text NOT NULL DEFAULT ''
);

-- ─── 5. Camada 3 — Exceções do consolidador ────────────────────────────────────
-- As 3 divergências entre o total do consolidador e a soma dos 4 componentes
-- (ver 00_LEIA-ME.md) — registradas como regras explícitas e desligáveis, não
-- escondidas atrás de um número só.

CREATE TABLE IF NOT EXISTS custeio_consolidacao_excecoes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao          text        NOT NULL,
  componente_origem  text        NOT NULL CHECK (componente_origem IN ('porta', 'batente', 'alizar', 'kit')),
  item               text        NOT NULL,
  condicao           text        NOT NULL DEFAULT '',
  efeito             text        NOT NULL CHECK (efeito IN ('excluir', 'incluir_parcial')),
  valor_ajuste       numeric,
  fonte              text        NOT NULL DEFAULT '',   -- referência à célula original, para auditoria
  ativo              boolean     NOT NULL DEFAULT true,
  observacao         text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_custeio_insumos_tipo              ON custeio_insumos(tipo);
CREATE INDEX IF NOT EXISTS idx_custeio_insumos_ativo             ON custeio_insumos(ativo);

CREATE INDEX IF NOT EXISTS idx_custeio_regras_componente         ON custeio_regras_consumo(componente);
CREATE INDEX IF NOT EXISTS idx_custeio_regras_categoria          ON custeio_regras_consumo(categoria);
CREATE INDEX IF NOT EXISTS idx_custeio_regras_componente_item    ON custeio_regras_consumo(componente, item);

CREATE INDEX IF NOT EXISTS idx_custeio_overhead_atividades_comp  ON custeio_overhead_atividades(componente);
CREATE INDEX IF NOT EXISTS idx_custeio_overhead_excecoes_comp    ON custeio_overhead_excecoes(componente);
CREATE INDEX IF NOT EXISTS idx_custeio_consolidacao_comp         ON custeio_consolidacao_excecoes(componente_origem);
CREATE INDEX IF NOT EXISTS idx_custeio_consolidacao_ativo        ON custeio_consolidacao_excecoes(ativo);

-- ─── 7. Trigger updated_at (reaproveita set_updated_at() já existente) ────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custeio_insumos_updated_at ON custeio_insumos;
CREATE TRIGGER trg_custeio_insumos_updated_at
  BEFORE UPDATE ON custeio_insumos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_custeio_regras_consumo_updated_at ON custeio_regras_consumo;
CREATE TRIGGER trg_custeio_regras_consumo_updated_at
  BEFORE UPDATE ON custeio_regras_consumo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_custeio_consolidacao_excecoes_updated_at ON custeio_consolidacao_excecoes;
CREATE TRIGGER trg_custeio_consolidacao_excecoes_updated_at
  BEFORE UPDATE ON custeio_consolidacao_excecoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 8. RLS ────────────────────────────────────────────────────────────────────
-- Mesmo padrão de supabase_custeio_produto.sql: o cliente do navegador nunca
-- autentica via supabase.auth (login deste app é 100% server-side, cookie
-- próprio) — toda chamada do browser roda como role "anon", nunca
-- "authenticated". As policies liberam os dois papéis.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'custeio_insumos', 'custeio_regras_consumo',
    'custeio_param_batente_larguras', 'custeio_param_alizar_perfis', 'custeio_param_embalagem',
    'custeio_param_ferragem', 'custeio_param_mapa_recobrimento', 'custeio_param_pallet_porta',
    'custeio_param_pallet_kit', 'custeio_param_pintura_gramaturas',
    'custeio_overhead_categorias', 'custeio_overhead_fatores_componente', 'custeio_overhead_atividades',
    'custeio_overhead_excecoes', 'custeio_consolidacao_excecoes'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t || '_all', t
    );
  END LOOP;
END $$;

-- ─── 9. Verificação ────────────────────────────────────────────────────────────
-- SELECT count(*) FROM custeio_insumos;
-- SELECT count(*) FROM custeio_regras_consumo;
-- SELECT count(*) FROM custeio_consolidacao_excecoes;
