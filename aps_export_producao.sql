-- =============================================================================
-- APS EXPORT — Apontamentos de Produção por Lote e Máquina
-- Banco: Supabase (PostgreSQL) | Tabela: registros_producao
--
-- Estrutura gerada:
--   v_aps_apontamentos      → 1 linha por apontamento (lote × máquina × turno)
--   v_aps_capacidade_maquina → 1 linha por máquina × produto × mês (agregado)
--
-- Como exportar para CSV:
--   Supabase Dashboard → SQL Editor → cole a query e clique em "Export CSV"
--   OU via psql: COPY (SELECT * FROM v_aps_apontamentos) TO '/tmp/aps.csv'
--                WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');
-- =============================================================================


-- =============================================================================
-- 1. VIEW PRINCIPAL — Apontamentos individuais (granularidade: lote)
-- =============================================================================

CREATE OR REPLACE VIEW v_aps_apontamentos AS

WITH base AS (
  SELECT
    -- ------------------------------------------------------------------
    -- Identificação do apontamento
    -- ------------------------------------------------------------------
    id,
    data::date                    AS data,
    maquina,
    setor,
    n_lote,
    lote_fornecedor,

    -- ------------------------------------------------------------------
    -- Produto
    -- ------------------------------------------------------------------
    produto,
    cod_produto,
    cliente,
    linha,
    padrao,
    acabamento,
    nucleo,

    -- ------------------------------------------------------------------
    -- Tempo de ciclo
    -- hora_inicial / hora_final são do tipo TIME nativo do PostgreSQL
    -- ------------------------------------------------------------------
    hora_inicial,
    hora_final,
    CASE
      WHEN hora_inicial IS NOT NULL AND hora_final IS NOT NULL
      THEN ROUND(
        EXTRACT(EPOCH FROM (hora_final - hora_inicial)) / 60.0
      , 2)
      ELSE NULL
    END AS tempo_ciclo_min,

    -- ------------------------------------------------------------------
    -- Quantidades
    -- ------------------------------------------------------------------
    COALESCE(qtd_conforme, 0) AS qtd_conforme,
    (
      COALESCE(qtd_nao_conforme_1, 0) +
      COALESCE(qtd_nao_conforme_2, 0) +
      COALESCE(qtd_nao_conforme_3, 0) +
      COALESCE(qtd_nao_conforme_4, 0)
    ) AS qtd_nao_conforme_total,

    -- ------------------------------------------------------------------
    -- Dimensões normalizadas
    -- Lógica de prioridade: kit > batente/perfil > coluna padrão
    --
    -- dim_largura_cm   → LARGURA do produto principal daquela máquina
    -- dim_comprimento_cm → COMPRIMENTO / ALTURA do produto
    -- dim_espessura_mm → ESPESSURA em mm
    -- ------------------------------------------------------------------
    COALESCE(
      largura_kit_cm,     -- Montagem do Kit
      largura_batente_cm, -- Plaina Moldureira de Batente
      largura_cm          -- demais máquinas (largura_perfil excluída: armazena texto "WxH", ex: "5x7")
    ) AS dim_largura_cm,

    COALESCE(
      altura_kit_cm,        -- Montagem do Kit
      comprimento_cm        -- demais máquinas
    ) AS dim_comprimento_cm,

    espessura_mm            AS dim_espessura_mm,

    -- ------------------------------------------------------------------
    -- Dimensões brutas (manter colunas originais para referência)
    -- ------------------------------------------------------------------
    largura_cm,
    comprimento_cm,
    espessura_mm,
    largura_kit_cm,
    altura_kit_cm,
    largura_batente_cm,
    largura_perfil,
    largura_papel_cm,

    -- ------------------------------------------------------------------
    -- Não conformidades detalhadas
    -- ------------------------------------------------------------------
    tipo_defeito_1,         qtd_nao_conforme_1,
    tipo_defeito_2,         qtd_nao_conforme_2,
    tipo_defeito_3,         qtd_nao_conforme_3,
    tipo_defeito_4,         qtd_nao_conforme_4,

    observacao

  FROM registros_producao
  WHERE hora_inicial IS NOT NULL
    AND qtd_conforme IS NOT NULL
)

SELECT
  *,
  -- Throughput calculado após a CTE (depende de tempo_ciclo_min)
  CASE
    WHEN tempo_ciclo_min > 0
    THEN ROUND(
      (qtd_conforme::numeric / (tempo_ciclo_min / 60.0))::numeric, 2
    )
    ELSE NULL
  END AS throughput_pecas_hora

FROM base
ORDER BY data DESC, maquina, hora_inicial;


-- =============================================================================
-- 2. VIEW AGREGADA — Capacidade por máquina × produto × mês
-- Parâmetros de entrada para o motor de planejamento do APS
-- =============================================================================

CREATE OR REPLACE VIEW v_aps_capacidade_maquina AS

SELECT
  maquina,
  setor,
  DATE_TRUNC('month', data)       AS mes,
  produto,

  -- Volume
  COUNT(*)                        AS total_apontamentos,
  SUM(qtd_conforme)               AS qtd_conforme_total,
  SUM(qtd_nao_conforme_total)     AS qtd_nc_total,

  -- Tempo e throughput
  ROUND(AVG(tempo_ciclo_min), 2)          AS tempo_ciclo_medio_min,
  ROUND(
    (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tempo_ciclo_min))::numeric
  , 2)                                    AS tempo_ciclo_mediano_min,
  ROUND(AVG(throughput_pecas_hora), 2)    AS throughput_medio_pecas_hora,

  -- Índice de qualidade (OEE parcial)
  ROUND(
    SUM(qtd_conforme)::numeric /
    NULLIF(SUM(qtd_conforme) + SUM(qtd_nao_conforme_total), 0) * 100
  , 2)                                    AS indice_qualidade_pct,

  -- Dimensões do produto (range observado no período)
  MIN(dim_largura_cm)             AS dim_largura_min_cm,
  MAX(dim_largura_cm)             AS dim_largura_max_cm,
  MIN(dim_comprimento_cm)         AS dim_comprimento_min_cm,
  MAX(dim_comprimento_cm)         AS dim_comprimento_max_cm,
  MIN(dim_espessura_mm)           AS dim_espessura_min_mm,
  MAX(dim_espessura_mm)           AS dim_espessura_max_mm

FROM v_aps_apontamentos
GROUP BY maquina, setor, DATE_TRUNC('month', data), produto
ORDER BY mes DESC, maquina, produto;


-- =============================================================================
-- 3. QUERIES DE USO — Cole no SQL Editor do Supabase conforme necessidade
-- =============================================================================

-- A) Todos os apontamentos (exportar CSV completo)
-- SELECT * FROM v_aps_apontamentos;

-- B) Filtrar por período
-- SELECT * FROM v_aps_apontamentos
-- WHERE data BETWEEN '2026-05-01' AND '2026-05-31'
-- ORDER BY maquina, hora_inicial;

-- C) Filtrar por máquina específica
-- SELECT * FROM v_aps_apontamentos
-- WHERE maquina ILIKE '%SECCIONADORA%';

-- D) Capacidade das máquinas no mês atual (parâmetros para o APS)
-- SELECT
--   maquina,
--   setor,
--   SUM(qtd_conforme_total)                  AS producao_mes,
--   ROUND(AVG(throughput_medio_pecas_hora), 2) AS throughput_medio,
--   ROUND(AVG(tempo_ciclo_medio_min), 2)       AS ciclo_medio_min,
--   ROUND(AVG(indice_qualidade_pct), 2)        AS qualidade_pct
-- FROM v_aps_capacidade_maquina
-- WHERE mes = DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY maquina, setor
-- ORDER BY maquina;

-- E) Não conformidades por máquina e tipo de defeito
-- SELECT
--   maquina,
--   tipo_defeito_1   AS tipo_defeito,
--   SUM(qtd_nao_conforme_1) AS qtd
-- FROM v_aps_apontamentos
-- WHERE tipo_defeito_1 IS NOT NULL
-- GROUP BY maquina, tipo_defeito_1
-- UNION ALL
-- SELECT maquina, tipo_defeito_2, SUM(qtd_nao_conforme_2)
-- FROM v_aps_apontamentos WHERE tipo_defeito_2 IS NOT NULL GROUP BY maquina, tipo_defeito_2
-- UNION ALL
-- SELECT maquina, tipo_defeito_3, SUM(qtd_nao_conforme_3)
-- FROM v_aps_apontamentos WHERE tipo_defeito_3 IS NOT NULL GROUP BY maquina, tipo_defeito_3
-- UNION ALL
-- SELECT maquina, tipo_defeito_4, SUM(qtd_nao_conforme_4)
-- FROM v_aps_apontamentos WHERE tipo_defeito_4 IS NOT NULL GROUP BY maquina, tipo_defeito_4
-- ORDER BY maquina, qtd DESC;


-- =============================================================================
-- 4. MAPEAMENTO DE CAMPOS POR MÁQUINA
-- Referência rápida: quais colunas cada máquina preenche
-- =============================================================================
--
-- MÁQUINA                     | dim_largura     | dim_comprimento | dim_espessura | campos extras
-- ----------------------------|-----------------|-----------------|---------------|------------------------------
-- SECCIONADORA 1 / 2          | largura_cm      | comprimento_cm  | espessura_mm  | qtd_producao_1/2, qtd_sobra
-- MULTI SERRA PERFIL          | largura_cm      | comprimento_cm  | espessura_mm  | qtd_sobra
-- MOLDUREIRA ALIZAR 1/2       | largura_perfil  | comprimento_cm  | espessura_mm  | —
-- PLAINA MOLDUREIRA BATENTE   | largura_batente | —               | espessura_mm  | prof_rasgo_regulagem/borracha
-- COLADEIRA DE ALIZAR 1/2     | largura_perfil  | comprimento_cm  | espessura_mm  | —
-- COLAGEM DE BORDA            | largura_cm      | comprimento_cm  | espessura_mm  | tipo_cola
-- ESQUADREJADEIRA             | largura_cm      | comprimento_cm  | espessura_mm  | desvio_esquadro_mm, paralelismo
-- LIXADEIRA 1/2               | largura_cm      | comprimento_cm  | espessura_mm  | retilineidade, textura
-- RECOBRIDORA PERFIL          | largura_perfil  | comprimento_cm  | espessura_mm  | largura_papel_cm, rasgo_borracha
-- RECOBRIDORA TAMPOS          | largura_cm      | comprimento_cm  | espessura_mm  | temperatura_c, tempo_cura
-- PRENSA FRIA                 | largura_cm      | comprimento_cm  | espessura_mm  | pressao_kgf_cm2, numero_maquina
-- MONTADORA DE GRADE 1/2      | largura_cm      | —               | —             | —
-- MONTAGEM DO QUADRO 2-5      | largura_cm      | comprimento_cm  | espessura_mm  | —
-- MONTAGEM DO KIT 1-4         | largura_kit_cm  | altura_kit_cm   | —             | entre_folha_*, sistema_trava
-- FURAÇÃO E CORTE PORTAS      | largura_cm      | comprimento_cm  | —             | altura_dobradica_inf/sup
-- LINHA DE PINTURA PORTAS     | largura_cm      | comprimento_cm  | espessura_mm  | qtd_demao, gramatura_gm2
-- LINHA DE PINTURA TAMPO      | largura_cm      | comprimento_cm  | espessura_mm  | qtd_demao, gramatura_gm2
-- EMBALAGEM DE KITS           | largura_cm      | comprimento_cm  | —             | —
-- EMBALAGEM DE PORTAS 1       | largura_cm      | comprimento_cm  | —             | —
-- =============================================================================


-- =============================================================================
-- 5. RESUMO DE CAPACIDADE POR MÁQUINA — Maio 2026
-- 1 linha por máquina × produto (dimensão + cor/padrão)
-- Cole direto no SQL Editor e exporte como CSV
-- =============================================================================

SELECT
  maquina,

  -- Produto / SKU
  COALESCE(produto, linha || ' ' || COALESCE(padrao, ''), 'N/D')   AS produto,
  COALESCE(padrao, '')                                               AS cor_padrao,
  COALESCE(nucleo, '')                                               AS nucleo,

  -- Dimensões observadas no mês (range)
  MIN(COALESCE(largura_kit_cm, largura_batente_cm, largura_cm))     AS larg_min_cm,
  MAX(COALESCE(largura_kit_cm, largura_batente_cm, largura_cm))     AS larg_max_cm,
  MIN(COALESCE(altura_kit_cm,  comprimento_cm))                     AS comp_min_cm,
  MAX(COALESCE(altura_kit_cm,  comprimento_cm))                     AS comp_max_cm,
  MIN(espessura_mm)                                                  AS esp_min_mm,
  MAX(espessura_mm)                                                  AS esp_max_mm,
  largura_perfil                                                     AS perfil_dim,   -- ex: "5x7" (texto)

  -- Volume total
  COUNT(*)                                                           AS qtd_apontamentos,
  SUM(qtd_conforme)                                                  AS producao_total,
  SUM(
    COALESCE(qtd_nao_conforme_1,0) + COALESCE(qtd_nao_conforme_2,0) +
    COALESCE(qtd_nao_conforme_3,0) + COALESCE(qtd_nao_conforme_4,0)
  )                                                                  AS nc_total,

  -- Índice de qualidade
  ROUND(
    SUM(qtd_conforme)::numeric /
    NULLIF(SUM(qtd_conforme) + SUM(
      COALESCE(qtd_nao_conforme_1,0) + COALESCE(qtd_nao_conforme_2,0) +
      COALESCE(qtd_nao_conforme_3,0) + COALESCE(qtd_nao_conforme_4,0)
    ), 0) * 100
  , 1)                                                               AS qualidade_pct,

  -- Tempo de ciclo (somente registros com hora_final preenchida)
  ROUND(AVG(
    CASE WHEN hora_inicial IS NOT NULL AND hora_final IS NOT NULL
    THEN EXTRACT(EPOCH FROM (hora_final - hora_inicial)) / 60.0
    END
  ), 1)                                                              AS ciclo_medio_min,

  -- Throughput médio (peças/hora)
  ROUND(AVG(
    CASE
      WHEN hora_inicial IS NOT NULL AND hora_final IS NOT NULL
       AND EXTRACT(EPOCH FROM (hora_final - hora_inicial)) > 0
      THEN qtd_conforme::numeric /
           (EXTRACT(EPOCH FROM (hora_final - hora_inicial)) / 3600.0)
    END
  ), 1)                                                              AS throughput_medio_pecas_hora,

  -- Melhor e pior turno (referência de capacidade máxima)
  MAX(qtd_conforme)                                                  AS melhor_apontamento,
  MIN(NULLIF(qtd_conforme, 0))                                       AS pior_apontamento

FROM registros_producao
WHERE data >= '2026-05-01'
  AND data <  '2026-06-01'
  AND hora_inicial IS NOT NULL
  AND qtd_conforme IS NOT NULL

GROUP BY
  maquina,
  COALESCE(produto, linha || ' ' || COALESCE(padrao, ''), 'N/D'),
  padrao,
  nucleo,
  largura_perfil

ORDER BY
  maquina,
  producao_total DESC;


-- =============================================================================
-- 6. TEMPO DE SETUP ENTRE TROCAS — Maio 2026
-- Gap entre hora_final de um apontamento e hora_inicial do próximo
-- na mesma máquina e dia = tempo de regulagem/troca de produto
-- Gaps > 90 min excluídos (almoço, paradas longas)
-- =============================================================================

WITH sequencia AS (
  SELECT
    maquina,
    data,
    hora_inicial,
    hora_final,
    LAG(hora_final)  OVER (PARTITION BY maquina, data ORDER BY hora_inicial) AS fim_anterior,
    LAG(COALESCE(produto, linha || ' ' || COALESCE(padrao,''), 'N/D'))
                     OVER (PARTITION BY maquina, data ORDER BY hora_inicial) AS produto_anterior,
    COALESCE(produto, linha || ' ' || COALESCE(padrao,''), 'N/D')            AS produto_atual
  FROM registros_producao
  WHERE data >= '2026-05-01'
    AND data <  '2026-06-01'
    AND hora_inicial IS NOT NULL
    AND qtd_conforme > 0
),
setups AS (
  SELECT
    maquina,
    produto_anterior,
    produto_atual,
    EXTRACT(EPOCH FROM (hora_inicial - fim_anterior)) / 60.0 AS setup_min
  FROM sequencia
  WHERE fim_anterior IS NOT NULL
    AND hora_inicial > fim_anterior
    AND EXTRACT(EPOCH FROM (hora_inicial - fim_anterior)) / 60.0 BETWEEN 1 AND 90
)
SELECT
  maquina,
  COUNT(*)                         AS total_trocas_observadas,
  ROUND(MIN(setup_min),  1)        AS setup_min_min,
  ROUND(AVG(setup_min),  1)        AS setup_medio_min,
  ROUND(
    (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY setup_min))::numeric
  , 1)                             AS setup_mediano_min,
  ROUND(MAX(setup_min),  1)        AS setup_max_min
FROM setups
GROUP BY maquina
ORDER BY setup_medio_min DESC;


-- =============================================================================
-- 7. JANELA DE OPERAÇÃO POR MÁQUINA — Maio 2026
-- Horário típico de início e fim, turno médio e extremos observados
-- =============================================================================

WITH por_dia AS (
  SELECT
    maquina,
    data,
    MIN(hora_inicial) AS inicio_dia,
    MAX(hora_final)   AS fim_dia
  FROM registros_producao
  WHERE data >= '2026-05-01'
    AND data <  '2026-06-01'
    AND hora_inicial IS NOT NULL
    AND hora_final   IS NOT NULL
    AND qtd_conforme > 0
  GROUP BY maquina, data
)
SELECT
  maquina,
  TO_CHAR(MIN(inicio_dia),                       'HH24:MI') AS inicio_mais_cedo,
  TO_CHAR(
    TO_TIMESTAMP(AVG(EXTRACT(EPOCH FROM inicio_dia)))::time, 'HH24:MI'
  )                                                          AS inicio_tipico,
  TO_CHAR(
    TO_TIMESTAMP(AVG(EXTRACT(EPOCH FROM fim_dia)))::time,   'HH24:MI'
  )                                                          AS fim_tipico,
  TO_CHAR(MAX(fim_dia),                           'HH24:MI') AS fim_mais_tarde,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (fim_dia - inicio_dia)) / 3600.0
  ), 1)                                                      AS janela_media_horas
FROM por_dia
GROUP BY maquina
ORDER BY inicio_tipico;


-- =============================================================================
-- 8. DISPONIBILIDADE POR MÁQUINA — Maio 2026
-- Dias ativos da máquina vs dias em que a fábrica teve produção
-- =============================================================================

WITH dias_fabrica AS (
  SELECT DISTINCT data
  FROM registros_producao
  WHERE data >= '2026-05-01'
    AND data <  '2026-06-01'
    AND qtd_conforme > 0
),
dias_maquina AS (
  SELECT
    maquina,
    COUNT(DISTINCT data) AS dias_ativa
  FROM registros_producao
  WHERE data >= '2026-05-01'
    AND data <  '2026-06-01'
    AND qtd_conforme > 0
  GROUP BY maquina
)
SELECT
  m.maquina,
  m.dias_ativa,
  (SELECT COUNT(*) FROM dias_fabrica)          AS dias_fabrica_aberta,
  ROUND(
    m.dias_ativa::numeric /
    (SELECT COUNT(*) FROM dias_fabrica) * 100
  , 1)                                         AS disponibilidade_pct
FROM dias_maquina m
ORDER BY disponibilidade_pct DESC, maquina;


-- =============================================================================
-- 9. TAMANHO DE LOTE POR MÁQUINA E PRODUTO — Maio 2026
-- Referência para o APS definir lotes mínimos, máximos e típicos
-- =============================================================================

SELECT
  maquina,
  COALESCE(produto, linha || ' ' || COALESCE(padrao,''), 'N/D') AS produto,
  COUNT(*)                                                        AS total_lotes,
  MIN(qtd_conforme)                                               AS lote_minimo,
  ROUND(
    (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qtd_conforme))::numeric
  , 0)                                                            AS lote_mediano,
  ROUND(AVG(qtd_conforme), 0)                                     AS lote_medio,
  MAX(qtd_conforme)                                               AS lote_maximo
FROM registros_producao
WHERE data >= '2026-05-01'
  AND data <  '2026-06-01'
  AND qtd_conforme > 0
GROUP BY
  maquina,
  COALESCE(produto, linha || ' ' || COALESCE(padrao,''), 'N/D')
ORDER BY maquina, lote_medio DESC;
