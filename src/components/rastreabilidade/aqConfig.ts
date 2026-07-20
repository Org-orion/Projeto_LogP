// ═══════════════════════════════════════════════════════════════════════════════
// Configuração das AQs (Anexo de Qualidade) — camada editável.
//
// Fonte: especificação de rastreabilidade CONCREM Portas Premium (AQ por AQ,
// "Lotes de origem" tirados literalmente das fichas físicas). Regras de
// domínio importantes:
//
// 1. "Lotes de origem" (AQ_RECEBE_DE) é o dado PRIMÁRIO — é o que está escrito
//    na ficha física de cada AQ de processo. "Emite para" NUNCA é um campo de
//    formulário: é sempre derivado invertendo AQ_RECEBE_DE (ver aqGraph.ts).
// 2. Nunca inventar conexão: se uma AQ não está listada como origem de
//    nenhuma outra, ela genuinamente não tem lote de origem cadastrado aqui.
// 3. AQ040 (Esquadrejadeira) é citada por AQ020 como origem, mas NÃO tem
//    entrada própria em AQ_STAGE_MAP — não está oficialmente cadastrada no
//    fluxo, apesar de existir uma coluna real no banco para ela
//    (esquadrejadeira_aq040, ver AQ_COLUMN_MAP). Isso é intencional: é o
//    caso real de "origem inexistente" que aqGraph.ts precisa sinalizar
//    explicitamente ao usuário, nunca falhar silenciosamente.
// 4. AQ003 (Pintura do Friso) não é citada como origem por nenhuma outra AQ —
//    "sem destino registrado" é o resultado correto ao rastrear pra frente a
//    partir dela, não um erro.
// 5. AQ015 → AQ016 → AQ017 → AQ015 é um ciclo real (confirmado com a
//    especificação, não é erro de transcrição) — qualquer travessia
//    recursiva do grafo precisa de proteção contra ciclo (ver aqGraph.ts).
// 6. Códigos "RQ0XX" (RQ007, RQ011, RQ015, RQ024, RQ025, RQ033, RQ038) citados
//    nas fichas NÃO são AQs e nunca devem virar nó/aresta aqui.
// 7. AQ037-1 (Registro de Não Conformidade) fica fora do fluxo de lotes por
//    completo — não tem entrada nem em AQ_STAGE_MAP nem em AQ_RECEBE_DE.
// ═══════════════════════════════════════════════════════════════════════════════

export type SubprocessoKey = "materia_prima" | "porta" | "quadro" | "perfis" | "acabamento" | "expedicao";

export interface FlowStep {
  aq: string;
  nome: string;
  subprocesso: SubprocessoKey;
}

/**
 * Mapeamento coluna do banco → código AQ.
 * Fonte: schema real do banco (171 colunas verificadas).
 * Usado para identificar o AQ de um registro com ALTA precisão,
 * verificando qual coluna AQ-específica tem valor não-nulo.
 *
 * Nota: `esquadrejadeira_aq040` é uma coluna real (existe dado gravado no
 * banco pra ela) mesmo AQ040 não estando cadastrada em AQ_STAGE_MAP/fluxo —
 * ver o comentário no topo do arquivo. Detecção de registro (detectAQ) e
 * registro oficial do fluxo (AQ_STAGE_MAP) são coisas distintas.
 */
export const AQ_COLUMN_MAP: Record<string, string> = {
  recebimento_chapa_aq001:         "AQ001",
  recebimento_chapa_aq01:          "AQ001",
  recebimento_materiais_aq002:     "AQ002",
  recebimento_ferragens_aq005:     "AQ005",
  seccionadora_aq009:              "AQ009",
  multi_serra_perfil_aq010:        "AQ010",
  multi_serra_aba_aq010:           "AQ010",
  multi_serra_regua_aq010:         "AQ010",
  plaina_moldureira_batente_aq011: "AQ011",
  coladeira_alizar_aq012:          "AQ012",
  coladeira_alizar_aq0012:         "AQ012",
  destopadeira_sarrafo_aq015:      "AQ015",
  montagem_quadro_aq016:           "AQ016",
  mesa_montagem_aq016:             "AQ016",
  prensa_fria_aq017:               "AQ017",
  linha_pintura_portas_aq018:      "AQ018",
  pintura_porta_aq018:             "AQ018",
  recobrimento_aq019:              "AQ019",
  colagem_borda_aq020:             "AQ020",
  linha_pintura_aq021:             "AQ021",
  usinagem_friso_aq022:            "AQ022",
  usinagem_portas_aq023:           "AQ023",
  furacao_corte_portas_aq023:      "AQ023",
  embalagem_portas_aq024:          "AQ024",
  recobrimento_perfil_aq025:       "AQ025",
  furacao_corte_batentes_aq027:    "AQ027",
  furacao_batentes_aq027:          "AQ027",
  embalagem_perfil_aq028:          "AQ028",
  montagem_kit_aq029:              "AQ029",
  montadora_grade_aq039:           "AQ039",
  esquadrejadeira_aq040:           "AQ040",
  lixamento_aq041:                 "AQ041",
  seccionadora_canal_aq042:        "AQ042",
  plaina_moldureira_rodape_aq043:  "AQ043",
  recebimento_insumos_aq044:       "AQ044",
};

// Mapeamento reverso: AQ code → colunas do banco que armazenam esse número
export const AQ_CODE_TO_COLUMNS: Record<string, string[]> = Object.entries(AQ_COLUMN_MAP).reduce(
  (acc, [col, aqCode]) => { (acc[aqCode] ??= []).push(col); return acc; },
  {} as Record<string, string[]>
);

/**
 * Colunas de AQ cujo tipo real no banco é numérico (`real`/`numeric`), não
 * texto — confirmado via schema real do Supabase. `ILIKE` (busca por
 * substring, usada em todo o resto do módulo) quebra nelas com erro de
 * operador do Postgres ("operator does not exist: real ~~* unknown"), o que
 * faz a busca inteira falhar silenciosamente sempre que uma dessas colunas
 * entra na cláusula OR. Buscas nelas precisam usar correspondência numérica
 * exata (ver `clausulaColunaAQ` em aqSearch.ts), não substring.
 */
export const AQ_COLUMNS_NUMERICAS = new Set<string>([
  "recebimento_chapa_aq01",
  "multi_serra_aba_aq010",
  "multi_serra_regua_aq010",
  "coladeira_alizar_aq0012",
  "mesa_montagem_aq016",
  "pintura_porta_aq018",
  "furacao_corte_portas_aq023",
  "furacao_batentes_aq027",
]);

/**
 * "ITEM / Nº DOS LOTES DE ORIGEM" (ou "ITEM ANTERIOR") de cada AQ de processo —
 * é o dado PRIMÁRIO/autoritativo (o que está escrito na ficha física).
 * AQ_EMITS_TO é sempre derivado invertendo este mapa (aqGraph.ts), nunca o
 * contrário. AQs de origem (recebimento) têm lista vazia — não têm tabela de
 * lotes de origem, só fornecedor externo.
 *
 * AQ020 cita "AQ040" como origem — mantido aqui literalmente (é o que está na
 * ficha), mesmo AQ040 não tendo entrada em AQ_STAGE_MAP. aqGraph.ts detecta e
 * sinaliza esse caso como "origem inexistente", nunca omite o elo.
 */
export const AQ_RECEBE_DE: Record<string, string[]> = {
  // Bloco 1 — Origem (recebimento externo, sem tabela de lotes de origem)
  AQ001: [],
  AQ002: [],
  AQ005: [],
  AQ044: [],

  // Bloco 2 — Corte e Perfil
  AQ009: ["AQ001", "AQ002"],
  AQ010: ["AQ009", "AQ017"],
  AQ011: ["AQ010"],
  AQ012: ["AQ044", "AQ010"],
  AQ043: ["AQ010"],

  // Bloco 3 — Núcleo e Prensagem (contém o ciclo AQ015 → AQ016 → AQ017 → AQ015)
  AQ042: ["AQ015"],
  AQ015: ["AQ009", "AQ017"],
  AQ039: ["AQ042", "AQ015"],
  AQ016: ["AQ042", "AQ002", "AQ015", "AQ039"],
  AQ017: ["AQ009", "AQ021", "AQ019", "AQ039", "AQ016", "AQ044"],

  // Bloco 4 — Acabamento da Porta
  AQ019: ["AQ009", "AQ044", "AQ002", "AQ041"],
  AQ041: ["AQ015", "AQ009"],
  AQ021: ["AQ009", "AQ041", "AQ044"],
  AQ020: ["AQ040", "AQ019", "AQ044", "AQ002"], // AQ040: origem citada, não cadastrada (ver comentário acima)
  AQ022: ["AQ020"],
  AQ003: ["AQ022"],
  AQ023: ["AQ020", "AQ022", "AQ005"],
  AQ018: ["AQ044", "AQ020", "AQ023", "AQ022"],
  AQ024: ["AQ020", "AQ022", "AQ023", "AQ002", "AQ018"],

  // Bloco 5 — Revestimento do Perfil
  AQ025: ["AQ002", "AQ044", "AQ010", "AQ012", "AQ043", "AQ011"],
  AQ026: ["AQ002", "AQ044", "AQ010", "AQ012", "AQ043", "AQ011"],
  AQ027: ["AQ025", "AQ026"],
  AQ028: ["AQ002", "AQ025", "AQ026", "AQ027"],

  // Bloco 6 — Montagem, Embalagem e Expedição
  AQ029: ["AQ027", "AQ024", "AQ002", "AQ005", "AQ028", "AQ025"],
  AQ030: ["AQ029", "AQ024", "AQ028"],
};

export const AQ_STAGE_MAP: Record<string, { nome: string; subprocesso: SubprocessoKey }> = {
  // Bloco 1 — Origem
  AQ001: { nome: "Recebimento de Chapa",              subprocesso: "materia_prima" },
  AQ002: { nome: "Recebimento de Materiais",          subprocesso: "materia_prima" },
  AQ005: { nome: "Recebimento Ferragens",             subprocesso: "materia_prima" },
  AQ044: { nome: "Recebimento de Insumos",            subprocesso: "materia_prima" },
  // Bloco 2 — Corte e Perfil
  AQ009: { nome: "Seccionadora",                      subprocesso: "perfis" },
  AQ010: { nome: "Multi Serra Perfil",                subprocesso: "perfis" },
  AQ011: { nome: "Plaina Moldureira Batente",         subprocesso: "perfis" },
  AQ012: { nome: "Coladeira de Alizar",               subprocesso: "perfis" },
  AQ043: { nome: "Plaina Moldureira de Rodapé",       subprocesso: "perfis" },
  // Bloco 3 — Núcleo e Prensagem
  AQ042: { nome: "Seccionadora de Canal",             subprocesso: "quadro" },
  AQ015: { nome: "Destopadeira Sarrafo",              subprocesso: "quadro" },
  AQ039: { nome: "Montadora de Grade",                subprocesso: "quadro" },
  AQ016: { nome: "Mesa de Montagem do Quadro da Porta", subprocesso: "quadro" },
  AQ017: { nome: "Prensagem Fria",                    subprocesso: "quadro" },
  // Bloco 4 — Acabamento da Porta
  AQ019: { nome: "Recobrimento de Porta e Tampo",     subprocesso: "porta" },
  AQ041: { nome: "Lixadeira",                         subprocesso: "porta" },
  AQ021: { nome: "Linha de Pintura de Tampo",         subprocesso: "porta" },
  AQ020: { nome: "Colagem da Borda",                  subprocesso: "porta" },
  AQ022: { nome: "Usinagem do Friso",                 subprocesso: "porta" },
  AQ003: { nome: "Pintura do Friso",                  subprocesso: "porta" },
  AQ023: { nome: "Furação e Corte das Portas",        subprocesso: "porta" },
  AQ018: { nome: "Linha de Pintura de Porta",         subprocesso: "porta" },
  AQ024: { nome: "Embalagem das Portas",              subprocesso: "porta" },
  // Bloco 5 — Revestimento do Perfil
  AQ025: { nome: "Recobrimento de Perfil",            subprocesso: "acabamento" },
  AQ026: { nome: "Pintura do Perfil",                 subprocesso: "acabamento" },
  AQ027: { nome: "Furação e Corte dos Batentes",      subprocesso: "acabamento" },
  AQ028: { nome: "Embalagem de Perfil",               subprocesso: "acabamento" },
  // Bloco 6 — Montagem, Embalagem e Expedição
  AQ029: { nome: "Montagem do Kit",                   subprocesso: "expedicao" },
  AQ030: { nome: "Expedição",                         subprocesso: "expedicao" },
  // AQ040 (Esquadrejadeira) — NÃO tem entrada aqui de propósito: é citada
  // como origem por AQ020 mas não está oficialmente cadastrada no fluxo.
};

/**
 * Mapeamento nome da máquina (lowercase parcial) → AQ.
 * Fallback quando as colunas AQ-específicas não têm valor.
 * REGRA: padrões mais específicos DEVEM vir antes dos genéricos.
 * AQ018 = Linha de Pintura de PORTA
 * AQ021 = Linha de Pintura de TAMPO  ← padrão genérico "linha de pintura"
 * AQ019 = Recobrimento de Porta e Tampo
 */
export const MACHINE_TO_AQ: Array<[pattern: string, aq: string]> = [
  // Recebimento — mais específicos primeiro
  ["recebimento de chapa",         "AQ001"],
  ["recebimento chapa",            "AQ001"],
  ["chapa de mdf",                 "AQ001"],
  ["recebimento de materiais",     "AQ002"],
  ["recebimento materiais",        "AQ002"],
  ["recebimento de ferragens",     "AQ005"],
  ["recebimento ferragens",        "AQ005"],
  ["recebimento de insumos",       "AQ044"],
  ["recebimento insumos",          "AQ044"],
  // Quadro
  ["destopadeira sarrafo",         "AQ015"],
  ["destopadeira de quadro",       "AQ015"],
  ["multi serra sarrafo",          "AQ015"],
  ["destopadeira",                 "AQ015"],
  ["seccionadora de canal",        "AQ042"],
  ["seccionadora canal",           "AQ042"],
  ["montadora de grade",           "AQ039"],
  ["mesa de montagem do quadro",   "AQ016"],
  ["mesa de montagem",             "AQ016"],
  ["montagem do quadro",           "AQ016"],
  ["montagem quadro",              "AQ016"],
  // Porta — lixadeira antes de seccionadora (mais específico)
  ["lixadeira",                    "AQ041"],
  ["lixamento",                    "AQ041"],
  ["seccionadora",                 "AQ009"],
  // Revestimento — específicos antes de genérico
  ["recobrimento de porta",        "AQ019"],
  ["recobrimento porta e tampo",   "AQ019"],
  ["recobrimento porta tampo",     "AQ019"],
  ["recobrimento melamínico",      "AQ019"],
  ["recobrimento melaminico",      "AQ019"],
  ["recobrimento",                 "AQ019"],
  // Pintura — "porta" antes de "tampo" antes do genérico
  ["linha de pintura de porta",    "AQ018"],
  ["linha de pintura portas",      "AQ018"],
  ["linha pintura porta",          "AQ018"],
  ["linha de pintura de tampo",    "AQ021"],
  ["linha pintura tampo",          "AQ021"],
  ["linha de pintura",             "AQ021"],  // ← genérico = tampo por padrão
  // Prensagem
  ["prensagem fria",               "AQ017"],
  ["prensa fria",                  "AQ017"],
  // Acabamento
  ["esquadrejadeira",              "AQ040"],
  ["esquadro",                     "AQ040"],
  ["colagem da borda",             "AQ020"],
  ["colagem de borda",             "AQ020"],
  ["usinagem dos frisos",          "AQ022"],
  ["usinagem do friso",            "AQ022"],
  ["usinagem friso",               "AQ022"],
  ["pintura do friso",             "AQ003"],
  ["furação e corte das portas",   "AQ023"],
  ["furação e corte",              "AQ023"],
  ["furacao e corte",              "AQ023"],
  ["usinagem portas",              "AQ023"],
  ["embalagem de kit",             "AQ029"],
  ["embalagem kit",                "AQ029"],
  ["montagem do kit",              "AQ029"],
  ["montagem de kit",              "AQ029"],
  ["montagem kit",                 "AQ029"],
  ["embalagem de portas",          "AQ024"],
  ["embalagem das portas",         "AQ024"],
  ["embalagem portas",             "AQ024"],
  // Revestimento do Perfil
  ["recobrimento de perfil",       "AQ025"],
  ["pintura do perfil",            "AQ026"],
  ["furação e corte dos batentes", "AQ027"],
  ["furacao e corte dos batentes", "AQ027"],
  ["embalagem de perfil",          "AQ028"],
  ["embalagem perfil",             "AQ028"],
  ["embalagem",                    "AQ024"],  // ← genérico = portas por padrão (mais específicos acima)
  // Expedição
  ["expedição",                    "AQ030"],
  ["expedicao",                    "AQ030"],
  // Recebimento genérico (último — mais amplo)
  ["recebimento",                  "AQ001"],
];

// Ordem de leitura do fluxo, por bloco (usada pra agrupar a Timeline e como
// posição vertical no mapa — ver aqLayout.ts). Não representa um caminho
// linear único: há ramificação e convergência reais (ver AQ_RECEBE_DE acima).
export const PROCESS_FLOW_ORDER: FlowStep[] = [
  // Bloco 1 — Origem
  { aq: "AQ001", nome: "Recebimento de Chapa",              subprocesso: "materia_prima" },
  { aq: "AQ002", nome: "Recebimento de Materiais",          subprocesso: "materia_prima" },
  { aq: "AQ005", nome: "Recebimento Ferragens",             subprocesso: "materia_prima" },
  { aq: "AQ044", nome: "Recebimento de Insumos",            subprocesso: "materia_prima" },
  // Bloco 2 — Corte e Perfil
  { aq: "AQ009", nome: "Seccionadora",                      subprocesso: "perfis" },
  { aq: "AQ010", nome: "Multi Serra Perfil",                subprocesso: "perfis" },
  { aq: "AQ011", nome: "Plaina Moldureira Batente",         subprocesso: "perfis" },
  { aq: "AQ012", nome: "Coladeira de Alizar",               subprocesso: "perfis" },
  { aq: "AQ043", nome: "Plaina Moldureira de Rodapé",       subprocesso: "perfis" },
  // Bloco 3 — Núcleo e Prensagem
  { aq: "AQ042", nome: "Seccionadora de Canal",             subprocesso: "quadro" },
  { aq: "AQ015", nome: "Destopadeira Sarrafo",              subprocesso: "quadro" },
  { aq: "AQ039", nome: "Montadora de Grade",                subprocesso: "quadro" },
  { aq: "AQ016", nome: "Mesa de Montagem do Quadro da Porta", subprocesso: "quadro" },
  { aq: "AQ017", nome: "Prensagem Fria",                    subprocesso: "quadro" },
  // Bloco 4 — Acabamento da Porta
  { aq: "AQ019", nome: "Recobrimento de Porta e Tampo",     subprocesso: "porta" },
  { aq: "AQ041", nome: "Lixadeira",                         subprocesso: "porta" },
  { aq: "AQ021", nome: "Linha de Pintura de Tampo",         subprocesso: "porta" },
  { aq: "AQ020", nome: "Colagem da Borda",                  subprocesso: "porta" },
  { aq: "AQ022", nome: "Usinagem do Friso",                 subprocesso: "porta" },
  { aq: "AQ003", nome: "Pintura do Friso",                  subprocesso: "porta" },
  { aq: "AQ023", nome: "Furação e Corte das Portas",        subprocesso: "porta" },
  { aq: "AQ018", nome: "Linha de Pintura de Porta",         subprocesso: "porta" },
  { aq: "AQ024", nome: "Embalagem das Portas",              subprocesso: "porta" },
  // Bloco 5 — Revestimento do Perfil
  { aq: "AQ025", nome: "Recobrimento de Perfil",            subprocesso: "acabamento" },
  { aq: "AQ026", nome: "Pintura do Perfil",                 subprocesso: "acabamento" },
  { aq: "AQ027", nome: "Furação e Corte dos Batentes",      subprocesso: "acabamento" },
  { aq: "AQ028", nome: "Embalagem de Perfil",               subprocesso: "acabamento" },
  // Bloco 6 — Montagem, Embalagem e Expedição
  { aq: "AQ029", nome: "Montagem do Kit",                   subprocesso: "expedicao" },
  { aq: "AQ030", nome: "Expedição",                         subprocesso: "expedicao" },
];
