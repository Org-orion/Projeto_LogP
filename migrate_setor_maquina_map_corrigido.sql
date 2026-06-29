-- Corrige setor_maquina_map: remove tudo e reinicia com mapeamentos corretos
-- Execute no Supabase SQL Editor

TRUNCATE TABLE setor_maquina_map RESTART IDENTITY;

INSERT INTO setor_maquina_map (setor, maquina) VALUES
  -- Coladeira de Alizar
  ('Coladeira de Alizar',           'COLADEIRA DE ALIZAR 1'),
  ('Coladeira de Alizar',           'COLADEIRA DE ALIZAR 2'),

  -- Colagem de Bordas
  ('Colagem de Bordas',             'COLAGEM DE BORDA'),

  -- Embalagem
  ('Embalagem de Kits',             'EMBALAGEM DE KITS'),
  ('Embalagem de Portas',           'EMBALAGEM DE PORTAS 1'),

  -- Esquadrejadeira
  ('Esquadrejadeira',               'ESQUADREJADEIRA'),

  -- Furação e corte
  ('Furação e corte das portas',    'FURAÇÃO E CORTE DAS PORTAS 1'),
  ('Furação e corte das portas',    'FURAÇÃO E CORTE DAS PORTAS 2'),
  ('Furação e corte das portas',    'FURAÇÃO E CORTE DAS PORTAS 3'),
  ('Furação e corte das portas',    'FURAÇÃO E CORTE DAS PORTAS 4'),

  -- Lixadeira
  ('Lixadeira (Tampos)',            'LIXADEIRA 1'),
  ('Lixadeira (Tampos)',            'LIXADEIRA 2'),

  -- Mesa de Montagem de quadro (máquinas reais: 2, 3, 4, 5)
  ('Mesa de Montagem de quadro',    'MONTAGEM DO QUADRO 2'),
  ('Mesa de Montagem de quadro',    'MONTAGEM DO QUADRO 3'),
  ('Mesa de Montagem de quadro',    'MONTAGEM DO QUADRO 4'),
  ('Mesa de Montagem de quadro',    'MONTAGEM DO QUADRO 5'),

  -- Montadora De Grade
  ('Montadora De Grade',            'MONTADORA DE GRADE 1'),
  ('Montadora De Grade',            'MONTADORA DE GRADE 2'),

  -- Montagem do Kit
  ('Montagem do Kit',               'MONTAGEM DO KIT 1'),
  ('Montagem do Kit',               'MONTAGEM DO KIT 2'),
  ('Montagem do Kit',               'MONTAGEM DO KIT 3'),
  ('Montagem do Kit',               'MONTAGEM DO KIT 4'),

  -- Multiserra Perfil
  ('Multiserra Perfil',             'MULTI SERRA PERFIL'),

  -- Pintura
  ('Pintura de Portas',             'LINHA DE PINTURA DE PORTAS'),
  ('Pintura de Tampos',             'LINHA DE PINTURA DE TAMPO'),

  -- Plaina moldureira de Alizar
  ('Plaina moldureira de Alizar',   'MOLDUREIRA DE ALIZA 1'),
  ('Plaina moldureira de Alizar',   'MOLDUREIRA DE ALIZA 2'),

  -- Plaina Moldureira de Batente
  ('Plaina Moldureira de Batente',  'PLAINA MOLDUREIRA DE BATENTE'),

  -- Prensagem de portas
  ('Prensagem de portas',           'PRENSA FRIA'),

  -- Recobridora de Perfil (3 máquinas)
  ('Recobridora de Perfil',         'RECOBRIDORA DE PERFIL - GAIDZINSKI'),
  ('Recobridora de Perfil',         'RECOBRIDORA DE PERFIL - UNESA 1'),
  ('Recobridora de Perfil',         'RECOBRIDORA DE PERFIL - UNESA 2'),

  -- Recobridora de Tampos
  ('Recobridora de Tampos',         'RECOBRIDORA DE TAMPOS'),

  -- Seccionadora
  ('Seccionadora 01',               'SECCIONADORA 1'),
  ('Seccionadora 02',               'SECCIONADORA 2')

ON CONFLICT DO NOTHING;
