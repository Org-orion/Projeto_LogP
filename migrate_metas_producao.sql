-- Tabela: base de funcionários da fábrica
CREATE TABLE IF NOT EXISTS base_funcionarios (
  id               SERIAL PRIMARY KEY,
  matricula        TEXT UNIQUE NOT NULL,
  nome_completo    TEXT NOT NULL,
  setor            TEXT,
  funcao           TEXT,
  categoria        TEXT,
  dias_trabalhados INTEGER,
  categoria_bonus  TEXT,
  valor_bonus      NUMERIC(10, 2),
  bonus_atual      NUMERIC(10, 2),
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: indicadores de produção (metas mensais por máquina)
CREATE TABLE IF NOT EXISTS indicadores_producao (
  id                    SERIAL PRIMARY KEY,
  maquina               TEXT NOT NULL,
  mes                   DATE NOT NULL,        -- armazenar como 1º dia do mês: 2026-05-01
  matricula_encarregado TEXT,
  nome_encarregado      TEXT,
  meta                  NUMERIC(12, 2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (maquina, mes)                       -- uma meta por máquina por mês
);

-- RLS permissivo (ajuste conforme política da empresa)
ALTER TABLE base_funcionarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado pode tudo em base_funcionarios"
  ON base_funcionarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticado pode tudo em indicadores_producao"
  ON indicadores_producao FOR ALL TO authenticated USING (true) WITH CHECK (true);
