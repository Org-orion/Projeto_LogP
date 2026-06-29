-- ==========================================================
-- Corrige separação entre "produto fabricado" e "material de entrada"
-- nos registros da Seccionadora 1 e Seccionadora 2
--
-- Situação atual:
--   produto       = "MDF RUC 3mm x2,135m x2,750m..." (material de entrada - ERRADO)
--   tipo_material = "MDF Comum" / "MDF Hidro"        (tipo genérico)
--
-- Situação desejada:
--   produto       = "Tampo Comum", "C.H de Quadro"... (produto fabricado)
--   tipo_material = "MDF RUC 3mm x2,135m x2,750m..."  (material de entrada)
-- ==========================================================

-- Pré-visualização: quantos registros serão afetados
SELECT
  maquina,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE produto ILIKE 'MDF%') AS com_mdf_em_produto,
  COUNT(*) FILTER (WHERE produto NOT ILIKE 'MDF%' AND produto IS NOT NULL) AS ja_corretos
FROM registros_producao
WHERE maquina ILIKE '%seccionadora%'
GROUP BY maquina
ORDER BY maquina;

-- ==========================================================
-- PASSO 1: copiar a especificação MDF de "produto" para "tipo_material"
--          (sobrescreve o tipo genérico "MDF Comum"/"MDF Hidro")
-- ==========================================================
UPDATE registros_producao
SET tipo_material = produto
WHERE maquina ILIKE '%seccionadora%'
  AND produto ILIKE 'MDF%';

-- ==========================================================
-- PASSO 2: preencher "produto" com a descrição correta
--          a partir do catálogo, usando cod_produto
-- ==========================================================
UPDATE registros_producao rp
SET produto = p.descricao
FROM produtos p
WHERE rp.maquina ILIKE '%seccionadora%'
  AND rp.tipo_material ILIKE 'MDF%'   -- já foi movido no passo 1
  AND rp.cod_produto = p.codigo;

-- ==========================================================
-- PASSO 3: registros sem cod_produto correspondente → produto = NULL
--          (será identificável para revisão manual)
-- ==========================================================
UPDATE registros_producao
SET produto = NULL
WHERE maquina ILIKE '%seccionadora%'
  AND tipo_material ILIKE 'MDF%'
  AND produto ILIKE 'MDF%';  -- ainda tem MDF = não foi atualizado no passo 2

-- ==========================================================
-- Verificação final
-- ==========================================================
SELECT
  data, maquina,
  tipo_material AS "Material de Entrada",
  produto       AS "Produto Fabricado",
  cod_produto
FROM registros_producao
WHERE maquina ILIKE '%seccionadora%'
ORDER BY data DESC
LIMIT 30;
