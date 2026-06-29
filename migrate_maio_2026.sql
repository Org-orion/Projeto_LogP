-- ============================================================
-- Restaura todos os setores de maio/2026
-- ON CONFLICT DO NOTHING preserva registros que já existem
-- Execute no Supabase SQL Editor
-- ============================================================

INSERT INTO indicadores_producao
  (mes, setor, matricula_encarregado, nome_encarregado, matricula_supervisor, nome_supervisor, meta_producao, producao_atual)
VALUES
  ('2026-05-01', 'Aplicação de Borracha',                              '7',   'Gabriel Ramos da Silva',       '343',  'Thallison dos Reis Silva',          NULL, NULL),
  ('2026-05-01', 'Coladeira de Alizar',                                '23',  'Eline Silva Freitas',          '57',   'João Vitor Silva Leite',            NULL, NULL),
  ('2026-05-01', 'Colagem de Bordas',                                  NULL,  NULL,                           '393',  'Rafael de Sousa Lima',              NULL, NULL),
  ('2026-05-01', 'Destopadeira 45°',                                   '7',   'Gabriel Ramos da Silva',       '23',   'Eline Silva Freitas',               NULL, NULL),
  ('2026-05-01', 'Destopadeira de Alizar',                             '7',   'Gabriel Ramos da Silva',       '23',   'Eline Silva Freitas',               NULL, NULL),
  ('2026-05-01', 'Destopadeira de Cabeceiras',                         '165', 'Domingos José Vilar de Souza', '419',  'Henrique Braz Bezerra',             NULL, NULL),
  ('2026-05-01', 'Embalagem de Kits',                                  '165', 'Domingos José Vilar de Souza', '419',  'Henrique Braz Bezerra',             NULL, NULL),
  ('2026-05-01', 'Embalagem de Perfil',                                '7',   'Gabriel Ramos da Silva',       '343',  'Thallison dos Reis Silva',          NULL, NULL),
  ('2026-05-01', 'Embalagem de Portas',                                '165', 'Domingos José Vilar de Souza', '419',  'Henrique Braz Bezerra',             NULL, NULL),
  ('2026-05-01', 'Empilhador',                                         NULL,  NULL,                           NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Esquadrejadeira',                                    NULL,  NULL,                           '25',   'Lucas Neves da Silva',              NULL, NULL),
  ('2026-05-01', 'Expedição',                                          NULL,  NULL,                           '1215', 'Juliana Costa Mendes',              NULL, NULL),
  ('2026-05-01', 'Fatiadeira de papel',                                '7',   'Gabriel Ramos da Silva',       '23',   'Eline Silva Freitas',               NULL, NULL),
  ('2026-05-01', 'Ferragens',                                          NULL,  NULL,                           NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Furação e corte das portas',                         '165', 'Domingos José Vilar de Souza', '419',  'Henrique Braz Bezerra',             NULL, NULL),
  ('2026-05-01', 'Limpeza',                                            NULL,  NULL,                           NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Lixadeira (Tampos)',                                 NULL,  NULL,                           '25',   'Lucas Neves da Silva',              NULL, NULL),
  ('2026-05-01', 'Marcenaria',                                         '364', 'Edmar dos Santos Medina',      NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Material dos Quadros (reguas, topas, sarrafos, lamelas)', NULL, NULL,                       '59',   'Sergio Melo Garcia',                NULL, NULL),
  ('2026-05-01', 'Mesa de Montagem de quadro',                         NULL,  NULL,                           '807',  'Pablo Martins Carvalho',            NULL, NULL),
  ('2026-05-01', 'Montadora De Grade',                                 NULL,  NULL,                           '807',  'Pablo Martins Carvalho',            NULL, NULL),
  ('2026-05-01', 'Montagem do Kit',                                    '165', 'Domingos José Vilar de Souza', '419',  'Henrique Braz Bezerra',             NULL, NULL),
  ('2026-05-01', 'Multiserra Perfil',                                  '23',  'Eline Silva Freitas',          '57',   'João Vitor Silva Leite',            NULL, NULL),
  ('2026-05-01', 'Pallet',                                             NULL,  NULL,                           NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Pintor',                                             NULL,  NULL,                           NULL,   NULL,                                NULL, NULL),
  ('2026-05-01', 'Pintura de Portas',                                  NULL,  NULL,                           '147',  'Luis Felipe Silva Alves',           NULL, NULL),
  ('2026-05-01', 'Pintura de Tampos',                                  NULL,  NULL,                           '147',  'Luis Felipe Silva Alves',           NULL, NULL),
  ('2026-05-01', 'Pintura do Friso',                                   NULL,  NULL,                           '500',  'John kennedy de Oliveira Gomes',    NULL, NULL),
  ('2026-05-01', 'Plaina moldureira de Alizar',                        '23',  'Eline Silva Freitas',          '57',   'João Vitor Silva Leite',            NULL, NULL),
  ('2026-05-01', 'Plaina Moldureira de Batente',                       '23',  'Eline Silva Freitas',          '57',   'João Vitor Silva Leite',            NULL, NULL),
  ('2026-05-01', 'Prensagem de portas',                                NULL,  NULL,                           '807',  'Pablo Martins Carvalho',            NULL, NULL),
  ('2026-05-01', 'Recobridora de Perfil',                              '7',   'Gabriel Ramos da Silva',       '415',  'Raimundo Nonato Carvalho Borges',   NULL, NULL),
  ('2026-05-01', 'Recobridora de Tampos',                              NULL,  NULL,                           '25',   'Lucas Neves da Silva',              NULL, NULL),
  ('2026-05-01', 'Seccionadora 01',                                    '23',  'Eline Silva Freitas',          '57',   'João Vitor Silva Leite',            NULL, NULL),
  ('2026-05-01', 'Seccionadora 02',                                    NULL,  NULL,                           '25',   'Lucas Neves da Silva',              NULL, NULL),
  ('2026-05-01', 'Usinagem de Batentes',                               '165', 'Domingos José Vilar de Souza', '1052', 'Geovane Mendes Araujo',             NULL, NULL),
  ('2026-05-01', 'Usinagem de Frisos',                                 NULL,  NULL,                           '500',  'John kennedy de Oliveira Gomes',    NULL, NULL)
ON CONFLICT (setor, mes) DO NOTHING;
