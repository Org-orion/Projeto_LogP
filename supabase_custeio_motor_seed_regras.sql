-- =============================================================================
-- CUSTEIO DE PRODUTO — MOTOR: seed de regras de consumo, exceções de overhead
-- e exceções de consolidação. Transcrito manualmente a partir de
-- 02_regras_de_consumo.md e 00_LEIA-ME.md (extração validada em
-- C:\Users\PC101\Desktop\Custeio\extracao_custo_producao).
--
-- CONVENÇÕES:
-- - `item` entre chaves (ex.: "{Recobrimento}") = resolve em tempo de cálculo
--   pelo valor escolhido na configuração (o motor troca "{Recobrimento}" por
--   "BRANCO"/"GREEN"/etc. antes de casar com custeio_insumos.produto). Assim
--   não precisamos de 1 linha por cor/variante — a tabela de insumos já lista
--   todas as opções possíveis, esta tabela só descreve QUANTO se consome da
--   opção selecionada.
-- - `formula` usa IF(condição, seVerdadeiro, seFalso) pra escolhas dentro da
--   mesma fórmula (ex.: coeficiente que muda por Modelo); `condicao` decide se
--   o item TODO existe pra essa config (senão, quantidade = 0).
-- - Variáveis: L (largura porta cm), A (altura porta m), Modelo, Ench
--   (Enchimento), LB (largura batente cm), Esp (espessura alizar mm), Vista,
--   Reg, CoefXBerneck (via lookup em custeio_param_alizar_perfis), Linha,
--   Padrao, Acabamento, Tipo (Melamínico/PET, via mapa_recobrimento), Pallet,
--   Montagem, Frizo/Usinagem (Sim/Não), TipoTrava.
-- - `e` (espessura do quadro) = IF(Modelo='SOFISTICATO', 0.04, 0.03).
-- - FitaM (perímetro, m) e AreaRec (área de recobrimento/pintura/cola, m²) são
--   variáveis DERIVADAS que o motor calcula antes de avaliar as regras, não
--   ficam em tabela própria (ver 02_regras_de_consumo.md topo):
--     FitaM   = IF(Linha='Primer', 4.4, ((L/100)+0.03)*2 + (A+0.03)*2)
--     AreaRec = ((L/100)+0.03)*(A*1.005)*2
-- Executar depois de supabase_custeio_motor.sql e supabase_custeio_motor_seed_parametros.sql
-- =============================================================================

TRUNCATE TABLE custeio_regras_consumo CASCADE;
TRUNCATE TABLE custeio_overhead_excecoes CASCADE;
TRUNCATE TABLE custeio_consolidacao_excecoes CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PORTA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_regras_consumo (componente, categoria, item, ordem, condicao, tipo_valor, formula, valor_fixo, unidade, observacao) VALUES
-- 1.1 MDF
('porta', 'MDF', '30 mm', 1, '', 'formula',
 'e*(A*1.095)*0.035*2 + e*((L+5)/100)*0.03*4 + IF(Ench != ''Sólido'', 0.035*0.25*e*4, 0)', NULL, 'm3',
 'Quadro/montantes. 3º termo (travessas) só existe se Ench != Sólido.'),
('porta', 'MDF', '6 comum (2 qualidade)', 1, 'Ench = ''6''', 'formula',
 'IF(Modelo=''SOFISTICATO'', 0.0399, 0.0299)*((L/100)*1.095)*0.003*69', NULL, 'm3', ''),
('porta', 'MDF', '15 mm', 1, 'Modelo = ''ESSENZIALE''', 'formula',
 '((L/100)+0.03)*(A*1.033)*0.003*2', NULL, 'm3',
 'Lê a mesma coluna de ficha que "9 mm" e "3 comum (1 qualidade)" — só preenchida no modelo ESSENZIALE.'),
('porta', 'MDF', '9 mm', 1, 'Modelo = ''ESSENZIALE''', 'formula',
 '((L/100)+0.03)*(A*1.033)*0.003*2', NULL, 'm3',
 'Mesma coluna de ficha que "15 mm" e "3 comum (1 qualidade)".'),
('porta', 'MDF', '3 comum (1 qualidade)', 1, 'Modelo = ''ESSENZIALE''', 'formula',
 '((L/100)+0.03)*(A*1.033)*0.003*2', NULL, 'm3',
 'Mesma coluna de ficha que "15 mm" e "9 mm".'),
('porta', 'MDF', '3 comum (2 qualidade)', 1, 'Ench = ''3''', 'formula',
 'IF(Modelo=''SOFISTICATO'', 0.0399, 0.0299)*((L/100)*1.095)*0.003*69', NULL, 'm3', ''),
('porta', 'MDF', 'Colméia {L}', 1, 'Ench = ''Colméia''', 'fixo', NULL, 1, 'un',
 'Preço da "Colméia {L}" na aba Preços, R$/un por largura.'),
('porta', 'MDF', '3 RUC GUARARAPES', 1,
 '(Modelo = ''INNOVAZIONE'' AND Ench = ''Colméia'') OR (Modelo = ''ESSENZIALE'' AND Ench = ''3'' AND (L = 20 OR L = 40))',
 'formula', '(2.274*0.035*0.003*2.5)+(2.274*0.105*0.003*2.5)', NULL, 'm3',
 'Caso especial de valor fixo — checar ANTES das outras condições deste item (ordem 1). Preço lido é o de "3 RUC GUARARAPES" (camada nunca sai como "3 RU Berneck").'),
('porta', 'MDF', '3 RUC GUARARAPES', 2, 'Modelo = ''ESSENZIALE''', 'formula',
 '0.0299*((L/1.033)/100)*0.003*6', NULL, 'm3', 'Só bordas.'),
('porta', 'MDF', '3 RUC GUARARAPES', 3, '(Modelo = ''INNOVAZIONE'' AND Ench != ''Colméia'') OR Modelo = ''SOFISTICATO''', 'formula',
 '0.0299*((L/1.033)/100)*0.003*6 + ((L/100)+0.03)*(A*1.05)*0.003*2', NULL, 'm3', 'Bordas + capas.'),
('porta', 'MDF', 'Bondoor', 1, 'Ench = ''Sólido''', 'formula',
 'IF(Modelo=''SOFISTICATO'', (L/100)-0.04, (L/100)-0.03) * A * e', NULL, 'm3', ''),

-- 1.2 Recobrimento (só quando Acabamento = Recoberta, i.e. sem pintura)
('porta', 'Recobrimento', '{Recobrimento}', 1, 'Acabamento = ''Recoberta''', 'lookup', NULL, NULL, 'm2',
 'Quantidade = AreaRec. lookup_tabela/chave abaixo.'),

-- 1.3 Fita de Borda (item derivado do recobrimento via mapa_recobrimento)
('porta', 'Fita de Borda', '{FitaBorda}', 1, '', 'formula', 'FitaM', NULL, 'm',
 'Cor via custeio_param_mapa_recobrimento.fita_de_borda; FitaM = 4.4 fixo se Linha=Primer.'),

-- 1.4 Cola
('porta', 'Cola', 'LIQ. ANTI-ADERENTE', 1, '', 'formula', 'FitaM * (40/145000) / 2', NULL, 'L', ''),
('porta', 'Cola', 'C-518HA', 1, 'Acabamento = ''Recoberta''', 'formula', '30 * AreaRec / 1000', NULL, 'kg',
 'Zerada quando Pintada.'),
('porta', 'Cola', 'CATALIZADOR', 1, '', 'formula', '3.14 * AreaRec / 1000', NULL, 'L', ''),
('porta', 'Cola', 'FARINHA DE TRIGO', 1, '', 'formula', '17.6 * AreaRec / 1000', NULL, 'kg', ''),
('porta', 'Cola', 'RESINA COLA BRANCA UF 108', 1, '', 'formula', '125.5 * AreaRec / 1000', NULL, 'kg', ''),
('porta', 'Cola', 'PUR 707.6.0008 (BLOCO 2KG)', 1, '', 'formula', '0.13 * FitaM * 0.044', NULL, 'kg', ''),

-- 1.5 Pintura (só quando há Pintura selecionada)
('porta', 'Pintura', '{ItemPintura}', 1, 'Acabamento = ''Pintada''', 'lookup', NULL, NULL, 'kg',
 'Quantidade = gramatura(g/m²) * AreaRec / 1000. Gramatura via custeio_param_pintura_gramaturas, tabela = IF(Linha=''Primer'', ''Linha Primer'', ''Linha Principal'').'),

-- 1.6 Embalagem (quantidades fixas — custeio_param_embalagem, componente=Porta)
('porta', 'Embalagem', 'FILME STRECH 10Kg', 1, 'Linha != ''Primer''', 'lookup', NULL, NULL, 'g', 'Zerado se Primer.'),
('porta', 'Embalagem', 'CANTONEIRA PAPEL 5x5', 1, '', 'lookup', NULL, NULL, 'cm', ''),
('porta', 'Embalagem', 'FILME IMP ARTENS', 1, '', 'lookup', NULL, NULL, 'g', ''),
('porta', 'Embalagem', 'CANTONEIRA PLÁSTICA', 1, '', 'lookup', NULL, NULL, 'un', ''),
('porta', 'Embalagem', 'CAIXA ELO {L}', 1, 'Linha = ''Primer''', 'fixo', NULL, 1, 'un', ''),

-- 1.7 Pallet (só se Pallet = Sim; lookup por chave L&Material)
('porta', 'Pallet', 'Madeira', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'm3', 'custeio_param_pallet_porta, chave = L||''Madeira''.'),
('porta', 'Pallet', 'GRAMPO 14/50', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'un', 'custeio_param_pallet_porta, chave = L||''GRAMPO 14/50''.'),
('porta', 'Pallet', 'MDF 2, 15mm', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'm3', 'custeio_param_pallet_porta, chave = L||''MDF 2, 15mm''.');

-- Preenche lookup_tabela/lookup_chave/lookup_coluna das linhas 'lookup' da Porta
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_mapa_recobrimento', lookup_chave='Recobrimento', lookup_coluna='recobrimento(AreaRec)'
  WHERE componente='porta' AND categoria='Recobrimento';
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_pintura_gramaturas', lookup_chave='Linha||Pintura', lookup_coluna='item,gramatura_g_m2'
  WHERE componente='porta' AND categoria='Pintura';
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_embalagem', lookup_chave='''Porta''||item', lookup_coluna='quantidade'
  WHERE componente='porta' AND categoria='Embalagem' AND tipo_valor='lookup';
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_pallet_porta', lookup_coluna='volume_madeira_m3 ou quantidade_por_folha'
  WHERE componente='porta' AND categoria='Pallet';
UPDATE custeio_regras_consumo SET lookup_chave='L||''Madeira''' WHERE componente='porta' AND categoria='Pallet' AND item='Madeira';
UPDATE custeio_regras_consumo SET lookup_chave='L||''GRAMPO 14/50''' WHERE componente='porta' AND categoria='Pallet' AND item='GRAMPO 14/50';
UPDATE custeio_regras_consumo SET lookup_chave='L||''MDF 2, 15mm''' WHERE componente='porta' AND categoria='Pallet' AND item='MDF 2, 15mm';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. BATENTE
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_regras_consumo (componente, categoria, item, ordem, condicao, tipo_valor, formula, unidade, observacao) VALUES
('batente', 'MDF', '30 mm', 1, '', 'formula', '(A*1.1) * ((LB+0.6)/100) * 0.03 * 2.5', 'm3',
 '2,5 = jogo de 2 laterais + travessa (coeficiente da célula). Chave de preço/ficha = LB&A.'),
('batente', 'Recobrimento', '{Recobrimento}', 1, '', 'lookup', NULL, 'm2',
 'Quantidade = ((LB/100)+0.03)*(A+0.03)*2.5. ATENÇÃO: a lista de recobrimentos do batente não tem opção "BRANCO" — se selecionado, resulta 0.'),
('batente', 'Borracha', '{Borracha}', 1, '', 'formula', '((L/100)+0.03) + A*2', 'm',
 'Usa a largura da PORTA (L), não a do batente. Cor via mapa_recobrimento.'),
('batente', 'Cola', 'PUR 702.8.0022 - 20KG', 1, '', 'formula',
 'IF(Tipo=''PET'', 0.075, 0.05) * ((A*1.1)*((LB+0.6)/100)*2.5)', 'kg', ''),
('batente', 'Embalagem', 'CAIXA ELO BAT/ALI', 1, 'Linha = ''Primer''', 'fixo', NULL, 'un', '0,5 un — via valor_fixo.');

UPDATE custeio_regras_consumo SET valor_fixo=0.5, tipo_valor='fixo', formula=NULL WHERE componente='batente' AND item='CAIXA ELO BAT/ALI';
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_mapa_recobrimento', lookup_chave='Recobrimento', lookup_coluna='recobrimento(area)'
  WHERE componente='batente' AND categoria='Recobrimento';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ALIZAR (custo por jogo; chaves usam Esp e Perfil — ver custeio_param_alizar_perfis)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_regras_consumo (componente, categoria, item, ordem, condicao, tipo_valor, formula, unidade, observacao) VALUES
('alizar', 'MDF', '9 mm', 1, 'Perfil = ''7x3,5''', 'formula', '2.274*0.075*0.009*2.5*2', 'm3',
 'Fórmula fixa exclusiva do perfil 7x3,5 — checar ANTES da regra genérica (ordem 1 vs 2).'),
('alizar', 'MDF', '9 mm', 2, 'Esp = 9', 'formula',
 '(A*1.1)*((Vista*1.05)/100)*(Esp/1000)*2*2 + ((L/100)*1.1)*((Reg*1.05)/100)*(Esp/1000)', 'm3',
 'Vista/Reg via custeio_param_alizar_perfis pelo perfil selecionado.'),
('alizar', 'MDF', '15 mm', 1, 'Esp = 15', 'formula',
 '(A*1.1)*((Vista*1.05)/100)*(Esp/1000)*2*2 + ((L/100)*1.1)*((Reg*1.05)/100)*(Esp/1000)', 'm3', ''),
('alizar', 'MDF', '3 RUC GUARARAPES', 1, 'Perfil = ''5x10.3''', 'formula',
 '(0.165*0.003*2.23*2.5)+(0.07*0.003*2.23*2.5)', 'm3', 'Fórmula fixa exclusiva do perfil 5x10.3.'),
('alizar', 'MDF', '3 RUC GUARARAPES', 2, 'Perfil = ''7x3,5''', 'formula',
 '(2.274*0.035*0.003*2.5)+(2.274*0.105*0.003*2.5)', 'm3', 'Fórmula fixa exclusiva do perfil 7x3,5.'),
('alizar', 'MDF', '3 RUC GUARARAPES', 3, '', 'formula',
 '(A*1.1)*0.035*0.003*2 + (A*1.1)*CoefXBerneck*0.003*2 + ((L/100)*1.1)*0.035*0.003*2 + ((L/100)*1.1)*CoefXBerneck*0.003*2',
 'm3', 'Chamado "MDF 3 Berneck" na ficha, mas precificado como "3 RUC GUARARAPES". CoefXBerneck via custeio_param_alizar_perfis. Regra genérica — só se aplica quando os perfis com fórmula fixa (ordem 1-2) não bateram.'),
('alizar', 'Recobrimento', '{Recobrimento}', 1, '', 'lookup', NULL, 'm2',
 'Área = (A+0.13)*((Vista+Reg+Esp/10+1.5)/100)*2 + (A+0.13)*((Vista+Esp/10+2+1.5)/100)*2 + ((L/100)+0.13)*((Vista+Reg+Esp/10+1.5)/100) + ((L/100)+0.13)*((Vista+Esp/10+2+1.5)/100) + IF(Perfil=''7x9Plus'', ((L/100)+0.13)*0.03*2, 0).'),
('alizar', 'Cola', 'JOWAT 605.62 PUR - 2 KG', 1, '', 'formula',
 '0.195 * ( (A*1.05)*(Esp/1000)*2*2 + ((L/100)*1.05)*(Esp/1000) )', 'kg', ''),
('alizar', 'Cola', 'PUR 702.8.0667 - 190KG', 1, '(Perfil = ''7x8,5'' OR Perfil = ''4x5,5'' OR Perfil = ''3x5,5'') AND Tipo = ''PET''', 'formula',
 '0.085 * AreaRecAlizar', 'kg', 'Excecão de taxa PET pra esses 3 perfis (0,085 em vez de 0,075).'),
('alizar', 'Cola', 'PUR 702.8.0667 - 190KG', 2, '', 'formula',
 'IF(Tipo=''PET'', 0.075, 0.05) * AreaRecAlizar', 'kg', 'AreaRecAlizar = mesma área calculada em Recobrimento.'),
('alizar', 'Embalagem', 'FILME STRECH 10Kg', 1, 'Linha != ''Primer''', 'lookup', NULL, 'g', ''),
('alizar', 'Embalagem', 'FILME STRECH (ALIZAR)', 1, '', 'formula', '56', 'g',
 'Preço efetivo é a METADE do catálogo (fórmula original divide o preço por 2, não a quantidade) — tratar no motor: custo = 56 * preco_unitario / 2.'),
('alizar', 'Embalagem', 'CAIXA ELO BAT/ALI', 1, '', 'fixo', NULL, 'un', '0,5 un (valor_fixo).'),
('alizar', 'Embalagem', 'TABULEIRO ALIZAR', 1, '', 'fixo', NULL, 'un', '1 un (valor_fixo).');

UPDATE custeio_regras_consumo SET valor_fixo=0.5 WHERE componente='alizar' AND item='CAIXA ELO BAT/ALI';
UPDATE custeio_regras_consumo SET valor_fixo=1 WHERE componente='alizar' AND item='TABULEIRO ALIZAR';
UPDATE custeio_regras_consumo SET tipo_valor='fixo', formula=NULL WHERE componente='alizar' AND item IN ('CAIXA ELO BAT/ALI', 'TABULEIRO ALIZAR');
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_mapa_recobrimento', lookup_chave='Recobrimento', lookup_coluna='recobrimento(area_alizar)'
  WHERE componente='alizar' AND categoria='Recobrimento';
UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_embalagem', lookup_chave='''Alizar''||item', lookup_coluna='quantidade'
  WHERE componente='alizar' AND item = 'FILME STRECH 10Kg';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. KIT
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_regras_consumo (componente, categoria, item, ordem, condicao, tipo_valor, formula, valor_fixo, unidade, observacao) VALUES
('kit', 'MDF', '9 mm', 1, 'TipoTrava = ''MDF''', 'formula', '((L+5)/100)*0.05*0.009*6', NULL, 'm3', 'Trava do kit.'),
('kit', 'MDF', '3 RUC GUARARAPES', 1, 'TipoTrava = ''MDF''', 'formula', '0.0031*0.051*0.051*8', NULL, 'm3',
 'Fixo — camada "3 Berneck" da trava, precificada como 3 RUC.'),
('kit', 'MDF', 'Madeira de Eucalipto', 1, 'TipoTrava = ''Eucalipto''', 'formula',
 '(0.05*0.012*((L/100)+0.04)) + (0.025*0.012*((L/100)+0.04))', NULL, 'm3', 'Trava do kit em madeira.'),
('kit', 'MDF', '3 RUC GUARARAPES', 2, 'TipoTrava = ''Eucalipto''', 'formula', '0.0031*0.051*0.051*8', NULL, 'm3',
 'Mesmo termo fixo de Berneck/3 RUC, independente do material da trava.'),
('kit', 'Ferragem', '{Fechadura}', 1, '', 'fixo', NULL, 1, 'un', ''),
('kit', 'Ferragem', '{Dobradica}', 1, '', 'fixo', NULL, 3, 'un', ''),
('kit', 'Ferragem', 'Parafuso 3,5x19', 1, '', 'fixo', NULL, 20, 'un', ''),
('kit', 'Ferragem', 'Parafuso 2,9x16', 1, '', 'fixo', NULL, 2, 'un', ''),
('kit', 'Ferragem', 'Parafuso 4x45', 1, '', 'fixo', NULL, 6, 'un', ''),
('kit', 'Ferragem', 'Parafuso 4,2x19', 1, '', 'fixo', NULL, 24, 'un', ''),
('kit', 'Embalagem', 'FILME STRECH 10Kg', 1, 'Linha != ''Primer''', 'fixo', NULL, 798, 'g', 'Faltava na primeira transcrição — item distinto de "FILME STRECH KIT", confirmado no exemplo validado.'),
('kit', 'Embalagem', 'FILME STRECH KIT', 1, '', 'fixo', NULL, 240, 'g', ''),
('kit', 'Embalagem', 'CANTONEIRA PAPEL 5x5', 1, '', 'fixo', NULL, 78, 'cm', ''),
('kit', 'Embalagem', 'FITA CYCLOP', 1, '', 'fixo', NULL, 2.625, 'm', '=21/8.'),
('kit', 'Embalagem', 'TABULEIRO ARTENS 30cm', 1, '', 'fixo', NULL, 2, 'un', ''),
('kit', 'Embalagem', 'CANTONEIRA PLÁSTICA', 1, '', 'fixo', NULL, 2, 'un', ''),
('kit', 'Pallet', 'Madeira', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'm3',
 'Soma parcela do batente (pallet_kit, chave ''Batente''||LB||Material, /12 kits) + parcela da porta (chave ''Porta''||L||Material, /8 kits).'),
('kit', 'Pallet', 'GRAMPO 14/50', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'un', 'Idem, item GRAMPO 14/50.'),
('kit', 'Pallet', 'MDF 2, 15mm', 1, 'Pallet = ''Sim''', 'lookup', NULL, NULL, 'm3', 'Idem, item MDF 2, 15mm.');

UPDATE custeio_regras_consumo SET lookup_tabela='custeio_param_pallet_kit', lookup_coluna='volume_madeira_m3+quantidade_por_unidade (somar Batente e Porta)'
  WHERE componente='kit' AND categoria='Pallet';
UPDATE custeio_regras_consumo SET lookup_chave='''Batente''||LB||item || '' + '' || ''Porta''||L||item' WHERE componente='kit' AND categoria='Pallet';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CUSTOS GERAIS (overhead) — gross-up, não percentual direto.
--    Custo_overhead = (CustoDireto × C_total)/(1 − C_total), C_total = soma
--    dos %efetivo por categoria; %efetivo = %categoria × fator_componente
--    (exceto exceções abaixo). Se A > 2,1: base = CustoDireto + 200 (só Porta).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_overhead_excecoes (componente, categoria, tipo_excecao, condicao, valor, observacao) VALUES
-- Porta: Energia, Impostos e Comissões (Gerais/Representantes) entram SEM fator de rateio
('porta', 'ENERGIA ELÉTRICA', 'sem_fator', '', NULL, ''),
('porta', 'IMPOSTOS', 'sem_fator', '', NULL, ''),
('porta', 'COMISSÃO GERAIS', 'sem_fator', '', NULL, ''),
('porta', 'COMISSÃO REPRESENTANTES', 'sem_fator', '', NULL, ''),
-- Porta: M.O. exibida ×4 se Fora do Padrão (só na linha de exibição, não recalcula o gross-up)
('porta', 'M.O.', 'multiplicador_fora_padrao', 'Padrao = ''Fora do Padrão''', 4, ''),
-- Batente/Alizar: energia É escalada (diferente da Porta); Impostos/Comissões sem fator; ×0,4 adicional se Primer; M.O. ×3 se fora do padrão
('batente', 'IMPOSTOS', 'sem_fator', '', NULL, ''),
('batente', 'COMISSÃO GERAIS', 'sem_fator', '', NULL, ''),
('batente', 'COMISSÃO REPRESENTANTES', 'sem_fator', '', NULL, ''),
('batente', 'TODAS', 'multiplicador_condicional', 'Linha = ''Primer''', 0.4, 'Aplicado por cima do fator normal, exceto Energia/Impostos/Comissões.'),
('batente', 'M.O.', 'multiplicador_fora_padrao', 'Padrao = ''Fora do Padrão''', 3, ''),
('alizar', 'IMPOSTOS', 'sem_fator', '', NULL, ''),
('alizar', 'COMISSÃO GERAIS', 'sem_fator', '', NULL, ''),
('alizar', 'COMISSÃO REPRESENTANTES', 'sem_fator', '', NULL, ''),
('alizar', 'TODAS', 'multiplicador_condicional', 'Linha = ''Primer''', 0.4, ''),
('alizar', 'M.O.', 'multiplicador_fora_padrao', 'Padrao = ''Fora do Padrão''', 3, ''),
-- Kit: Impostos e Comissões são ZERADOS (não só sem fator); energia sem fator; fator base depende de Montagem; M.O. ×3 se fora do padrão
('kit', 'ENERGIA ELÉTRICA', 'sem_fator', '', NULL, ''),
('kit', 'IMPOSTOS', 'zerado', '', NULL, ''),
('kit', 'COMISSÃO GERAIS', 'zerado', '', NULL, ''),
('kit', 'COMISSÃO REPRESENTANTES', 'zerado', '', NULL, ''),
('kit', 'M.O.', 'multiplicador_fora_padrao', 'Padrao = ''Fora do Padrão''', 3, '');

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. EXCEÇÕES DO CONSOLIDADOR — as 3 divergências entre o total consolidado e
--    a soma dos 4 componentes (510,33 vs 544,72 na config exemplo do LEIA-ME).
--    `ativo=true` = comportamento hoje replicado pelo consolidador da planilha;
--    desligar aqui faz o sistema reportar a soma pura dos componentes.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO custeio_consolidacao_excecoes (descricao, componente_origem, item, condicao, efeito, valor_ajuste, fonte, ativo) VALUES
('Camada "3 RUC GUARARAPES" da Porta é zerada no total do Kit quando Enchimento é Sólido, mas continua somada no custo individual da Porta.',
 'porta', '3 RUC GUARARAPES', 'Ench = ''Sólido''', 'excluir', NULL,
 'Descriminação de Custo!E41 = SE(C18="sólido";0;…)', true),
('Item "CAIXA ELO BAT/ALI" do Alizar só entra no total do Kit quando Linha=Primer, mas no custo individual do Alizar entra sempre.',
 'alizar', 'CAIXA ELO BAT/ALI', 'Linha != ''Primer''', 'excluir', NULL,
 'Consolidador: condição SE(Linha="Primer";...;0) presente só no total, ausente em Custo_Alizar.', true),
('Linha "CANTONEIRA PAPEL 5x5" do consolidador exclui manualmente a parcela da Porta do total (fórmula editada à mão).',
 'porta', 'CANTONEIRA PAPEL 5x5', '', 'excluir', NULL,
 'Descriminação de Custo!D124 = SOMA(E124:H124)−E124 (editado à mão).', true);

-- ─── Verificação ────────────────────────────────────────────────────────────
-- SELECT componente, categoria, count(*) FROM custeio_regras_consumo GROUP BY 1,2 ORDER BY 1,2;
-- SELECT * FROM custeio_overhead_excecoes ORDER BY componente, categoria;
-- SELECT * FROM custeio_consolidacao_excecoes;
