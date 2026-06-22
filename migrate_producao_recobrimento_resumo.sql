-- ============================================================
-- Função: producao_recobrimento_resumo
--
-- Regras de cálculo:
-- TAMPO → match no catálogo por dimensões (igual à Lixadeira)
--         espessura_mm é a espessura real do tampo
-- PORTA → SEM match no catálogo (portas não têm dim no catálogo)
--         volume = 2 faces × (largura × comprimento × 3mm)
--         produto_codigo = NULL  /  produto_descricao = campo produto
--         espessura_ref  = 3.0 (espessura de cada face MDF)
-- Outros produtos → ignorados (CONTINUE)
-- ============================================================

DROP FUNCTION IF EXISTS producao_recobrimento_resumo(date, date);

CREATE OR REPLACE FUNCTION producao_recobrimento_resumo(
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
  padrao               text,
  pecas                integer,
  volume_unitario_m3   numeric,
  consumo_m3           numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec        RECORD;
  mp         RECORD;
  mat        RECORD;
  v_tipo_mat text;
  v_vol      numeric;
  v_cat_larg numeric;
  v_cat_esp  numeric;
BEGIN
  FOR rec IN
    SELECT
      r.maquina,
      r.produto,
      r.largura_cm,
      r.comprimento_cm,
      r.espessura_mm,
      r.nucleo,
      r.padrao,
      SUM(COALESCE(r.qtd_conforme, r.qtd_producao_1, 0))::integer AS total_pecas
    FROM registros_producao r
    WHERE r.maquina ILIKE '%recobridora de tampos%'
      AND (p_inicio IS NULL OR r.data >= p_inicio)
      AND (p_fim    IS NULL OR r.data <= p_fim)
    GROUP BY r.maquina, r.produto, r.largura_cm, r.comprimento_cm,
             r.espessura_mm, r.nucleo, r.padrao
    HAVING SUM(COALESCE(r.qtd_conforme, r.qtd_producao_1, 0)) > 0
  LOOP

    IF COALESCE(rec.largura_cm, 0) = 0
    OR COALESCE(rec.comprimento_cm, 0) = 0 THEN
      CONTINUE;
    END IF;

    -- tipo_material inferido do nucleo
    v_tipo_mat := CASE
      WHEN rec.nucleo ILIKE '%hidro%' OR rec.nucleo ILIKE '%super%' THEN 'MDF Hidro'
      ELSE 'MDF Comum'
    END;

    -- ── TAMPO ────────────────────────────────────────────────────────────────
    IF rec.produto ILIKE '%tampo%' THEN

      IF COALESCE(rec.espessura_mm, 0) = 0 THEN CONTINUE; END IF;

      mp := NULL;
      SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
      FROM match_produto_por_dimensoes(
             rec.largura_cm, rec.comprimento_cm, rec.espessura_mm, NULL, v_tipo_mat
           ) m
      WHERE m.descricao ILIKE '%TAMPO%'
      LIMIT 1;

      IF mp IS NULL THEN CONTINUE; END IF;

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

      IF mat IS NULL THEN CONTINUE; END IF;

      maquina            := rec.maquina;
      produto_codigo     := mp.codigo;
      produto_descricao  := mp.descricao;
      produto_categoria  := mp.categoria;
      tipo_material      := mp.tipo_material;
      material_id        := mat.id;
      material_nome      := mat.nome;
      largura_ref        := COALESCE(v_cat_larg, rec.largura_cm);
      espessura_ref      := COALESCE(v_cat_esp,  rec.espessura_mm);
      padrao             := rec.padrao;
      pecas              := rec.total_pecas;
      volume_unitario_m3 := COALESCE(v_vol,
                              ROUND((rec.largura_cm * rec.comprimento_cm
                                     * rec.espessura_mm / 10000000.0)::numeric, 6));
      consumo_m3         := ROUND((volume_unitario_m3 * rec.total_pecas)::numeric, 6);
      RETURN NEXT;

    -- ── PORTA ────────────────────────────────────────────────────────────────
    -- MDF consumido = 2 faces de 3mm (sarrafo/miolo não é MDF)
    ELSIF rec.produto ILIKE '%porta%' THEN

      SELECT INTO mat em.id, em.nome
      FROM estoque_materiais em
      WHERE em.nome = CASE v_tipo_mat
                        WHEN 'MDF Hidro' THEN 'Chapa MDF Hidro'
                        ELSE 'Chapa MDF Comum'
                      END
        AND em.ativo = true
      LIMIT 1;

      IF mat IS NULL THEN CONTINUE; END IF;

      -- Volume de 1 face de 3mm
      v_vol := ROUND((rec.largura_cm * rec.comprimento_cm * 3.0 / 10000000.0)::numeric, 6);

      maquina            := rec.maquina;
      produto_codigo     := NULL;
      produto_descricao  := rec.produto;
      produto_categoria  := 'PORTA';
      tipo_material      := v_tipo_mat;
      material_id        := mat.id;
      material_nome      := mat.nome;
      largura_ref        := rec.largura_cm;
      espessura_ref      := 3.0;
      padrao             := rec.padrao;
      pecas              := rec.total_pecas;
      volume_unitario_m3 := v_vol * 2;
      consumo_m3         := ROUND((v_vol * 2 * rec.total_pecas)::numeric, 6);
      RETURN NEXT;

    END IF;
    -- Outros produtos (NULL, "Outro", etc.) → ignorados

  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION producao_recobrimento_resumo(date, date) TO anon;
GRANT EXECUTE ON FUNCTION producao_recobrimento_resumo(date, date) TO authenticated;

-- Teste junho/2026
SELECT produto_codigo, produto_descricao, padrao, tipo_material,
       SUM(pecas) AS pecas, ROUND(SUM(consumo_m3), 4) AS consumo_m3
FROM producao_recobrimento_resumo('2026-06-01', '2026-06-30')
GROUP BY produto_codigo, produto_descricao, padrao, tipo_material
ORDER BY produto_descricao, padrao;
