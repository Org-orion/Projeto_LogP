-- ============================================================
-- Função: producao_seccionadora_resumo (v14)
-- v12: match por nome antes de dimensão
-- v13: Bondoor (dimensões variáveis, sem catálogo)
--      Forro adicionado ao nome_hint
--      v_tipo_mat: Régua de Alizar, Rodapé e Sarrafo
--                  forçados para MDF Comum independente do
--                  tipo_material registrado pelo operador
-- v14: SOBRA captura registros sem produto_sobra preenchido
--      usando 'SOBRA NÃO IDENTIFICADA' como fallback
-- ============================================================

DROP FUNCTION IF EXISTS producao_seccionadora_resumo(date, date);

CREATE OR REPLACE FUNCTION producao_seccionadora_resumo(
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
AS $$
DECLARE
  r          registros_producao%ROWTYPE;
  mp         RECORD;
  mat        RECORD;
  v_larg     numeric;
  v_comp     numeric;
  v_esp      numeric;
  v_qtd      integer;
  v_vol      numeric;
  v_cat_larg numeric;
  v_cat_esp  numeric;
  v_tipo_mat text;
  v_nome_hint text;
BEGIN
  FOR r IN
    SELECT *
    FROM registros_producao rp
    WHERE rp.maquina ILIKE '%seccionadora%'
      AND (p_inicio IS NULL OR rp.data >= p_inicio)
      AND (p_fim    IS NULL OR rp.data <= p_fim)
    ORDER BY rp.data DESC
  LOOP

    -- Régua de Alizar, Rodapé e Sarrafo são sempre MDF Comum independente
    -- do campo tipo_material preenchido pelo operador (que frequentemente
    -- registra 'Superflora' mesmo usando chapa comum)
    v_tipo_mat := CASE
      WHEN r.produto ILIKE '%regua de alizar%' OR r.produto ILIKE '%régua de alizar%' THEN 'MDF Comum'
      WHEN r.produto ILIKE '%rodap%'                                                   THEN 'MDF Comum'
      WHEN r.produto ILIKE '%sarrafo%'                                                 THEN 'MDF Comum'
      WHEN r.produto ILIKE '%hidro%' OR r.produto ILIKE '%super%'                     THEN 'MDF Hidro'
      WHEN r.produto ILIKE '%comum%'                                                   THEN 'MDF Comum'
      WHEN r.tipo_material ILIKE '%hidro%' OR r.tipo_material ILIKE '%super%'         THEN 'MDF Hidro'
      ELSE 'MDF Comum'
    END;

    -- Palavra-chave do produto para match por nome
    v_nome_hint := CASE
      WHEN r.produto ILIKE '%aba de alizar%'                                           THEN 'ABA DE ALIZAR'
      WHEN r.produto ILIKE '%regua de alizar%' OR r.produto ILIKE '%régua de alizar%' THEN 'REGUA DE ALIZAR'
      WHEN r.produto ILIKE '%c.h de quadro%'   OR r.produto ILIKE '%quadro%'          THEN 'QUADRO'
      WHEN r.produto ILIKE '%c.h de batente%'  OR r.produto ILIKE '%batente%'         THEN 'BATENTE'
      WHEN r.produto ILIKE '%toupa%'                                                   THEN 'TOUPA'
      WHEN r.produto ILIKE '%rodap%'                                                   THEN 'RODAP'
      WHEN r.produto ILIKE '%s. de correr%'    OR r.produto ILIKE '%correr%'          THEN 'CORRER'
      WHEN r.produto ILIKE '%sarrafo%'                                                 THEN 'SARRAFO'
      WHEN r.produto ILIKE '%forro%'                                                   THEN 'FORRO'
      ELSE NULL
    END;

    -- ── PRODUÇÃO 1 ────────────────────────────────────────────
    v_larg := COALESCE(r.largura_cm, 0);
    v_comp := COALESCE(r.comprimento_cm, 0);
    v_esp  := COALESCE(r.espessura_mm, 0);
    v_qtd  := COALESCE(r.qtd_producao_1, r.qtd_conforme, 0)::integer;

    IF v_larg > 0 AND v_comp > 0 AND v_qtd > 0 THEN

      -- Bondoor: dimensões variam por pedido — calcula volume direto sem catálogo
      IF r.produto ILIKE '%bondoor%' THEN
        SELECT INTO mat em.id, em.nome
        FROM estoque_materiais em
        WHERE em.nome = 'Bondoor' AND em.ativo = true
        LIMIT 1;

        IF mat IS NOT NULL THEN
          v_vol             := ROUND((v_larg * v_comp * GREATEST(COALESCE(v_esp, 30), 1) / 10000000.0)::numeric, 6);
          maquina           := r.maquina;
          produto_codigo    := 'BONDOOR';
          produto_descricao := 'ENCHIMENTO BONDOOR';
          produto_categoria := 'BONDOOR_SC';
          tipo_material     := 'Bondoor';
          material_id       := mat.id;
          material_nome     := mat.nome;
          largura_ref       := v_larg;
          espessura_ref     := COALESCE(v_esp, 30);
          pecas             := v_qtd;
          volume_unitario_m3 := v_vol;
          consumo_m3        := ROUND((v_vol * v_qtd)::numeric, 6);
          RETURN NEXT;
        END IF;

      ELSE
        -- Fluxo normal: match por catálogo
        mp := NULL;

        -- 1º: tenta match por nome (previne falso-match entre produtos com mesmas dimensões)
        IF v_nome_hint IS NOT NULL THEN
          SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
          FROM match_produto_por_dimensoes(v_larg, v_comp, v_esp, 'Seccionadora', v_tipo_mat) m
          WHERE m.descricao ILIKE '%' || v_nome_hint || '%'
          LIMIT 1;
        END IF;

        -- 2º: fallback por dimensão pura
        IF mp IS NULL THEN
          SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
          FROM match_produto_por_dimensoes(v_larg, v_comp, v_esp, 'Seccionadora', v_tipo_mat) m
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
            v_vol             := COALESCE(v_vol, ROUND((v_larg * v_comp * COALESCE(v_esp, 3) / 10000000.0)::numeric, 6));
            maquina           := r.maquina;
            produto_codigo    := mp.codigo;
            produto_descricao := mp.descricao;
            produto_categoria := mp.categoria;
            tipo_material     := mp.tipo_material;
            material_id       := mat.id;
            material_nome     := mat.nome;
            largura_ref       := COALESCE(v_cat_larg, v_larg);
            espessura_ref     := COALESCE(v_cat_esp, v_esp);
            pecas             := v_qtd;
            volume_unitario_m3 := v_vol;
            consumo_m3        := ROUND((v_vol * v_qtd)::numeric, 6);
            RETURN NEXT;
          END IF;
        END IF;
      END IF; -- fim Bondoor / normal

    END IF;

    -- ── PRODUÇÃO 2 ────────────────────────────────────────────
    v_larg := COALESCE(r.larg_produzido_2_cm, 0);
    v_comp := COALESCE(r.comp_produzido_2_cm, 0);
    v_esp  := COALESCE(r.esp_produzido_2_mm, 0);
    v_qtd  := COALESCE(r.qtd_producao_2, 0)::integer;

    IF v_larg > 0 AND v_comp > 0 AND v_qtd > 0 THEN

      IF r.produto ILIKE '%bondoor%' THEN
        SELECT INTO mat em.id, em.nome
        FROM estoque_materiais em
        WHERE em.nome = 'Bondoor' AND em.ativo = true
        LIMIT 1;

        IF mat IS NOT NULL THEN
          v_vol             := ROUND((v_larg * v_comp * GREATEST(COALESCE(v_esp, 30), 1) / 10000000.0)::numeric, 6);
          maquina           := r.maquina;
          produto_codigo    := 'BONDOOR';
          produto_descricao := 'ENCHIMENTO BONDOOR';
          produto_categoria := 'BONDOOR_SC';
          tipo_material     := 'Bondoor';
          material_id       := mat.id;
          material_nome     := mat.nome;
          largura_ref       := v_larg;
          espessura_ref     := COALESCE(v_esp, 30);
          pecas             := v_qtd;
          volume_unitario_m3 := v_vol;
          consumo_m3        := ROUND((v_vol * v_qtd)::numeric, 6);
          RETURN NEXT;
        END IF;

      ELSE
        mp := NULL;

        IF v_nome_hint IS NOT NULL THEN
          SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
          FROM match_produto_por_dimensoes(v_larg, v_comp, v_esp, 'Seccionadora', v_tipo_mat) m
          WHERE m.descricao ILIKE '%' || v_nome_hint || '%'
          LIMIT 1;
        END IF;

        IF mp IS NULL THEN
          SELECT INTO mp m.codigo, m.descricao, m.categoria, m.tipo_material
          FROM match_produto_por_dimensoes(v_larg, v_comp, v_esp, 'Seccionadora', v_tipo_mat) m
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
            v_vol             := COALESCE(v_vol, ROUND((v_larg * v_comp * COALESCE(v_esp, 3) / 10000000.0)::numeric, 6));
            maquina           := r.maquina;
            produto_codigo    := mp.codigo;
            produto_descricao := mp.descricao;
            produto_categoria := mp.categoria;
            tipo_material     := mp.tipo_material;
            material_id       := mat.id;
            material_nome     := mat.nome;
            largura_ref       := COALESCE(v_cat_larg, v_larg);
            espessura_ref     := COALESCE(v_cat_esp, v_esp);
            pecas             := v_qtd;
            volume_unitario_m3 := v_vol;
            consumo_m3        := ROUND((v_vol * v_qtd)::numeric, 6);
            RETURN NEXT;
          END IF;
        END IF;
      END IF;

    END IF;

    -- ── SOBRA ─────────────────────────────────────────────────
    v_larg := COALESCE(r.larg_sobra_cm, 0);
    v_comp := COALESCE(r.comp_sobra_cm, 0);
    v_esp  := COALESCE(r.esp_sobra_mm, 0);
    v_qtd  := COALESCE(r.qtd_sobra, 0)::integer;

    IF v_larg > 0 AND v_comp > 0 AND v_qtd > 0 THEN
      SELECT INTO mat em.id, em.nome
      FROM estoque_materiais em
      WHERE em.nome = CASE
          WHEN r.tipo_material ILIKE '%hidro%' OR r.tipo_material ILIKE '%super%'
            THEN 'Chapa MDF Hidro'
          ELSE 'Chapa MDF Comum'
        END
        AND em.ativo = true
      LIMIT 1;

      v_vol             := ROUND((v_larg * v_comp * COALESCE(v_esp, 3) / 10000000.0)::numeric, 6);
      maquina           := r.maquina;
      produto_codigo    := 'SOBRA';
      produto_descricao := COALESCE(r.produto_sobra, 'SOBRA NÃO IDENTIFICADA');
      produto_categoria := 'SOBRA';
      tipo_material     := COALESCE(r.tipo_material, 'MDF Comum');
      material_id       := COALESCE(mat.id, 0);
      material_nome     := COALESCE(mat.nome, '—');
      largura_ref       := v_larg;
      espessura_ref     := v_esp;
      pecas             := v_qtd;
      volume_unitario_m3 := v_vol;
      consumo_m3        := ROUND((v_vol * v_qtd)::numeric, 6);
      RETURN NEXT;
    END IF;

  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION producao_seccionadora_resumo(date, date) TO anon;
GRANT EXECUTE ON FUNCTION producao_seccionadora_resumo(date, date) TO authenticated;

-- Teste junho/2026
SELECT produto_codigo, produto_descricao, produto_categoria, tipo_material,
       SUM(pecas) AS pecas, ROUND(SUM(consumo_m3), 4) AS consumo_m3
FROM producao_seccionadora_resumo('2026-06-01', '2026-06-30')
WHERE produto_categoria <> 'SOBRA'
GROUP BY produto_codigo, produto_descricao, produto_categoria, tipo_material
ORDER BY produto_descricao;
