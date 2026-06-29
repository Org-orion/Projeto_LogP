-- Adiciona Bondoor ao estoque de materiais
-- Enchimento variável por dimensão de porta

INSERT INTO estoque_materiais (nome, categoria, unidade, preco_unitario, estoque_minimo, ativo)
SELECT 'Bondoor', 'enchimento', 'm²', 0, 0, true
WHERE NOT EXISTS (
  SELECT 1 FROM estoque_materiais WHERE nome = 'Bondoor'
);

-- Verificar
SELECT id, nome, categoria, unidade, ativo
FROM estoque_materiais
WHERE nome = 'Bondoor';
