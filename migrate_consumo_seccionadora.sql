-- ============================================================
-- Função: consumo_mdf_seccionadora (v5)
-- Consumo = dimensões da CHAPA RECEBIDA (não da peça cortada)
-- qtd_chapas × larg_recebido_cm × comp_recebido_cm × esp_recebido_mm
-- pecas = qtd_conforme (total de peças produzidas, não chapas)
--   Secc 1: qtd_conforme = total peças
--   Secc 2: qtd_conforme = qtd_producao_1 + qtd_producao_2
-- ============================================================

DROP FUNCTION IF EXISTS consumo_mdf_seccionadora(date, date);
DROP FUNCTION IF EXISTS consumo_mdf_seccionadora(date, date, text);

CREATE OR REPLACE FUNCTION consumo_mdf_seccionadora(
  p_inicio  date DEFAULT NULL,
  p_fim     date DEFAULT NULL,
  p_maquina text DEFAULT NULL
)
RETURNS TABLE (
  dia           date,
  material_id   integer,
  material_nome text,
  consumo_m3    numeric,
  pecas         integer   -- total de peças produzidas (qtd_conforme)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  r   registros_producao%ROWTYPE;
  mat RECORD;
  mp  RECORD;
BEGIN
  FOR r IN
    SELECT *
    FROM registros_producao rp
    WHERE rp.maquina ILIKE '%seccionadora%'
      AND (p_maquina IS NULL OR rp.maquina = p_maquina)
      AND rp.larg_recebido_cm IS NOT NULL AND rp.larg_recebido_cm > 0
      AND rp.comp_recebido_cm IS NOT NULL AND rp.comp_recebido_cm > 0
      AND rp.esp_recebido_mm  IS NOT NULL AND rp.esp_recebido_mm  > 0
      AND rp.qtd_chapas       IS NOT NULL AND rp.qtd_chapas       > 0
      AND (p_inicio IS NULL OR rp.data >= p_inicio)
      AND (p_fim    IS NULL OR rp.data <= p_fim)
  LOOP
    SELECT INTO mat em.id, em.nome
    FROM estoque_materiais em
    WHERE em.nome = CASE
        WHEN r.produto ILIKE '%hidro%' OR r.produto ILIKE '%super%' THEN 'Chapa MDF Hidro'
        WHEN r.produto ILIKE '%comum%'                              THEN 'Chapa MDF Comum'
        WHEN r.tipo_material ILIKE '%hidro%' OR r.tipo_material ILIKE '%super%' THEN 'Chapa MDF Hidro'
        ELSE 'Chapa MDF Comum'
      END
      AND em.ativo = true
    LIMIT 1;

    IF mat IS NULL AND r.largura_cm > 0 AND r.comprimento_cm > 0 THEN
      SELECT INTO mp m.tipo_material
      FROM match_produto_por_dimensoes(r.largura_cm, r.comprimento_cm, r.espessura_mm, 'Seccionadora', NULL) m
      LIMIT 1;

      IF mp IS NOT NULL THEN
        SELECT INTO mat em.id, em.nome
        FROM estoque_materiais em
        WHERE em.nome = CASE mp.tipo_material
                          WHEN 'MDF Hidro' THEN 'Chapa MDF Hidro'
                          ELSE 'Chapa MDF Comum'
                        END
          AND em.ativo = true
        LIMIT 1;
      END IF;
    END IF;

    CONTINUE WHEN mat IS NULL;

    dia           := r.data::date;
    material_id   := mat.id;
    material_nome := mat.nome;
    -- Peças = total produzido (qtd_conforme agrega prod1 + prod2 em ambas as máquinas)
    pecas         := COALESCE(r.qtd_conforme, r.qtd_producao_1, 0)::integer;
    consumo_m3    := ROUND(
      (r.qtd_chapas * r.larg_recebido_cm * r.comp_recebido_cm * r.esp_recebido_mm
       / 10000000.0)::numeric, 6
    );
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION consumo_mdf_seccionadora(date, date, text) TO anon;
GRANT EXECUTE ON FUNCTION consumo_mdf_seccionadora(date, date, text) TO authenticated;

-- Teste
SELECT dia, material_nome, SUM(consumo_m3) AS total_m3, SUM(pecas) AS total_pecas_produzidas
FROM consumo_mdf_seccionadora('2026-06-01', '2026-06-30')
GROUP BY dia, material_nome
ORDER BY dia DESC
LIMIT 5;
