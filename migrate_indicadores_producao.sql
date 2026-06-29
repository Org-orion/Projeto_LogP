-- ============================================================
-- indicadores_producao: criação da tabela + carga inicial
-- Execute no Supabase SQL Editor
-- ============================================================

-- Remove versão anterior se existir (esquema mudou)
DROP TABLE IF EXISTS indicadores_producao;

CREATE TABLE indicadores_producao (
  id                    SERIAL PRIMARY KEY,
  mes                   DATE NOT NULL,
  setor                 TEXT NOT NULL,
  matricula_encarregado TEXT,
  nome_encarregado      TEXT,
  matricula_supervisor  TEXT,
  nome_supervisor       TEXT,
  meta_producao         NUMERIC(14, 2),
  producao_atual        NUMERIC(14, 2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (setor, mes)
);

ALTER TABLE indicadores_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado pode tudo em indicadores_producao"
  ON indicadores_producao FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO indicadores_producao
  (mes, setor, matricula_encarregado, nome_encarregado, matricula_supervisor, nome_supervisor, meta_producao, producao_atual)
VALUES
  ('2026-04-30', 'Aplicação de Borracha', '7', 'Gabriel Ramos da Silva', '343', 'Thallison dos Reis Silva', NULL, NULL),
  ('2026-04-30', 'Coladeira de Alizar', '23', 'Eline Silva Freitas', '57', 'João Vitor Silva Leite', 145143, 146527),
  ('2026-04-30', 'Colagem de Bordas', NULL, NULL, '393', 'Rafael de Sousa Lima', NULL, NULL),
  ('2026-04-30', 'Destopadeira 45°', '7', 'Gabriel Ramos da Silva', '23', 'Eline Silva Freitas', NULL, NULL),
  ('2026-04-30', 'Destopadeira de Alizar', '7', 'Gabriel Ramos da Silva', '23', 'Eline Silva Freitas', NULL, NULL),
  ('2026-04-30', 'Destopadeira de Cabeceiras', '165', 'Domingos José Vilar de Souza', '419', 'Henrique Braz Bezerra', NULL, NULL),
  ('2026-04-30', 'Embalagem de Kits', '165', 'Domingos José Vilar de Souza', '419', 'Henrique Braz Bezerra', NULL, NULL),
  ('2026-04-30', 'Embalagem de Perfil', '7', 'Gabriel Ramos da Silva', '343', 'Thallison dos Reis Silva', NULL, NULL),
  ('2026-04-30', 'Embalagem de Portas', '165', 'Domingos José Vilar de Souza', '419', 'Henrique Braz Bezerra', NULL, NULL),
  ('2026-04-30', 'Empilhador', NULL, NULL, NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Esquadrejadeira', NULL, NULL, '25', 'Lucas Neves da Silva', NULL, NULL),
  ('2026-04-30', 'Expedição', NULL, NULL, '1215', 'Juliana Costa Mendes', NULL, NULL),
  ('2026-04-30', 'Fatiadeira de papel', '7', 'Gabriel Ramos da Silva', '23', 'Eline Silva Freitas', NULL, NULL),
  ('2026-04-30', 'Ferragens', NULL, NULL, NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Furação e corte das portas', '165', 'Domingos José Vilar de Souza', '419', 'Henrique Braz Bezerra', NULL, NULL),
  ('2026-04-30', 'Limpeza', NULL, NULL, NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Lixadeira (Tampos)', NULL, NULL, '25', 'Lucas Neves da Silva', 74978, 77529),
  ('2026-04-30', 'Marcenaria', '364', 'Edmar dos Santos Medina', NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Material dos Quadros (reguas, topas, sarrafos, lamelas)', NULL, NULL, '59', 'Sergio Melo Garcia', NULL, NULL),
  ('2026-04-30', 'Mesa de Montagem de quadro', NULL, NULL, '807', 'Pablo Martins Carvalho', NULL, NULL),
  ('2026-04-30', 'Montadora De Grade', NULL, NULL, '807', 'Pablo Martins Carvalho', 73037, 84120),
  ('2026-04-30', 'Montagem do Kit', '165', 'Domingos José Vilar de Souza', '419', 'Henrique Braz Bezerra', NULL, NULL),
  ('2026-04-30', 'Multiserra Perfil', '23', 'Eline Silva Freitas', '57', 'João Vitor Silva Leite', NULL, NULL),
  ('2026-04-30', 'Pallet', NULL, NULL, NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Pintor', NULL, NULL, NULL, NULL, NULL, NULL),
  ('2026-04-30', 'Pintura de Portas', NULL, NULL, '147', 'Luis Felipe Silva Alves', 11110, 12025),
  ('2026-04-30', 'Pintura de Tampos', NULL, NULL, '147', 'Luis Felipe Silva Alves', NULL, NULL),
  ('2026-04-30', 'Pintura do Friso', NULL, NULL, '500', 'John kennedy de Oliveira Gomes', 813, 1000),
  ('2026-04-30', 'Plaina moldureira de Alizar', '23', 'Eline Silva Freitas', '57', 'João Vitor Silva Leite', NULL, NULL),
  ('2026-04-30', 'Plaina Moldureira de Batente', '23', 'Eline Silva Freitas', '57', 'João Vitor Silva Leite', NULL, NULL),
  ('2026-04-30', 'Prensagem de portas', NULL, NULL, '807', 'Pablo Martins Carvalho', NULL, NULL),
  ('2026-04-30', 'Recobridora de Perfil', '7', 'Gabriel Ramos da Silva', '415', 'Raimundo Nonato Carvalho Borges', NULL, NULL),
  ('2026-04-30', 'Recobridora de Tampos', NULL, NULL, '25', 'Lucas Neves da Silva', NULL, NULL),
  ('2026-04-30', 'Seccionadora 01', '23', 'Eline Silva Freitas', '57', 'João Vitor Silva Leite', 49465, 60264),
  ('2026-04-30', 'Seccionadora 02', NULL, NULL, '25', 'Lucas Neves da Silva', 57921, 64951),
  ('2026-04-30', 'Usinagem de Batentes', '165', 'Domingos José Vilar de Souza', '1052', 'Geovane Mendes Araujo', 19210, 20104),
  ('2026-04-30', 'Usinagem de Frisos', NULL, NULL, '500', 'John kennedy de Oliveira Gomes', NULL, NULL)
ON CONFLICT (setor, mes) DO UPDATE SET
  matricula_encarregado = EXCLUDED.matricula_encarregado,
  nome_encarregado      = EXCLUDED.nome_encarregado,
  matricula_supervisor  = EXCLUDED.matricula_supervisor,
  nome_supervisor       = EXCLUDED.nome_supervisor,
  meta_producao         = EXCLUDED.meta_producao,
  producao_atual        = EXCLUDED.producao_atual;
