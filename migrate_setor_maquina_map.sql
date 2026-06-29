-- Tabela de mapeamento setor → máquinas da fábrica
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS setor_maquina_map (
  id      SERIAL PRIMARY KEY,
  setor   TEXT NOT NULL,
  maquina TEXT NOT NULL,
  UNIQUE (setor, maquina)
);

ALTER TABLE setor_maquina_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read"  ON setor_maquina_map;
DROP POLICY IF EXISTS "anon_write" ON setor_maquina_map;

CREATE POLICY "anon_read"  ON setor_maquina_map FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write" ON setor_maquina_map FOR ALL    TO anon USING (true) WITH CHECK (true);

-- Vínculos pré-configurados com base nas máquinas cadastradas em registros_producao
INSERT INTO setor_maquina_map (setor, maquina) VALUES
  ('Coladeira de Alizar',        'COLADEIRA DE ALIZAR 1'),
  ('Coladeira de Alizar',        'COLADEIRA DE ALIZAR 2'),
  ('Colagem de Bordas',          'COLAGEM DE BORDA'),
  ('Embalagem de Kits',          'EMBALAGEM DE KITS'),
  ('Esquadrejadeira',            'ESQUADREJADEIRA'),
  ('Lixadeira (Tampos)',         'LIXADEIRA 1'),
  ('Montadora De Grade',         'MONTADORA DE GRADE 1'),
  ('Montadora De Grade',         'MONTADORA DE GRADE 2'),
  ('Montagem do Kit',            'MONTAGEM DO KIT 1'),
  ('Montagem do Kit',            'MONTAGEM DO KIT 2'),
  ('Montagem do Kit',            'MONTAGEM DO KIT 3'),
  ('Montagem do Kit',            'MONTAGEM DO KIT 4'),
  ('Mesa de Montagem de quadro', 'MONTAGEM DO QUADRO 1'),
  ('Mesa de Montagem de quadro', 'MONTAGEM DO QUADRO 2'),
  ('Multiserra Perfil',          'MULTI SERRA PERFIL'),
  ('Pintura de Portas',          'LINHA DE PINTURA DE PORTAS'),
  ('Pintura de Tampos',          'LINHA DE PINTURA DE TAMPO'),
  ('Plaina Moldureira de Batente','PLAINA MOLDUREIRA DE BATENTE'),
  ('Prensagem de portas',        'PRENSA FRIA'),
  ('Recobridora de Perfil ',     'RECOBRIDORA DE PERFIL - GAIDZINSKI'),
  ('Seccionadora 01',            'SECCIONADORA 1'),
  ('Seccionadora 02 ',           'SECCIONADORA 2')
ON CONFLICT DO NOTHING;
