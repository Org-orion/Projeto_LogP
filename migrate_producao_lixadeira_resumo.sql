-- ============================================================
-- Função: producao_lixadeira_resumo (v2)
-- v2: agrupa registros por dimensão ANTES de chamar
--     match_produto_por_dimensoes — reduz de N chamadas
--     (uma por linha) para M chamadas (uma por grupo único),
--     evitando statement_timeout no PostgREST.
--
-- Diferenças vs producao_seccionadora_resumo:
-- • Sem PRODUÇÃO 2 nem SOBRA
-- • tipo_material = NULL em todos os registros → inferido do
--   campo `produto` ('Tampo Comum', 'Tampo Hidro', 'Aba de Alizar')
-- • espessura_mm grava a quantidade removida (0.3mm, 2.8mm),
--   não a espessura do produto → esp < 3.0 usa 3.0mm no match
--   Exceção: RA216x924e9H tem esp=9mm real → preserva.
-- • Quantidade: qtd_conforme prioritário sobre qtd_producao_1
-- • p_maquina=NULL no match: tampos têm maquina_entrada='Seccionadora',
--   Régua de Alizar tem maquina_entrada='Lixadeira'
-- • SET search_path = public para funcionar via PostgREST (anon)
-- ============================================================

DROP FUNCTION IF EXISTS producao_lixadeira_resumo(date, date);

CREATE OR REPLACE FUNCTION producao_lixadeira_resumo(
  p_inicio date DEFAULT NULL,
  p_fim    date DEFAULT NULL
)
RETURNS TABLE (
  maquina              text,
  produto_codigo       text,
  produto_descricao    text,
  produto_categoria    text,
  tipo_material        text,
  material_id          integer,
  material_nome        text,
  largura_ref          numeric,
  espessura_ref        numeric,
  pecas                integer,
  volume_unitario_m3   numeric,
  consumo_m3           numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec         RECORD;
  mp          RECORD;
  mat         RECORD;
  v_esp_match numeric;
  v_tipo_mat  text;
  v_nome_hint text;
  v_vol       numeric;
  v_cat_larg  numeric;
  v_cat_esp   numeric;
BEGIN
  -- Agrupa por dimensão antes de fazer match — evita N chamadas ao
  -- match_produto_por_dimensoes (uma por linha), reduzindo para M
  -- (uma por grupo único de produto+dimensões).
  FOR rec IN
    SELECT
      r.maquina,
      r.produto,
      r.largura_cm,
      r.comprimento_cm,
      r.espessura_mm,
      SUM(COALESCE(r.qtd_conforme, r.qtd_producao_1, 0))::integer AS total_pecas
    FROM registros_producao r
    WHERE r.maquina ILIKE '%lixadeira%'
      AND (p_inicio IS NULL OR r.data >= p_inicio)
      AND (p_fim    IS NULL OR r.data <= p_fim)
    GROUP BY r.maquina, r.produto, r.largura_cm, r.comprimento_cm, r.espessura_mm
    HAVING SUM(COALESCE(r.qtd_conforme, r.qtd_producao_1, 0)) > 0
  LOOP

    IF COALESCE(rec.largura_cm, 0) = 0
    OR COALESCE(rec.comprimento_cm, 0) = 0 THEN
      CONTINUE;
    END IF;

    -- esp registrada é a quantidade lixada (0.3mm, 2.8mm).
    -- Produtos no catálogo têm dim_espessura=3mm.
    -- Exceção: esp >= 3.0 é espessura real (ex: RA216x924e9H = 9mm).
    v_esp_match := CASE
      WHEN COALESCE(rec.espessura_mm, 0) < 3.0 THEN 3.0
      ELSE COALESCE(rec.espessura_mm, 0)
    END;

    -- Inferir tipo_material do campo produto (tipo_material=NULL na Lixadeira)
    v_tipo_mat := CASE
      WHEN rec.produto ILIKE '%hidro%' OR rec.produto ILIKE '%super%' THEN 'MDF Hidro'
      WHEN rec.produto ILIKE '%comum%'                                 THEN 'MDF Comum'
      WHEN rec.produto ILIKE '%aba%'                                   THEN 'MDF Hidro'
      WHEN rec.produto ILIKE '%outro%'                                 THEN 'MDF Hidro'
      ELSE 'MDF Comum'
    END;

    -- Hint de nome para evitar falso-match entre produtos de mesma largura
    v_nome_hint := CASE
      WHEN rec.produto ILIKE '%tampo%' THEN 'TAMPO'
      WHEN rec.produto ILIKE '%aba%'   THEN 'ABA DE ALIZAR'
      WHEN rec.produto ILIKE '%outro%' THEN 'RÉGUA DE ALIZAR'
      ELSE NULL
    END;

    mp := NULL;

    -- 1º: match por nome + dimensão
    IF v_nome_hint IS NOT NULL THEN
      SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
      FROM match_produto_por_dimensoes(rec.largura_cm, rec.comprimento_cm, v_esp_match, NULL, v_tipo_mat) m
      WHERE m.descricao ILIKE '%' || v_nome_hint || '%'
      LIMIT 1;
    END IF;

    -- 2º: fallback dimensão pura
    IF mp IS NULL THEN
      SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
      FROM match_produto_por_dimensoes(rec.largura_cm, rec.comprimento_cm, v_esp_match, NULL, v_tipo_mat) m
      LIMIT 1;
    END IF;

    IF mp IS NOT NULL THEN
      SELECT p.volume_m3, p.dim_largura, p.dim_espessura
      INTO v_vol, v_cat_larg, v_cat_esp
      FROM produtos p WHERE p.codigo = mp.codigo;

      SELECT INTO mat em.id, em.nome
      FROM estoque_materiais em
      WHERE em.nome = CASE mp.tipo_material
                        WHEN 'MDF Hidro' THEN 'Chapa MDF Hidro'
                        ELSE 'Chapa MDF Comum'
                      END
        AND em.ativo = true
      LIMIT 1;

      IF mat IS NOT NULL THEN
        maquina            := rec.maquina;
        produto_codigo     := mp.codigo;
        produto_descricao  := mp.descricao;
        produto_categoria  := mp.categoria;
        tipo_material      := mp.tipo_material;
        material_id        := mat.id;
        material_nome      := mat.nome;
        largura_ref        := COALESCE(v_cat_larg, rec.largura_cm);
        espessura_ref      := COALESCE(v_cat_esp, v_esp_match);
        pecas              := rec.total_pecas;
        volume_unitario_m3 := COALESCE(v_vol,
                                ROUND((rec.largura_cm * rec.comprimento_cm * v_esp_match / 10000000.0)::numeric, 6));
        consumo_m3         := ROUND((volume_unitario_m3 * rec.total_pecas)::numeric, 6);
        RETURN NEXT;
      END IF;
    END IF;

  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION producao_lixadeira_resumo(date, date) TO anon;
GRANT EXECUTE ON FUNCTION producao_lixadeira_resumo(date, date) TO authenticated;

-- Teste junho/2026
SELECT produto_codigo, produto_descricao, tipo_material,
       SUM(pecas) AS pecas, ROUND(SUM(consumo_m3), 4) AS consumo_m3
FROM producao_lixadeira_resumo('2026-06-01', '2026-06-30')
GROUP BY produto_codigo, produto_descricao, tipo_material
ORDER BY produto_descricao;
