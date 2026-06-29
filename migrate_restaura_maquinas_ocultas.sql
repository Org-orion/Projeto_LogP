-- Restaura máquinas removidas do cadastro
-- MOLDUREIRA DE ALIZA 1/2 são excluídas (typo; corretas já existem como ALIZAR)

INSERT INTO maquinas (codigo, nome, setor)
SELECT codigo, nome, setor FROM (VALUES
  ('DESTOPADEIRA_CABECEIRA',  'DESTOPADEIRA DE CABECEIRA', 'DESTOPADEIRA DE CABECEIRA'),
  ('FABRICA_2',               'Fábrica 2',                 'Fábrica'),
  ('LIXADEIRA',               'LIXADEIRA',                 'LIXADEIRA'),
  ('MONTADORA_GRADE',         'MONTADORA DE GRADE',        'MONTADORA DE GRADE'),
  ('RECEBIMENTO_FERRAGENS',   'RECEBIMENTO FERRAGENS',     'RECEBIMENTO FERRAGENS'),
  ('RESPIGADEIRA',            'RESPIGADEIRA',              'RESPIGADEIRA'),
  ('SECCIONADORA_CANAL',      'SECCIONADORA DE CANAL',     'SECCIONADORA DE CANAL')
) AS t(codigo, nome, setor)
WHERE NOT EXISTS (
  SELECT 1 FROM maquinas m WHERE m.nome = t.nome
);

INSERT INTO maquinas (codigo, nome, setor)
SELECT 'APLICACAO_BORRACHA', 'APLICAÇÃO DA BORRACHA', 'APLICAÇÃO DA BORRACHA'
WHERE NOT EXISTS (
  SELECT 1 FROM maquinas WHERE nome = 'APLICAÇÃO DA BORRACHA'
);

-- Verificação
SELECT nome FROM maquinas ORDER BY nome;
