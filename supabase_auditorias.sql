-- =============================================================================
-- AUDITORIAS: Controle de documentação por auditoria
-- Executar no SQL Editor do Supabase
-- =============================================================================

-- ─── 1. Tabelas ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auditorias (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        NOT NULL,
  ano         int         NOT NULL,
  descricao   text,
  status      text        NOT NULL DEFAULT 'ativa'
                          CHECK (status IN ('ativa', 'encerrada', 'arquivada')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditoria_setores (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id  uuid        NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  cor           text        NOT NULL DEFAULT '#6b7a72',
  prazo         date,
  responsavel   text,
  ordem         int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditoria_documentos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id        uuid        NOT NULL REFERENCES auditoria_setores(id) ON DELETE CASCADE,
  nome            text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'enviado', 'aprovado', 'na')),
  origem          text        NOT NULL DEFAULT 'padrao'
                              CHECK (origem IN ('padrao', 'custom')),
  adicionado_por  int         REFERENCES usuarios(id) ON DELETE SET NULL,
  ordem           int         NOT NULL DEFAULT 0,
  arquivo_url     text,
  grupo           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_aud_setores_auditoria ON auditoria_setores(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_aud_docs_setor        ON auditoria_documentos(setor_id);
CREATE INDEX IF NOT EXISTS idx_aud_docs_status       ON auditoria_documentos(status);
CREATE INDEX IF NOT EXISTS idx_aud_docs_origem       ON auditoria_documentos(origem);

-- ─── 3. Trigger updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditorias_updated_at ON auditorias;
CREATE TRIGGER trg_auditorias_updated_at
  BEFORE UPDATE ON auditorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_aud_docs_updated_at ON auditoria_documentos;
CREATE TRIGGER trg_aud_docs_updated_at
  BEFORE UPDATE ON auditoria_documentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. Seed: Auditoria Interteck 2027 ───────────────────────────────────────

DO $$
DECLARE
  v_aud  uuid;
  v_rh   uuid;
  v_pr   uuid;
  v_dr   uuid;
  v_al   uuid;
  v_ss   uuid;
  v_ma   uuid;
  v_gs   uuid;
  v_gq   uuid;
BEGIN

-- Auditoria principal
INSERT INTO auditorias (nome, ano, descricao)
VALUES ('Auditoria Intertek', 2027, 'Auditoria de certificação Intertek — ciclo 2027')
RETURNING id INTO v_aud;

-- Setores
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Recursos Humanos',                    '#3b82f6', 1) RETURNING id INTO v_rh;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Prontuário dos Empregados Selecionados', '#a855f7', 2) RETURNING id INTO v_pr;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Documentos de RH',                    '#0ea5e9', 3) RETURNING id INTO v_dr;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Alvarás e/ou Licenças',               '#f59e0b', 4) RETURNING id INTO v_al;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Saúde e Segurança do Trabalho',       '#ef4444', 5) RETURNING id INTO v_ss;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Meio Ambiente',                       '#22c55e', 6) RETURNING id INTO v_ma;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Sistema de Gestão Social',            '#14b8a6', 7) RETURNING id INTO v_gs;
INSERT INTO auditoria_setores (auditoria_id, nome, cor, ordem) VALUES (v_aud, 'Sistema de Gestão da Qualidade',      '#10b981', 8) RETURNING id INTO v_gq;

-- ── 1. Recursos Humanos ───────────────────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_rh, 'Total de Empregados próprios',                      1),
  (v_rh, 'Cota de Aprendizes',                                2),
  (v_rh, 'Total de terceiros fixos na unidade',               3),
  (v_rh, 'Cota de PNE (Portador de Necessidades Especiais)',  4);

-- ── 2. Prontuário dos Empregados Selecionados ─────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_pr, 'Contrato assinado',                                                      1),
  (v_pr, 'Cópia de documentos pessoais',                                           2),
  (v_pr, 'Ficha de registro',                                                      3),
  (v_pr, 'Advertências',                                                           4),
  (v_pr, 'Recibo de férias',                                                       5),
  (v_pr, 'Controle de EPI (Equipamento de Proteção Individual)',                   6),
  (v_pr, 'ASO''s (Atestados de Saúde Ocupacional)',                                7),
  (v_pr, 'Acordos Individuais',                                                    8),
  (v_pr, 'Ordem de Serviço de Saúde e Segurança no Trabalho (NR 1)',               9);

-- ── 3. Documentos de RH ───────────────────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_dr, 'Certidão Negativa do FGTS (Fundo de Garantia do Tempo de Serviço)',                                                                                      1),
  (v_dr, 'Certidão Negativa do INSS (Instituto Nacional do Seguro Social)',                                                                                        2),
  (v_dr, 'Relatórios E-Social: S-2100 / S-2200 (cadastramento/admissão) / S-1200 (vínculo INSS) / S-2230 (afastamentos) / S-2299 (desligamentos) / RE-GFIP',      3),
  (v_dr, 'Livro do Ministério do Trabalho',                                                                                                                        4),
  (v_dr, 'Convenção Coletiva de Trabalho',                                                                                                                         5),
  (v_dr, 'Código de Ética / Conduta da Empresa',                                                                                                                  6),
  (v_dr, 'Código de Ética do cliente (se aplicável)',                                                                                                              7),
  (v_dr, 'Matriz de competências',                                                                                                                                 8),
  (v_dr, 'Plano de treinamento',                                                                                                                                   9),
  (v_dr, 'Evidências de treinamento (com avaliação)',                                                                                                             10),
  (v_dr, 'Treinamento de Integração',                                                                                                                             11);

-- ── 4. Alvarás e/ou Licenças ─────────────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_al, 'Licença Municipal de Funcionamento',                                                                              1),
  (v_al, 'AVCB (Alvará de Vistoria do Corpo de Bombeiros ou equivalente)',                                                  2),
  (v_al, 'Contrato de Locação / Escritura do Imóvel / Contrato de compra e venda – (de acordo com a situação do imóvel)',   3),
  (v_al, 'Licença de Operação Ambiental do órgão competente local ou Certificado de Dispensa',                              4),
  (v_al, 'ANVISA – da unidade (se aplicável)',                                                                              5),
  (v_al, 'Vigilância Sanitária – VISA (restaurante/refeitório) (se aplicável)',                                             6),
  (v_al, 'ANVISA – ambulatório (se aplicável)',                                                                             7),
  (v_al, 'Licença para Produtos Químicos Controlados – Polícia Civil, Polícia Federal e Exército',                          8),
  (v_al, 'Cartão do CNPJ (Cadastro Nacional da Pessoa Jurídica)',                                                           9);

-- ── 5. Saúde e Segurança do Trabalho ─────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_ss, 'NR 9 - PGR – Programa de Gerenciamento de Risco',                                                      1),
  (v_ss, 'NR 7 - PCMSO (Programa de Controle Médico de Saúde Ocupacional)',                                      2),
  (v_ss, 'NR 7 - Relatório analítico do PCMSO',                                                                  3),
  (v_ss, 'Lista dos Produtos Químicos utilizados na empresa',                                                     4),
  (v_ss, 'FISPQ (Ficha de Informação de Segurança para Produtos Químicos) – verificado in loco',                  5),
  (v_ss, 'CAT (Comunicação de Acidente do Trabalho) – Últimos 12 meses',                                          6),
  (v_ss, 'Plano de Atendimento a Emergências (PAE) / Relatório do Simulado de Evacuação',                         7),
  (v_ss, 'Brigada de Incêndio – lista de membros, certificados de treinamentos, atas (se aplicável)',              8),
  (v_ss, 'Lista de Equipamento de Combate a Incêndio / controle de inspeções',                                    9),
  (v_ss, 'NR 5 - CIPA – processo eleitoral, Ata de Instalação e Posse, Reuniões, Treinamentos',                  10),
  (v_ss, 'NR 5 - SIPAT – material de divulgação, listas de presença (se aplicável)',                              11),
  (v_ss, 'NR 12 - Controle de Manutenção de Máquinas (Preventiva e Corretiva)',                                   12),
  (v_ss, 'NR 12 – Lista atualizada das máquinas e equipamentos',                                                  13),
  (v_ss, 'NR 12 - Apreciação de Riscos de Máquinas e Equipamentos',                                               14),
  (v_ss, 'NR 12 - Procedimentos de trabalho e segurança conforme análise de risco',                               15),
  (v_ss, 'NR 4 - Registro SESMT junto à Delegacia do Trabalho',                                                   16),
  (v_ss, 'NR 15 – LTCAT / Laudo de Insalubridade / Laudo de Ruído periférico',                                    17),
  (v_ss, 'NR 17 - Análise Ergonômica',                                                                            18),
  (v_ss, 'NR 13 – Documentação de Caldeiras / Vasos de Pressão (se aplicável)',                                   19),
  (v_ss, 'NR 20 - Inflamáveis, combustíveis e área classificada',                                                  20),
  (v_ss, 'NR 33/35 – Trabalho em Altura / Espaço Confinado (se aplicável)',                                       21),
  (v_ss, 'NR 10 - Diagrama / Esquema Unifilar – item mandatório (10.2.3)',                                         22),
  (v_ss, 'NR 10 – Prontuário das Instalações Elétricas (10.2.4)',                                                  23);

-- ── 6. Meio Ambiente ─────────────────────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_ma, 'PGRS (Plano de Gerenciamento de Resíduos Sólidos)',                                       1),
  (v_ma, 'PGRSS (Plano de Gerenciamento de Resíduos Sólidos de Saúde) – se aplicável',              2),
  (v_ma, 'LAIA – Levantamento de Aspectos e Impactos Ambientais',                                   3),
  (v_ma, 'MTR (Manifesto de Transporte de Resíduos) – Lei 12.305/10',                               4),
  (v_ma, 'CADRI (Certificado de Destinação Final de Resíduos) – SP ou equivalente',                 5),
  (v_ma, 'Controle de emissão de poluentes atmosféricos',                                           6),
  (v_ma, 'Outorgas de Captação de Água Superficial e/ou Subterrânea',                               7),
  (v_ma, 'Outorga para Lançamento de Efluentes / Cadastro de Empresas Potencialmente Poluidoras – IBAMA', 8),
  (v_ma, 'Política de Meio Ambiente',                                                               9),
  (v_ma, 'Registros da Produção efetiva vs capacidade produtiva – Últimos 12 meses',               10),
  (v_ma, 'Consumo de Água e Energia',                                                              11);

-- ── 7. Sistema de Gestão Social ──────────────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_gs, 'Política de Responsabilidade Social Corporativa',                               1),
  (v_gs, 'Código de Ética e/ou Conduta',                                                  2),
  (v_gs, 'Procedimentos de admissão, demissão, práticas disciplinares e mediação',        3),
  (v_gs, 'Sistemática para monitoramento e aplicação de legislações aplicáveis',          4),
  (v_gs, 'Comitê anticorrupção / Sistemática de denúncia anônima',                        5),
  (v_gs, 'Treinamentos',                                                                  6),
  (v_gs, 'Gestão de fornecedores e/ou subcontratados (Social, Ética e Conduta)',          7);

-- ── 8. Sistema de Gestão da Qualidade ───────────────────────────────────────
INSERT INTO auditoria_documentos (setor_id, nome, ordem) VALUES
  (v_gq, 'Organograma',                                                                    1),
  (v_gq, 'Descrição do trabalho',                                                         2),
  (v_gq, 'Organograma do departamento de qualidade com responsabilidades definidas',      3),
  (v_gq, 'Evidência de participação em reuniões executivas',                               4),
  (v_gq, 'Prova de independência do responsável da qualidade',                             5),
  (v_gq, 'Política da qualidade / Manual da qualidade',                                   6),
  (v_gq, 'Evidência de desdobramento em objetivos e KPIs',                                7),
  (v_gq, 'Evidência de comunicação interna (e-mail, dashboard, etc.)',                    8),
  (v_gq, 'Planejamento de auditoria interna',                                             9),
  (v_gq, 'Procedimento e modelo de auditoria interna',                                   10),
  (v_gq, 'Último relatório de auditoria + plano de ação',                                11),
  (v_gq, 'Treinamento de auditor / evidência de competência',                            12),
  (v_gq, 'Procedimento de gestão de não conformidade',                                   13),
  (v_gq, 'Exemplos de relatórios de não conformidade',                                   14),
  (v_gq, 'Lista de não conformidades',                                                   15),
  (v_gq, 'Procedimento de melhoria contínua + histórico',                                16),
  (v_gq, 'Procedimento de controle de documentos',                                       17),
  (v_gq, 'Manual da qualidade (se houver)',                                               18),
  (v_gq, 'Regras de arquivamento',                                                       19),
  (v_gq, 'Exemplos de documentos arquivados',                                            20),
  (v_gq, 'Procedimento de rastreabilidade',                                              21),
  (v_gq, 'Evidência de testes de rastreabilidade',                                       22),
  (v_gq, 'Procedimento de certificação/conformidade do produto',                         23),
  (v_gq, 'Registros de entrada de projeto',                                              24),
  (v_gq, 'Registros de revisão de projeto',                                              25),
  (v_gq, 'Documentos de lições aprendidas / alertas de qualidade',                       26),
  (v_gq, 'Normas e regulamentos aplicáveis',                                             27),
  (v_gq, 'Relatórios de verificação de projeto (testes internos/externos)',               28),
  (v_gq, 'Lista de regulamentação aplicável',                                            29),
  (v_gq, 'Arquivo de conformidade de produto',                                           30),
  (v_gq, 'Pedido/solicitação de teste',                                                  31),
  (v_gq, 'Relatórios de testes subcontratados',                                          32),
  (v_gq, 'Protocolos de teste',                                                          33),
  (v_gq, 'Lista de capacidade de testes',                                                34),
  (v_gq, 'Relatórios de testes internos',                                                35),
  (v_gq, 'Instrução de teste interno',                                                   36),
  (v_gq, 'Procedimento de treinamento para testes críticos',                             37),
  (v_gq, 'Evidência de treinamento técnico',                                             38),
  (v_gq, 'Registros de testes',                                                          39),
  (v_gq, 'Procedimento de observação regulamentar',                                      40),
  (v_gq, 'Análise de risco do produto (FMEA ou similar)',                                41),
  (v_gq, 'Relatórios de testes de desenvolvimento',                                      42),
  (v_gq, 'Plano de qualificação',                                                        43),
  (v_gq, 'Amostras de produtos aprovados',                                               44),
  (v_gq, 'Análise de risco de processo',                                                 45),
  (v_gq, 'Plano de controle de produto/processo',                                        46),
  (v_gq, 'Procedimento de validação de equipamentos/linhas',                             47),
  (v_gq, 'Ficha de medição de características do produto',                               48),
  (v_gq, 'Ordem/especificação de produção',                                              49),
  (v_gq, 'Instruções de trabalho',                                                       50),
  (v_gq, 'Checklist de produção (Go)',                                                   51),
  (v_gq, 'Parâmetros de processo documentados',                                          52),
  (v_gq, 'Procedimento de qualificação de fornecedores',                                 53),
  (v_gq, 'Relatórios de avaliação de fornecedores',                                      54),
  (v_gq, 'Especificação de matéria-prima',                                               55),
  (v_gq, 'Especificação de produto semiacabado',                                         56),
  (v_gq, 'Especificação de subcontratados',                                              57),
  (v_gq, 'Contrato de subcontratação',                                                   58),
  (v_gq, 'Acordo de fornecimento',                                                       59),
  (v_gq, 'Instrução de controle de qualidade',                                           60),
  (v_gq, 'Biblioteca de defeitos',                                                       61),
  (v_gq, 'Registros de controle de qualidade',                                           62),
  (v_gq, 'Evidência de controle final antes da entrega',                                 63),
  (v_gq, 'Nota de entrega',                                                              64),
  (v_gq, 'Procedimento de gerenciamento de mudanças',                                    65),
  (v_gq, 'Exemplo de formalização de mudanças',                                          66),
  (v_gq, 'Especificação do cliente',                                                     67),
  (v_gq, 'Registro de confirmação do cliente',                                           68),
  (v_gq, 'Sistema de gestão de pedidos',                                                 69),
  (v_gq, 'Sistema de monitoramento de estoque',                                          70),
  (v_gq, 'Plano de produção',                                                            71),
  (v_gq, 'Procedimento de controle de qualidade de entrada',                             72),
  (v_gq, 'Checklists de recebimento',                                                    73),
  (v_gq, 'Solicitação de amostra',                                                       74),
  (v_gq, 'Documentos de conformidade',                                                   75),
  (v_gq, 'Registros de inspeção de recebimento',                                         76),
  (v_gq, 'Procedimento de retrabalho',                                                   77),
  (v_gq, 'Registros de reinspeção',                                                      78),
  (v_gq, 'Exemplos de renúncia',                                                         79),
  (v_gq, 'Lista de equipamentos calibrados',                                             80),
  (v_gq, 'Certificados de calibração',                                                   81),
  (v_gq, 'Plano de manutenção preventiva e corretiva',                                   82),
  (v_gq, 'Registro de intervenções',                                                     83),
  (v_gq, 'Registros de parâmetros controlados',                                          84),
  (v_gq, 'Procedimento de gestão de armazém',                                            85),
  (v_gq, 'Instrução de limpeza/organização',                                             86),
  (v_gq, 'Fluxograma de processo',                                                       87),
  (v_gq, 'Resultados de avaliação de fornecedores',                                      88),
  (v_gq, 'Critérios de avaliação',                                                       89);

END $$;
