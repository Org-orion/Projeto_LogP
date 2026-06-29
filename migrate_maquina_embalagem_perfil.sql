-- Adiciona máquina "Embalagem de Perfil" na tabela maquinas (se não existir)
INSERT INTO maquinas (codigo, nome, setor)
SELECT 'EMBALAGEM_PERFIL', 'Embalagem de Perfil', 'GUARNIÇÃO'
WHERE NOT EXISTS (
  SELECT 1 FROM maquinas WHERE lower(nome) LIKE '%embalagem de perfil%'
);

-- Verificação
SELECT id, codigo, nome, setor FROM maquinas WHERE lower(nome) LIKE '%embalagem%' ORDER BY nome;
