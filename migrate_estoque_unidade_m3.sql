-- Atualiza unidade de m² para m³ nos materiais de chapa MDF
UPDATE estoque_materiais
SET unidade = 'm³'
WHERE nome IN ('Chapa MDF Comum', 'Chapa MDF Hidro');

-- Confirma
SELECT id, nome, unidade FROM estoque_materiais ORDER BY id;
