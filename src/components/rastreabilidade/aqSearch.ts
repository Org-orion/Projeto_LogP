// ═══════════════════════════════════════════════════════════════════════════════
// Lógica de busca/agrupamento de rastreabilidade — extraído do antigo
// RastreabilidadePage.tsx (aba SPA) pra ser reutilizado pela nova página de
// consulta (src/app/rastreabilidade/page.tsx) sem puxar JSX. Nenhuma regra de
// negócio mudou nesta extração — mesmas queries, mesma cascata de busca, mesmo
// agrupamento por lote.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import {
  AQ_COLUMN_MAP, AQ_CODE_TO_COLUMNS, AQ_COLUMNS_NUMERICAS, AQ_STAGE_MAP, AQ_RECEBE_DE, MACHINE_TO_AQ, PROCESS_FLOW_ORDER,
  type FlowStep, type SubprocessoKey,
} from "./aqConfig";
// Só para restringir a busca de destino às AQs que oficialmente podem receber
// da AQ atual (AQ_EMITS_TO é sempre derivado, nunca hardcoded — ver aqGraph.ts).
import { AQ_EMITS_TO } from "./aqGraph";

/**
 * Monta a cláusula de filtro (formato bruto do `.or()` do PostgREST) pra uma
 * coluna de AQ — `ILIKE` (substring) pras colunas de texto, `EQ` (exato) pras
 * numéricas (`AQ_COLUMNS_NUMERICAS`), já que `ILIKE` quebra com erro de
 * operador do Postgres em colunas `real`/`numeric` (confirmado com dado
 * real). Termo não-numérico buscado numa coluna numérica nunca pode casar —
 * usa uma cláusula sempre-falsa (`eq.-1`, lotes nunca são negativos) em vez
 * de omitir a coluna, pra não mudar sutilmente o formato do `.or()`.
 */
function clausulaColunaAQ(col: string, termo: string): string {
  if (!AQ_COLUMNS_NUMERICAS.has(col)) return `${col}.ilike.%${termo}%`;
  // Termo vazio = "qualquer valor preenchido" (usado por buscarLotesPorAQ) —
  // `Number("")` avalia pra 0, não NaN, então precisa de checagem à parte
  // (senão viraria "coluna = 0" em vez de "coluna preenchida").
  if (termo.trim() === "") return `${col}.not.is.null`;
  const num = Number(termo);
  return isNaN(num) ? `${col}.eq.-1` : `${col}.eq.${num}`;
}

/**
 * Divide um valor de coluna de AQ nas peças individuais que ele representa.
 * Confirmado com dado real: a Seccionadora corta várias peças de uma chapa só
 * e grava tudo junto numa string composta (ex.: "41104-41105-41106-41107" ou
 * "41177.41176"), mas quem recebe cada peça registra só o número individual
 * dela (ex.: "41104.0") — buscar pela string composta inteira nunca encontra
 * essas ligações, porque nenhum registro downstream tem a string toda.
 *
 * Cuidado: "41104.0" (um valor `real` do banco formatado como texto) é UM
 * número só, não duas peças — só separa em várias peças quando NÃO é esse
 * padrão de ponto decimal final.
 */
function pecasIndividuais(valor: string): string[] {
  const limpo = valor.trim();
  if (/^\d+\.0$/.test(limpo)) return [limpo.slice(0, -2)];
  const partes = limpo.split(/[-.]+/).filter(Boolean);
  return partes.length > 0 ? partes : [limpo];
}

export interface PecaComposta {
  valor: string;
  /** Peça com menos dígitos que a mais longa do mesmo valor composto —
   * provável erro de digitação (caso real confirmado: "39279.3928", a peça
   * "3928" tem 1 dígito a menos que "39279" e a sequência do mesmo lote no
   * mesmo dia mostra que devia ser "39280"). Nunca buscada automaticamente
   * (ver buscarPorColunaAQ) — o risco de falso-positivo é alto pra um número
   * curto casando como substring em registros não relacionados. */
  suspeita: boolean;
}

/** Divide um valor de coluna de AQ nas peças individuais + marca a(s) mais curta(s) como suspeita. */
export function dividirPecasComSuspeita(valor: string): PecaComposta[] {
  const pecas = pecasIndividuais(valor);
  if (pecas.length <= 1) return pecas.map(v => ({ valor: v, suspeita: false }));
  const maxDigitos = Math.max(...pecas.map(p => p.length));
  return pecas.map(v => ({ valor: v, suspeita: v.length < maxDigitos }));
}

export type StepStatus = "concluido" | "em_andamento" | "pendente" | "ignorado";

export interface FlowStepStatus extends FlowStep {
  status: StepStatus;
  registros: RegistroRastreavel[];
  ultimaMovimentacao?: string;
  alternativo?: boolean;
}

export interface RegistroRastreavel {
  id: number;
  data?: string | null;
  hora_inicial?: string | null;
  hora_final?: string | null;
  maquina?: string | null;
  produto?: string | null;
  cod_produto?: string | null;
  linha?: string | null;
  nucleo?: string | null;
  padrao?: string | null;
  qtd_conforme?: number | null;
  qtd_nao_conforme_1?: number | null;
  n_lote?: number | string | null;
  lote_fornecedor?: string | null;
  fornecedor?: string | null;
  cliente?: string | null;
  nome_cliente?: string | null;
  codigo_rq?: string | null;
  registro?: string | null;
  setor?: string | null;
  observacao?: string | null;
  categoria?: string | null;
  nota_fiscal?: string | number | null;
  [key: string]: unknown;
}

export interface LoteGroup {
  loteId: string;
  records: RegistroRastreavel[];
  currentAQ: string | null;
  currentEtapa: string | null;
  produto: string | null;
  cliente: string | null;
  fornecedor: string | null;
  loteFornecedor: string | null;
  pedido: string | null;
  observacao: string | null;
  totalConf: number;
  primeiraData: string | null;
  ultimaData: string | null;
}

/**
 * Campos de busca em ordem de prioridade.
 * Percorre cada lista até achar uma coluna que existe e retorna resultado.
 */
export const SEARCHABLE_FIELDS = {
  lote:    ["n_lote"],
  op:      ["op", "ordem_producao"],
  pedido:  ["pedido", "numero_pedido"],
  produto: ["produto", "cod_produto"],
  cliente: ["cliente", "nome_cliente"],
  aq:      ["aq", "codigo_aq", "maquina_aq"],
} as const;

/**
 * Campos usados para montar relações entre registros (rastreabilidade).
 *
 * RASTREABILIDADE BIDIRECIONAL:
 *   Origem  → o registro tem lote_fornecedor = X → buscar registros onde n_lote = X
 *   Destinos → buscar registros onde lote_fornecedor = n_lote_atual
 */
export const TRACE_RELATION_FIELDS = {
  /** Campo com o ID do lote pai (origem do material) */
  lotePai:         "lote_fornecedor",
  /** Campo com o ID do lote atual */
  loteId:          "n_lote",
  /** Código de registro de qualidade */
  codigoRQ:        "codigo_rq",
  /** Campos de produto */
  produto:         ["produto", "cod_produto"],
  /** Campos de cliente */
  cliente:         ["cliente", "nome_cliente"],
  /** Fornecedor externo */
  fornecedor:      "fornecedor",
} as const;

/**
 * Detecta o AQ de um registro.
 *
 * Método 1 (preferido): nome da máquina — é o dado inequívoco de qual etapa
 * gerou este registro. Confirmado com dado real que um único registro pode
 * ter VÁRIAS colunas de AQ preenchidas ao mesmo tempo: a coluna da própria
 * etapa (lote gerado) E a(s) coluna(s) de origem consumida(s) — ex.: um
 * registro de Prensagem Fria (maquina="PRENSA FRIA") pode ter tanto
 * `prensa_fria_aq017` (lote gerado) quanto `montagem_quadro_aq016` (lote de
 * origem) preenchidos. Detectar pela PRIMEIRA coluna não-nula (ordem de
 * declaração de AQ_COLUMN_MAP) classificava esse registro incorretamente como
 * AQ016, já que `montagem_quadro_aq016` vem antes de `prensa_fria_aq017` no
 * mapa — daí a máquina não bater com a etapa mostrada.
 * Método 2 (fallback): coluna AQ-específica preenchida — só quando o nome da
 * máquina não bate com nenhum padrão conhecido.
 */
export function detectAQ(record: RegistroRastreavel): string | null {
  const maq = record.maquina?.trim().toLowerCase();
  if (maq) {
    for (const [pattern, aq] of MACHINE_TO_AQ) {
      if (maq.includes(pattern)) return aq;
    }
  }
  for (const [col, aq] of Object.entries(AQ_COLUMN_MAP)) {
    const v = record[col];
    if (v !== null && v !== undefined && v !== "" && v !== false && v !== 0) {
      return aq;
    }
  }
  return null;
}

export function getLoteId(record: RegistroRastreavel): string | null {
  const v = record[TRACE_RELATION_FIELDS.loteId];
  return v !== null && v !== undefined ? String(v) : null;
}

export function getLotePai(record: RegistroRastreavel): string | null {
  const v = record[TRACE_RELATION_FIELDS.lotePai];
  return v && typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function getProduto(record: RegistroRastreavel): string | null {
  return record.produto || record.cod_produto || null;
}

export function getCliente(record: RegistroRastreavel): string | null {
  return record.nome_cliente || record.cliente || null;
}

/** Primeiro valor de pedido encontrado no grupo (coluna `pedido` ou `numero_pedido`, ver SEARCHABLE_FIELDS.pedido). */
function getPedido(records: RegistroRastreavel[]): string | null {
  for (const col of SEARCHABLE_FIELDS.pedido) {
    const rec = records.find(r => r[col] !== null && r[col] !== undefined && r[col] !== "");
    if (rec) return String(rec[col]);
  }
  return null;
}

export function fmtData(d?: string | null): string {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

/**
 * Rótulo legível pro lote — grupos sem `n_lote` usam uma chave sintética
 * "sem_lote:<id>" internamente (ver groupByLote), que nunca deve vazar crua
 * pra tela. Nesses casos, mostra o número da própria coluna de AQ (ex.:
 * "AQ041 · 12224") — importante quando há vários lotes relacionados na
 * mesma tela (senão todos apareceriam como "Sem lote", indistinguíveis).
 */
export function labelDoLote(group: LoteGroup | null, pecaOverride?: string): string {
  if (!group) return "";
  if (!group.loteId.startsWith("sem_lote:")) return group.loteId;
  if (pecaOverride) return `${group.currentAQ} · ${pecaOverride}`;
  const numeroProprio = group.currentAQ
    ? group.records.map(r => getAqLotNumber(r, group.currentAQ!)).find(Boolean)
    : null;
  if (numeroProprio) return `${group.currentAQ} · ${numeroProprio}`;
  return group.produto ? `${group.produto} (sem lote)` : "Sem lote";
}

/**
 * Peças a exibir pra um grupo — 1 elemento na imensa maioria dos casos, mas
 * vira N quando o valor próprio da AQ atual é composto (ver
 * `dividirPecasComSuspeita`), já que cada peça pode seguir por um caminho
 * posterior diferente e merece seu próprio card, não um só representando o
 * registro inteiro. Grupos com `n_lote` real (não `sem_lote:`) nunca são
 * divididos — esse padrão nunca foi observado fora das colunas específicas
 * de AQ.
 */
export function pecasDoGrupo(group: LoteGroup): PecaComposta[] {
  if (!group.loteId.startsWith("sem_lote:")) return [{ valor: labelDoLote(group), suspeita: false }];
  const numeroProprio = group.currentAQ
    ? group.records.map(r => getAqLotNumber(r, group.currentAQ!)).find(Boolean)
    : null;
  if (!numeroProprio) return [{ valor: labelDoLote(group), suspeita: false }];
  return dividirPecasComSuspeita(numeroProprio);
}

export function sortByDateAsc(a: RegistroRastreavel, b: RegistroRastreavel) {
  const da = (a.data ?? "") + (a.hora_inicial ?? "") + (a.hora_final ?? "");
  const db = (b.data ?? "") + (b.hora_inicial ?? "") + (b.hora_final ?? "");
  return da.localeCompare(db);
}

export function sortByDateDesc(a: RegistroRastreavel, b: RegistroRastreavel) {
  return -sortByDateAsc(a, b);
}

/**
 * Agrupa registros por n_lote, retorna lista de LoteGroup.
 *
 * Registros sem `n_lote` (comum — o lote de verdade fica só na coluna
 * específica da AQ, ver aqConfig.ts) NUNCA devem ser agrupados por produto:
 * dois eventos de AQs diferentes (ex.: Lixamento gera lote 12224, Linha de
 * Pintura consome 12224 e gera 12963) podem ter o mesmo produto ("Tampo
 * Comum") sem serem o mesmo lote — agrupar por produto misturava a cadeia de
 * um lote com a de outro. Cada registro sem n_lote vira seu próprio grupo
 * (chave = id único do registro); a cadeia origem/destino é remontada depois,
 * via `buscarOrigensEDestinos` (que já não depende de agrupamento nenhum).
 */
export function groupByLote(records: RegistroRastreavel[]): LoteGroup[] {
  const map: Record<string, RegistroRastreavel[]> = {};
  for (const rec of records) {
    const key = getLoteId(rec) ?? `sem_lote:${rec.id}`;
    (map[key] ??= []).push(rec);
  }

  return Object.entries(map).map(([loteId, recs]): LoteGroup => {
    const sortedAsc  = [...recs].sort(sortByDateAsc);
    const sortedDesc = [...recs].sort(sortByDateDesc);

    // AQ atual = última posição no fluxo oficial com registro (ignora data)
    const aqsPresentes = new Set(recs.map(detectAQ).filter(Boolean) as string[]);
    const currentAQ = PROCESS_FLOW_ORDER
      .slice()
      .reverse()
      .find(s => aqsPresentes.has(s.aq))?.aq ?? null;
    const currentEtapa = currentAQ ? (AQ_STAGE_MAP[currentAQ]?.nome ?? null) : null;

    return {
      loteId,
      records: recs,
      currentAQ,
      currentEtapa,
      produto: getProduto(sortedDesc[0]),
      cliente: getCliente(sortedDesc[0]),
      fornecedor: recs.find(r => r.fornecedor)?.fornecedor ?? null,
      loteFornecedor: recs.find(r => getLotePai(r))?.lote_fornecedor ?? null,
      pedido: getPedido(recs),
      observacao: recs.find(r => r.observacao)?.observacao ?? null,
      totalConf: recs.reduce((s, r) => s + (Number(r.qtd_conforme) || 0), 0),
      primeiraData: sortedAsc[0]?.data ?? null,
      ultimaData: sortedDesc[0]?.data ?? null,
    };
  }).sort((a, b) => (b.ultimaData ?? "").localeCompare(a.ultimaData ?? ""));
}

/**
 * Calcula o status de cada etapa do fluxo para um conjunto de registros.
 *
 * Regras:
 * 1. Posição no PROCESS_FLOW_ORDER define a ordem (não data).
 * 2. A etapa mais avançada com registro = "em_andamento".
 * 3. Etapas antes dela com registro = "concluido".
 * 4. Etapas sem registro = "pendente".
 * 5. AQ029 pode ter múltiplos registros (Montagem + Embalagem Kit):
 *    exibe o nome da máquina para diferenciar.
 */
export function calcularFluxo(records: RegistroRastreavel[]): FlowStepStatus[] {
  const aqsPresentes = new Set<string>();
  const aqRegistros: Record<string, RegistroRastreavel[]> = {};

  for (const rec of records) {
    const aq = detectAQ(rec);
    if (aq) {
      aqsPresentes.add(aq);
      (aqRegistros[aq] ??= []).push(rec);
    }
  }

  let ultimoIdx = -1;
  for (let i = 0; i < PROCESS_FLOW_ORDER.length; i++) {
    if (aqsPresentes.has(PROCESS_FLOW_ORDER[i].aq)) ultimoIdx = i;
  }

  return PROCESS_FLOW_ORDER.map((step, idx) => {
    const regs = [...(aqRegistros[step.aq] ?? [])].sort(sortByDateAsc);
    let status: StepStatus;
    if (!aqsPresentes.has(step.aq))      status = "pendente";
    else if (idx === ultimoIdx)          status = "em_andamento";
    else                                 status = "concluido";

    const ultimo = [...regs].sort(sortByDateDesc)[0];

    let detalhe = "";
    if (step.aq === "AQ029" && regs.length > 1) {
      const maquinas = [...new Set(regs.map(r => r.maquina).filter(Boolean))];
      detalhe = maquinas.join(" / ");
    }

    return {
      ...step,
      ...(detalhe ? { nome: `${step.nome}${detalhe ? ` (${detalhe})` : ""}` } : {}),
      status,
      registros: regs,
      ultimaMovimentacao: ultimo
        ? `${fmtData(ultimo.data)}${ultimo.hora_final ? ` ${String(ultimo.hora_final)}` : ""}`
        : undefined,
    };
  });
}

/**
 * Busca em cascata por termo livre (lote, OP, pedido, produto, cliente,
 * fornecedor, lote pai, ou código/nome de AQ) — mesma cascata de
 * `handleSearch` do RastreabilidadePage.tsx original, sem mudança de regra.
 * Para no primeiro critério que retornar algum resultado.
 */
export async function searchRegistrosPorTermo(termo: string): Promise<RegistroRastreavel[]> {
  const termNum = Number(termo);
  const isNum = !isNaN(termNum) && termo !== "";
  let found: RegistroRastreavel[] = [];

  if (isNum) {
    const { data } = await supabase.from("registros_producao").select("*").eq("n_lote", termNum).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length) {
    for (const col of SEARCHABLE_FIELDS.op) {
      const q = isNum
        ? supabase.from("registros_producao").select("*").eq(col, termNum).limit(500)
        : supabase.from("registros_producao").select("*").ilike(col, `%${termo}%`).limit(500);
      const { data, error } = await q;
      if (!error && data?.length) { found = data; break; }
    }
  }
  if (!found.length) {
    for (const col of SEARCHABLE_FIELDS.pedido) {
      const q = isNum
        ? supabase.from("registros_producao").select("*").eq(col, termNum).limit(500)
        : supabase.from("registros_producao").select("*").ilike(col, `%${termo}%`).limit(500);
      const { data, error } = await q;
      if (!error && data?.length) { found = data; break; }
    }
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*").ilike("produto", `%${termo}%`).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*").ilike("cod_produto", `%${termo}%`).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*")
      .or(`cliente.ilike.%${termo}%,nome_cliente.ilike.%${termo}%`).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*").ilike("fornecedor", `%${termo}%`).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*").ilike("lote_fornecedor", `%${termo}%`).limit(500);
    if (data?.length) found = data;
  }
  if (!found.length && /^AQ\d+$/i.test(termo)) {
    const aqCode = termo.toUpperCase();
    const patterns = MACHINE_TO_AQ.filter(([, aq]) => aq === aqCode).map(([p]) => p);
    for (const p of patterns) {
      const { data } = await supabase.from("registros_producao").select("*").ilike("maquina", `%${p}%`).limit(500);
      if (data?.length) { found = data; break; }
    }
  }
  if (!found.length) {
    const { data } = await supabase.from("registros_producao").select("*").ilike("maquina", `%${termo}%`).limit(500);
    if (data?.length) found = data;
  }

  return found;
}

export interface LoteDetalhe {
  group: LoteGroup;
  origins: LoteGroup[];
  children: LoteGroup[];
}

const EMPTY_GROUP = (loteId: string): LoteGroup => ({
  loteId, records: [], currentAQ: null, currentEtapa: null, produto: null,
  cliente: null, fornecedor: null, loteFornecedor: null, pedido: null, observacao: null,
  totalConf: 0, primeiraData: null, ultimaData: null,
});

/**
 * Busca todos os registros de um lote (dado só o Nº do lote, ex.: clique numa
 * consulta recente) + lotes de origem + lotes filhos — mesma lógica de
 * `openLot` do RastreabilidadePage.tsx original.
 *
 * Nem todo registro tem `n_lote` preenchido — o número que o usuário conhece
 * às vezes é o valor de uma coluna específica de AQ, não o `n_lote` genérico
 * (ver `buscarRegistrosComFiltros`). Por isso, quando não há resultado exato
 * em `n_lote`, cai pro mesmo tipo de busca ampla (n_lote OU qualquer coluna
 * de AQ) usada na busca por filtros.
 */
export async function buscarDetalheLote(loteId: string): Promise<LoteDetalhe> {
  if (loteId.startsWith("sem_lote:")) {
    // Já não tem n_lote de verdade — não há como buscar de novo por ele.
    return { group: EMPTY_GROUP(loteId), origins: [], children: [] };
  }

  let loteDados: RegistroRastreavel[] | null = null;
  const { data: exato } = await supabase
    .from("registros_producao").select("*")
    .eq("n_lote", isNaN(Number(loteId)) ? loteId : Number(loteId))
    .order("data", { ascending: true })
    .limit(500);
  loteDados = exato;

  if (!loteDados?.length) {
    const orParts = [`n_lote.ilike.%${loteId}%`, ...Object.keys(AQ_COLUMN_MAP).map(c => clausulaColunaAQ(c, loteId))];
    const { data: amplo } = await supabase
      .from("registros_producao").select("*")
      .or(orParts.join(","))
      .order("data", { ascending: true })
      .limit(500);
    loteDados = amplo;
  }

  const lotRecs: RegistroRastreavel[] = loteDados ?? [];
  const groups = groupByLote(lotRecs.length > 0 ? lotRecs : [{ id: -1, n_lote: loteId } as RegistroRastreavel]);
  const group = groups[0] ?? EMPTY_GROUP(loteId);

  const { origins, children } = await buscarOrigensEDestinos(group);
  return { group, origins, children };
}

/** Valor do "lote próprio" de uma AQ num registro — a(s) coluna(s) específica(s) dela. */
export function getAqLotNumber(record: RegistroRastreavel, aqCode: string): string | null {
  for (const col of AQ_CODE_TO_COLUMNS[aqCode] ?? []) {
    const v = record[col];
    if (v !== null && v !== undefined && v !== "") return String(v);
  }
  return null;
}

export interface OrigemLote {
  aqCode: string;
  lotNumber: string;
  column: string;
}

/**
 * Lê, num registro, quais colunas de AQs de origem válidas (AQ_RECEBE_DE da
 * AQ atual) estão preenchidas — cada uma é um lote de origem consumido
 * naquela operação. Confirmado com dado real: um registro de AQ021
 * (linha_pintura_aq021) tinha também `lixamento_aq041` preenchido no mesmo
 * registro — é assim que a origem é gravada, não em `lote_fornecedor`
 * (esse existe mas não é confiável sozinho: fica vazio na maioria dos
 * registros e não indica de qual AQ o lote veio).
 */
export function getOrigensDoRegistro(record: RegistroRastreavel, aqAtual: string | null): OrigemLote[] {
  const aqsOrigemValidas = new Set(aqAtual ? (AQ_RECEBE_DE[aqAtual] ?? []) : []);
  const origens: OrigemLote[] = [];
  for (const [col, aq] of Object.entries(AQ_COLUMN_MAP)) {
    if (!aqsOrigemValidas.has(aq)) continue;
    const v = record[col];
    if (v !== null && v !== undefined && v !== "") origens.push({ aqCode: aq, lotNumber: String(v), column: col });
  }
  return origens;
}

/**
 * Busca todos os registros cujas colunas da AQ informada contenham o valor —
 * ou QUALQUER UMA das peças individuais dele, se for um valor composto (ver
 * `pecasIndividuais`), já que quem recebe cada peça cita só o número dela,
 * nunca a string composta inteira da Seccionadora. Peças suspeitas (ver
 * `dividirPecasComSuspeita`) nunca entram na busca — confirmado com dado
 * real que uma peça curta demais (provável erro de digitação) casa como
 * substring em registros completamente não relacionados.
 */
export async function buscarPorColunaAQ(aqCode: string, valor: string): Promise<LoteGroup[]> {
  const cols = AQ_CODE_TO_COLUMNS[aqCode] ?? [];
  if (!cols.length) return [];
  const pecas = valor.trim() === "" ? [""] : dividirPecasComSuspeita(valor).filter(p => !p.suspeita).map(p => p.valor);
  const orParts = cols.flatMap(c => pecas.map(p => clausulaColunaAQ(c, p)));
  const { data } = await supabase.from("registros_producao").select("*").or(orParts.join(",")).limit(200);
  return groupByLote(data ?? []);
}

/**
 * Busca os lotes relacionados (origem/destino) de um LoteGroup já carregado —
 * fonte primária é a coluna específica de cada AQ (ver getOrigensDoRegistro),
 * não o campo genérico `lote_fornecedor` (mantido como complemento, caso
 * algum registro só tenha esse preenchido).
 *
 * Origem: para cada AQ que oficialmente pode alimentar a AQ atual
 * (AQ_RECEBE_DE), verifica se a coluna específica dela está preenchida neste
 * registro — se sim, busca onde aquele lote foi GERADO (mesma coluna, em
 * outro registro).
 * Destino: para cada AQ que oficialmente pode receber da AQ atual
 * (AQ_EMITS_TO), busca registros cuja coluna específica contenha o lote
 * PRÓPRIO deste grupo — ou seja, quem consumiu este lote como origem.
 */
export async function buscarOrigensEDestinos(group: LoteGroup): Promise<{ origins: LoteGroup[]; children: LoteGroup[] }> {
  const aqAtual = group.currentAQ;

  // Origem — colunas de AQ preenchidas neste registro (fonte primária).
  const origensUnicas = new Map<string, OrigemLote>();
  for (const rec of group.records) {
    for (const origem of getOrigensDoRegistro(rec, aqAtual)) {
      origensUnicas.set(`${origem.aqCode}:${origem.lotNumber}`, origem);
    }
  }
  const origins: LoteGroup[] = [];
  for (const origem of origensUnicas.values()) {
    origins.push(...await buscarPorColunaAQ(origem.aqCode, origem.lotNumber));
  }

  // Complemento — lote_fornecedor, caso o registro só tenha esse preenchido.
  if (group.loteFornecedor && !origensUnicas.size) {
    const paiNum = Number(group.loteFornecedor);
    const q = isNaN(paiNum)
      ? supabase.from("registros_producao").select("*").ilike("n_lote", `%${group.loteFornecedor}%`)
      : supabase.from("registros_producao").select("*").eq("n_lote", paiNum);
    const { data } = await q.limit(200);
    if (data?.length) origins.push(...groupByLote(data));
  }

  // Destino — quem recebeu o lote PRÓPRIO deste grupo cita esse lote na
  // coluna com o nome da AQ ATUAL (a mesma lógica de getOrigensDoRegistro,
  // só que do ponto de vista de quem gerou, não de quem recebeu) — NÃO na
  // coluna própria da AQ de destino, que guarda a saída NOVA que o destino
  // gerou, não a referência ao que ele recebeu. Bug real corrigido aqui:
  // buscava antes na coluna do destino (nunca bate, é sempre um valor novo),
  // por isso "lotes posteriores" praticamente nunca aparecia.
  const children: LoteGroup[] = [];
  if (aqAtual) {
    const lotNumber = group.records.map(r => getAqLotNumber(r, aqAtual)).find(Boolean);
    if (lotNumber) {
      const destinosValidos = new Set(AQ_EMITS_TO[aqAtual] ?? []);
      const candidatos = await buscarPorColunaAQ(aqAtual, lotNumber);
      children.push(...candidatos.filter(g => g.currentAQ && destinosValidos.has(g.currentAQ)));
    }
  }

  // O próprio registro pode citar seu lote de origem na coluna dele mesmo (é
  // exatamente o que a busca de origem/destino procura) — filtra os dois
  // lados pra não aparecer como origem/destino de si próprio.
  return {
    origins: origins.filter(g => g.loteId !== group.loteId),
    children: children.filter(g => g.loteId !== group.loteId),
  };
}

/** Um lote na cadeia completa, com o nível de distância (1 = direto, 2 = origem/destino do direto, ...). */
export interface CadeiaNode {
  group: LoteGroup;
  profundidade: number;
}

export interface CadeiaCompleta {
  /** Lotes de origem em TODOS os níveis (não só o direto), do mais próximo ao mais distante. */
  origens: CadeiaNode[];
  /** Lotes gerados em TODOS os níveis (não só o direto). */
  destinos: CadeiaNode[];
  /** Todas as AQs envolvidas na cadeia (atual + origens + destinos) — usado
   * pra destacar o caminho inteiro no mapa. */
  aqsNaCadeia: string[];
  /** Nº de lotes distintos percorridos (protege contra ciclo — ver AQ015→016→017→015). */
  totalLotesPercorridos: number;
  atingiuLimite: boolean;
}

const PROFUNDIDADE_MAXIMA = 25;

/**
 * Busca recursivamente a cadeia INTEIRA de um lote — vai pra trás até a
 * origem (matéria-prima ou sem mais origem registrada) e pra frente até a
 * expedição (ou até onde os dados chegarem), nível por nível (BFS). Cada
 * lote/registro já visitado é marcado — o mesmo Set é compartilhado entre a
 * busca de origens e a de destinos, protegendo contra ciclo real do grafo
 * (ex.: AQ015→AQ016→AQ017→AQ015) mesmo quando o ciclo atravessa as duas
 * direções.
 */
export async function buscarCadeiaCompleta(group: LoteGroup): Promise<CadeiaCompleta> {
  const visitados = new Set<string>([group.loteId]);
  const aqsNaCadeia = new Set<string>(group.currentAQ ? [group.currentAQ] : []);

  async function bfs(direcao: "origem" | "destino"): Promise<{ nodes: CadeiaNode[]; atingiuLimite: boolean }> {
    const nodes: CadeiaNode[] = [];
    let fronteira = [group];
    let profundidade = 0;
    while (fronteira.length > 0 && profundidade < PROFUNDIDADE_MAXIMA) {
      profundidade++;
      const resultados = await Promise.all(fronteira.map(g => buscarOrigensEDestinos(g)));
      const proximaFronteira: LoteGroup[] = [];
      for (const r of resultados) {
        const candidatos = direcao === "origem" ? r.origins : r.children;
        for (const candidato of candidatos) {
          if (visitados.has(candidato.loteId)) continue;
          visitados.add(candidato.loteId);
          if (candidato.currentAQ) aqsNaCadeia.add(candidato.currentAQ);
          nodes.push({ group: candidato, profundidade });
          proximaFronteira.push(candidato);
        }
      }
      fronteira = proximaFronteira;
    }
    return { nodes, atingiuLimite: fronteira.length > 0 };
  }

  // Sequencial, não em paralelo: as duas buscas compartilham `visitados` de
  // propósito (protege contra ciclo que atravessa as duas direções, ex.
  // AQ015→AQ016→AQ017→AQ015) — rodando em paralelo, a ordem de quem marca
  // cada lote como visitado primeiro viraria uma corrida não-determinística.
  const origem = await bfs("origem");
  const destino = await bfs("destino");

  return {
    origens: origem.nodes,
    destinos: destino.nodes,
    aqsNaCadeia: [...aqsNaCadeia],
    totalLotesPercorridos: visitados.size,
    atingiuLimite: origem.atingiuLimite || destino.atingiuLimite,
  };
}

/** Agrupa os nós de uma cadeia por nível de profundidade — pra exibir "1º nível", "2º nível"... */
export function agruparPorNivel(nodes: CadeiaNode[]): { profundidade: number; itens: CadeiaNode[] }[] {
  const porNivel = new Map<number, CadeiaNode[]>();
  for (const n of nodes) {
    const lista = porNivel.get(n.profundidade) ?? [];
    lista.push(n);
    porNivel.set(n.profundidade, lista);
  }
  return [...porNivel.entries()].sort((a, b) => a[0] - b[0]).map(([profundidade, itens]) => ({ profundidade, itens }));
}

/**
 * Busca um grupo pelo número emitido por uma AQ específica (mesma técnica de
 * `loadAQJourney` da página antiga) — usado quando o registro não tem
 * `n_lote` próprio e o número que o usuário conhece é o da coluna daquela AQ
 * (ex.: linha_pintura_aq021), não um lote unificado.
 */
export async function buscarGrupoPorAQNumero(aqCode: string, numero: string): Promise<LoteGroup | null> {
  const cols = AQ_CODE_TO_COLUMNS[aqCode] ?? [];
  if (!cols.length) return null;
  const orParts = cols.map(c => clausulaColunaAQ(c, numero));
  const { data } = await supabase.from("registros_producao").select("*").or(orParts.join(",")).limit(500);
  const groups = groupByLote(data ?? []);
  return groups[0] ?? null;
}

// ─── Busca por filtros estruturados (painel da nova página de consulta) ──────

export type AqTipo = "origem" | "processo" | "expedicao" | "outro";

/** Classifica uma AQ em origem/processo/expedição/outro — usado pelo filtro "Tipo". */
export function classificarTipoAQ(aq: string | null): AqTipo {
  if (!aq) return "outro";
  const info = AQ_STAGE_MAP[aq];
  if (!info) return "outro";
  if (info.subprocesso === "expedicao") return "expedicao";
  if (info.subprocesso === "materia_prima") return "origem";
  return "processo";
}

export type StatusConformidade = "conforme" | "nao_conforme";

export function classificarStatus(group: LoteGroup): StatusConformidade {
  const totalNC = group.records.reduce((s, r) => s + (Number(r.qtd_nao_conforme_1) || 0), 0);
  return totalNC > 0 ? "nao_conforme" : "conforme";
}

/** Nomes distintos de máquina de um grupo, resumidos ("+N" quando há mais de 2). */
export function maquinasDoGrupo(group: LoteGroup): string {
  const nomes = [...new Set(group.records.map(r => r.maquina).filter(Boolean))] as string[];
  if (nomes.length === 0) return "—";
  if (nomes.length <= 2) return nomes.join(", ");
  return `${nomes.slice(0, 2).join(", ")} +${nomes.length - 2}`;
}

// ─── Lotes por AQ (painel do mapa) ───────────────────────────────────────────

/**
 * Busca todos os lotes já gerados numa AQ específica — reaproveita
 * `buscarPorColunaAQ` com valor vazio (ILIKE "%%" casa qualquer valor
 * não-nulo da coluna daquela AQ), usado pelo painel "Lotes da AQ" do mapa.
 */
export async function buscarLotesPorAQ(aqCode: string): Promise<LoteGroup[]> {
  const grupos = await buscarPorColunaAQ(aqCode, "");
  return [...grupos].sort((a, b) => (b.ultimaData ?? "").localeCompare(a.ultimaData ?? ""));
}

/**
 * Estimativa de quanto da quantidade gerada por este lote já foi consumido
 * nas etapas seguintes — soma a "Qtd gerada" dos lotes filhos diretos (1
 * passo à frente). NÃO é um valor contábil exato: o banco não registra
 * "quanto da origem X foi usado neste registro", só QUE ela foi usada — por
 * isso é sempre exibido como aproximação na UI.
 */
export async function calcularQtdConsumida(group: LoteGroup): Promise<number> {
  const { children } = await buscarOrigensEDestinos(group);
  return children.reduce((s, c) => s + c.totalConf, 0);
}

export type StatusLote = "disponivel" | "parcialmente_consumido" | "totalmente_consumido" | "bloqueado" | "expedido";

/**
 * Status simplificado de um lote — não existe coluna de "situação do lote" no
 * banco, então deriva de sinais reais: não conformidade (bloqueado, prioridade
 * mais alta), estágio de expedição, e a estimativa de `calcularQtdConsumida`.
 */
export function classificarStatusLote(group: LoteGroup, qtdConsumida: number): StatusLote {
  if (classificarStatus(group) === "nao_conforme") return "bloqueado";
  if (classificarTipoAQ(group.currentAQ) === "expedicao") return "expedido";
  if (qtdConsumida <= 0) return "disponivel";
  if (qtdConsumida < group.totalConf) return "parcialmente_consumido";
  return "totalmente_consumido";
}

export type PeriodoAtalho = "todos" | "hoje" | "ontem" | "7dias" | "30dias" | "mes_atual" | "personalizado";

export interface TraceabilityFilters {
  periodoInicio?: string; // yyyy-MM-dd
  periodoFim?: string;
  numeroLote?: string;
  numeroAQ?: string;
  subprocesso?: SubprocessoKey;
  tipo?: AqTipo;
  maquina?: string;
  produto?: string;
  status?: StatusConformidade;
  origemAQ?: string;
  linha?: string;
  pedido?: string;
  cliente?: string;
  fornecedor?: string;
  somenteNaoConformidade?: boolean;
}

const TAM_PAGINA_FILTROS = 1000;

/**
 * Busca por filtros estruturados: aplica no banco os filtros que mapeiam pra
 * coluna real (período, lote, máquina, produto, linha, pedido, cliente,
 * fornecedor — sempre com paginação real via .order()+.range(), sem cortar
 * silenciosamente em 1000 linhas) e os demais (setor/etapa, tipo, nº AQ,
 * status, origem, somente não conformidade) são aplicados client-side sobre
 * os LoteGroup resultantes, reaproveitando detectAQ/classificarTipoAQ —
 * o mesmo princípio de detecção já usado pelo resto do módulo, já que AQ não é
 * uma coluna literal do banco.
 */
export async function buscarRegistrosComFiltros(filtros: TraceabilityFilters): Promise<LoteGroup[]> {
  let query = supabase.from("registros_producao").select("*").order("data", { ascending: false });

  if (filtros.periodoInicio) query = query.gte("data", filtros.periodoInicio);
  if (filtros.periodoFim) query = query.lte("data", filtros.periodoFim);

  const aqCodeNormalizado = filtros.numeroAQ
    ? (() => { const c = filtros.numeroAQ!.trim().toUpperCase(); return c.startsWith("AQ") ? c : `AQ${c.padStart(3, "0")}`; })()
    : null;

  // Nº do lote: cada AQ emite o próprio número de lote na SUA coluna
  // específica (ex.: linha_pintura_aq021) — não existe um "n_lote" universal
  // e confiável (a coluna genérica `n_lote` às vezes vem vazia ou com valor
  // sem relação nenhuma, dado de fábrica). Por isso a busca usa ILIKE (nunca
  // igualdade exata — os valores vêm como texto, às vezes com ".0" no final)
  // em `n_lote` e nas colunas de AQ que são texto — e EQ exato nas que são
  // numéricas no banco (ver `clausulaColunaAQ`/`AQ_COLUMNS_NUMERICAS`, ILIKE
  // quebra com erro de operador nelas) — tanto em todas as colunas de AQ
  // conhecidas quanto só nas da AQ informada, se o filtro "Nº da AQ" também
  // estiver preenchido.
  if (filtros.numeroLote) {
    const termo = filtros.numeroLote.trim();
    const colunasAQ = aqCodeNormalizado
      ? (AQ_CODE_TO_COLUMNS[aqCodeNormalizado] ?? [])
      : Object.keys(AQ_COLUMN_MAP);
    const orParts = [`n_lote.ilike.%${termo}%`, ...colunasAQ.map(c => clausulaColunaAQ(c, termo))];
    query = query.or(orParts.join(","));
  } else if (aqCodeNormalizado) {
    // Sem número de lote informado: filtra só por "pertence a essa AQ"
    // (alguma das colunas específicas dela preenchida).
    const cols = AQ_CODE_TO_COLUMNS[aqCodeNormalizado];
    if (cols?.length) query = query.or(cols.map(c => `${c}.not.is.null`).join(","));
  }

  if (filtros.maquina) query = query.ilike("maquina", `%${filtros.maquina}%`);
  if (filtros.produto) query = query.or(`produto.ilike.%${filtros.produto}%,cod_produto.ilike.%${filtros.produto}%`);
  if (filtros.linha) query = query.ilike("linha", `%${filtros.linha}%`);
  if (filtros.pedido) query = query.or(`pedido.ilike.%${filtros.pedido}%,numero_pedido.ilike.%${filtros.pedido}%`);
  if (filtros.cliente) query = query.or(`cliente.ilike.%${filtros.cliente}%,nome_cliente.ilike.%${filtros.cliente}%`);
  if (filtros.fornecedor) query = query.ilike("fornecedor", `%${filtros.fornecedor}%`);

  const registros: RegistroRastreavel[] = [];
  let pagina = 0;
  while (true) {
    const { data, error } = await query.range(pagina * TAM_PAGINA_FILTROS, (pagina + 1) * TAM_PAGINA_FILTROS - 1);
    if (error || !data || data.length === 0) break;
    registros.push(...data);
    if (data.length < TAM_PAGINA_FILTROS) break;
    pagina++;
    if (pagina > 20) break; // trava de segurança (20k registros) — evita busca sem filtro nenhum travar a tela
  }

  let groups = groupByLote(registros);

  if (filtros.subprocesso) groups = groups.filter(g => g.currentAQ && AQ_STAGE_MAP[g.currentAQ]?.subprocesso === filtros.subprocesso);
  if (filtros.tipo) groups = groups.filter(g => classificarTipoAQ(g.currentAQ) === filtros.tipo);
  if (filtros.status) groups = groups.filter(g => classificarStatus(g) === filtros.status);
  if (filtros.somenteNaoConformidade) groups = groups.filter(g => classificarStatus(g) === "nao_conforme");
  if (filtros.origemAQ) {
    const origemCode = filtros.origemAQ.trim().toUpperCase();
    groups = groups.filter(g => g.currentAQ && (AQ_RECEBE_DE[g.currentAQ] ?? []).includes(origemCode));
  }

  return groups;
}

/** Exporta os resultados atuais como CSV (client-side, sem depender de API). */
export function exportarGruposComoCsv(groups: LoteGroup[]) {
  const header = ["Nº lote", "Nº AQ", "Setor/Etapa", "Produto", "Data", "Status"];
  const linhas = groups.map(g => [
    g.loteId, g.currentAQ ?? "", g.currentEtapa ?? "", g.produto ?? "", g.ultimaData ?? "", classificarStatus(g),
  ]);
  const csv = [header, ...linhas].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rastreabilidade-resultados.csv";
  a.click();
  URL.revokeObjectURL(url);
}
