-- =============================================================================
-- MIGRAÇÃO: Atualiza setores e documentos da Auditoria Intertek 2027
-- Executar no SQL Editor do Supabase (banco de auditoria)
-- Preserva status/progresso já registrado nos documentos existentes.
-- =============================================================================

DO $$
DECLARE
  v_aud uuid;
BEGIN

  -- Localiza a auditoria pelo nome
  SELECT id INTO v_aud
  FROM auditorias
  WHERE nome = 'Auditoria Intertek' AND ano = 2027;

  IF v_aud IS NULL THEN
    RAISE EXCEPTION 'Auditoria "Auditoria Intertek 2027" não encontrada.';
  END IF;

  -- ── Remove setores obsoletos (cascade deleta seus documentos) ──────────────
  DELETE FROM auditoria_setores
  WHERE auditoria_id = v_aud
    AND nome IN ('Folha de Pagamento', 'Cartão de Ponto');

  -- ── Renomeia e reordena setores existentes ─────────────────────────────────
  UPDATE auditoria_setores SET nome = 'Prontuário dos Empregados Selecionados', ordem = 2
  WHERE auditoria_id = v_aud AND nome = 'Prontuário dos Empregados';

  UPDATE auditoria_setores SET nome = 'Alvarás e/ou Licenças', ordem = 4
  WHERE auditoria_id = v_aud AND nome = 'Alvarás e Licenças';

  UPDATE auditoria_setores SET ordem = 1 WHERE auditoria_id = v_aud AND nome = 'Recursos Humanos';
  UPDATE auditoria_setores SET ordem = 3 WHERE auditoria_id = v_aud AND nome = 'Documentos de RH';
  UPDATE auditoria_setores SET ordem = 5 WHERE auditoria_id = v_aud AND nome = 'Saúde e Segurança do Trabalho';
  UPDATE auditoria_setores SET ordem = 6 WHERE auditoria_id = v_aud AND nome = 'Meio Ambiente';
  UPDATE auditoria_setores SET ordem = 7 WHERE auditoria_id = v_aud AND nome = 'Sistema de Gestão Social';
  UPDATE auditoria_setores SET ordem = 8 WHERE auditoria_id = v_aud AND nome = 'Sistema de Gestão da Qualidade';

  -- ── Atualiza descrição do item E-Social (3.3) ─────────────────────────────
  UPDATE auditoria_documentos
  SET nome = 'Relatórios E-Social: S-2100 / S-2200 (cadastramento/admissão) / S-1200 (vínculo INSS) / S-2230 (afastamentos) / S-2299 (desligamentos) / RE-GFIP'
  WHERE nome LIKE 'Relatórios E-Social%'
    AND setor_id IN (
      SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Documentos de RH'
    );

  -- ── Atualiza nomes detalhados de outros documentos ────────────────────────

  -- 3.1
  UPDATE auditoria_documentos SET nome = 'Certidão Negativa do FGTS (Fundo de Garantia do Tempo de Serviço)'
  WHERE nome = 'Certidão Negativa do FGTS'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Documentos de RH');

  -- 3.2
  UPDATE auditoria_documentos SET nome = 'Certidão Negativa do INSS (Instituto Nacional do Seguro Social)'
  WHERE nome = 'Certidão Negativa do INSS'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Documentos de RH');

  -- 4.4
  UPDATE auditoria_documentos SET nome = 'Licença de Operação Ambiental do órgão competente local ou Certificado de Dispensa'
  WHERE nome LIKE 'Licença de Operação Ambiental%'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Alvarás e/ou Licenças');

  -- 4.5
  UPDATE auditoria_documentos SET nome = 'ANVISA – da unidade (se aplicável)'
  WHERE nome = 'ANVISA – unidade (se aplicável)'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Alvarás e/ou Licenças');

  -- 4.8
  UPDATE auditoria_documentos SET nome = 'Licença para Produtos Químicos Controlados – Polícia Civil, Polícia Federal e Exército'
  WHERE nome LIKE 'Licença para Produtos Químicos Controlados%'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Alvarás e/ou Licenças');

  -- 4.9
  UPDATE auditoria_documentos SET nome = 'Cartão do CNPJ (Cadastro Nacional da Pessoa Jurídica)'
  WHERE nome = 'Cartão do CNPJ'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Alvarás e/ou Licenças');

  -- 5.5
  UPDATE auditoria_documentos SET nome = 'FISPQ (Ficha de Informação de Segurança para Produtos Químicos) – verificado in loco'
  WHERE nome LIKE 'FISPQ%'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Saúde e Segurança do Trabalho');

  -- 6.8
  UPDATE auditoria_documentos SET nome = 'Outorga para Lançamento de Efluentes / Cadastro de Empresas Potencialmente Poluidoras – IBAMA'
  WHERE nome LIKE 'Outorga para Lançamento%'
    AND setor_id IN (SELECT id FROM auditoria_setores WHERE auditoria_id = v_aud AND nome = 'Meio Ambiente');

  RAISE NOTICE 'Migração concluída com sucesso para auditoria id=%', v_aud;

END $$;
