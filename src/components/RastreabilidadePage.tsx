"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Loader2, AlertCircle, CheckCircle2, Clock, Circle,
  ChevronDown, ChevronRight, ArrowRight, ArrowLeft, Info,
  ClipboardList, Package, Hammer, Factory, Layers, Truck,
  Activity, ChevronLeft, ExternalLink, ScanLine, X,
} from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO — camada editável
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Campos de busca em ordem de prioridade.
 * Percorre cada lista até achar uma coluna que existe e retorna resultado.
 */
const SEARCHABLE_FIELDS = {
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
const TRACE_RELATION_FIELDS = {
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
 * Mapeamento coluna do banco → código AQ.
 * Fonte: schema real do banco (171 colunas verificadas).
 * Usado para identificar o AQ de um registro com ALTA precisão,
 * verificando qual coluna AQ-específica tem valor não-nulo.
 */
const AQ_COLUMN_MAP: Record<string, string> = {
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
  recobrimento_aq019:              "AQ019",
  colagem_borda_aq020:             "AQ020",
  linha_pintura_aq021:             "AQ021",
  usinagem_friso_aq022:            "AQ022",
  usinagem_portas_aq023:           "AQ023",
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
const AQ_CODE_TO_COLUMNS: Record<string, string[]> = Object.entries(AQ_COLUMN_MAP).reduce(
  (acc, [col, aqCode]) => { (acc[aqCode] ??= []).push(col); return acc; },
  {} as Record<string, string[]>
);

// Mapeamento de saídas: AQ → AQs para onde emite (conforme fluxograma oficial)
const AQ_EMITS_TO: Record<string, string[]> = {
  AQ001: ["AQ009"],
  AQ002: ["AQ016", "AQ017", "AQ019"],
  AQ005: ["AQ029"],
  AQ044: ["AQ018", "AQ021"],
  AQ009: ["AQ041", "AQ016"],
  AQ039: ["AQ040"],
  AQ040: ["AQ041"],
  AQ041: ["AQ042"],
  AQ042: ["AQ016"],
  AQ015: ["AQ016"],
  AQ016: ["AQ017"],
  AQ017: ["AQ019"],
  AQ019: ["AQ018", "AQ021"],
  AQ018: ["AQ020"],
  AQ021: ["AQ020"],
  AQ020: ["AQ022"],
  AQ022: ["AQ023"],
  AQ023: ["AQ029"],
  AQ029: ["AQ024"],
  AQ024: ["AQ030"],
};

const AQ_STAGE_MAP: Record<string, { nome: string; subprocesso: SubprocessoKey }> = {
  // Entrada de material (externo)
  AQ001: { nome: "Recebimento de Chapa",            subprocesso: "materia_prima" },
  AQ002: { nome: "Recebimento de Materiais",        subprocesso: "materia_prima" },
  AQ005: { nome: "Recebimento de Ferragens",        subprocesso: "materia_prima" },
  AQ044: { nome: "Recebimento de Insumos",          subprocesso: "materia_prima" },
  // Seccionamento inicial
  AQ009: { nome: "Seccionadora",                    subprocesso: "porta" },
  // Fluxo do quadro/grade (ramificação de AQ009 → converge em AQ016)
  AQ039: { nome: "Montadora de Grade",              subprocesso: "quadro" },
  AQ040: { nome: "Esquadrejadeira",                 subprocesso: "quadro" },
  AQ041: { nome: "Lixadeira",                       subprocesso: "quadro" },
  AQ042: { nome: "Seccionadora de Canal",           subprocesso: "quadro" },
  AQ015: { nome: "Destopadeira Sarrafo",            subprocesso: "quadro" },
  // Montagem e prensagem (convergência)
  AQ016: { nome: "Mesa de Montagem do Quadro",      subprocesso: "quadro" },
  AQ017: { nome: "Prensagem Fria",                  subprocesso: "porta" },
  // Recobrimento
  AQ019: { nome: "Recobrimento de Porta e Tampo",  subprocesso: "porta" },
  // Pintura (paralelo: AQ018 + AQ021 saem de AQ019 e convergem em AQ020)
  AQ018: { nome: "Linha de Pintura de Porta",      subprocesso: "acabamento" },
  AQ021: { nome: "Linha de Pintura de Tampo",      subprocesso: "acabamento" },
  // Acabamento sequencial
  AQ020: { nome: "Colagem da Borda",               subprocesso: "acabamento" },
  AQ022: { nome: "Usinagem dos Frisos",             subprocesso: "acabamento" },
  AQ023: { nome: "Furação e Corte das Portas",     subprocesso: "acabamento" },
  AQ029: { nome: "Montagem do Kit",                subprocesso: "acabamento" },
  AQ024: { nome: "Embalagem de Portas",            subprocesso: "acabamento" },
  // Expedição
  AQ030: { nome: "Expedição",                       subprocesso: "expedicao" },
};

/**
 * Mapeamento nome da máquina (lowercase parcial) → AQ.
 * Fallback quando as colunas AQ-específicas não têm valor.
 * Padrões mais específicos devem vir ANTES dos genéricos.
 */
/**
 * Mapeamento nome da máquina (lowercase parcial) → AQ.
 * Fallback quando as colunas AQ-específicas não têm valor.
 * REGRA: padrões mais específicos DEVEM vir antes dos genéricos.
 * AQ018 = Linha de Pintura de PORTA
 * AQ021 = Linha de Pintura de TAMPO  ← padrão genérico "linha de pintura"
 * AQ019 = Recobrimento de Porta e Tampo
 */
const MACHINE_TO_AQ: Array<[pattern: string, aq: string]> = [
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
  ["embalagem",                    "AQ024"],
  // Expedição
  ["expedição",                    "AQ030"],
  ["expedicao",                    "AQ030"],
  // Recebimento genérico (último — mais amplo)
  ["recebimento",                  "AQ001"],
];

// Fluxo oficial (fonte: fluxograma fornecido pelo cliente):
//
//  AQ001 ─────────────────────────────────────────────────► AQ009
//  AQ002 ──────────────────────────────────────────► AQ016, AQ017, AQ019
//  AQ005 ──────────────────────────────────────────────────────► AQ029
//  AQ044 ───────────────────────────────────────────────► AQ018, AQ021
//
//  AQ009 → AQ039 → AQ040 ─┐
//  AQ009 ─────────────────►AQ041 → AQ042 → AQ016
//  AQ009 → AQ015 ──────────────────────────► AQ016
//  AQ016 → AQ017 → AQ019 → AQ018 ─┐
//                         AQ019 → AQ021 ─┘→ AQ020 → AQ022 → AQ023 → AQ029 → AQ024 → AQ030
const PROCESS_FLOW_ORDER: FlowStep[] = [
  // ── Entrada de material (externo) ───────────────────────────────────────────
  { aq: "AQ001", nome: "Recebimento de Chapa",           subprocesso: "materia_prima" },
  { aq: "AQ002", nome: "Recebimento de Materiais",       subprocesso: "materia_prima" },
  { aq: "AQ044", nome: "Recebimento de Insumos",         subprocesso: "materia_prima" },
  { aq: "AQ005", nome: "Recebimento de Ferragens",       subprocesso: "materia_prima" },
  // ── Seccionamento inicial ────────────────────────────────────────────────────
  { aq: "AQ009", nome: "Seccionadora",                   subprocesso: "porta" },
  // ── Fluxo do quadro/grade (ramificações de AQ009 → convergem em AQ016) ─────
  { aq: "AQ039", nome: "Montadora de Grade",             subprocesso: "quadro" },
  { aq: "AQ040", nome: "Esquadrejadeira",                subprocesso: "quadro" },
  { aq: "AQ041", nome: "Lixadeira",                      subprocesso: "quadro" },
  { aq: "AQ042", nome: "Seccionadora de Canal",          subprocesso: "quadro" },
  { aq: "AQ015", nome: "Destopadeira Sarrafo",           subprocesso: "quadro" },
  // ── Montagem e prensagem (convergência) ─────────────────────────────────────
  { aq: "AQ016", nome: "Mesa de Montagem do Quadro",     subprocesso: "quadro" },
  { aq: "AQ017", nome: "Prensagem Fria",                 subprocesso: "porta" },
  // ── Recobrimento ─────────────────────────────────────────────────────────────
  { aq: "AQ019", nome: "Recobrimento de Porta e Tampo",  subprocesso: "porta" },
  // ── Pintura (paralelo: AQ018 + AQ021 → convergem em AQ020) ─────────────────
  { aq: "AQ018", nome: "Linha de Pintura de Porta",      subprocesso: "acabamento" },
  { aq: "AQ021", nome: "Linha de Pintura de Tampo",      subprocesso: "acabamento" },
  // ── Acabamento sequencial ────────────────────────────────────────────────────
  { aq: "AQ020", nome: "Colagem da Borda",               subprocesso: "acabamento" },
  { aq: "AQ022", nome: "Usinagem dos Frisos",            subprocesso: "acabamento" },
  { aq: "AQ023", nome: "Furação e Corte das Portas",     subprocesso: "acabamento" },
  { aq: "AQ029", nome: "Montagem do Kit",                subprocesso: "acabamento" },
  { aq: "AQ024", nome: "Embalagem de Portas",            subprocesso: "acabamento" },
  // ── Expedição ────────────────────────────────────────────────────────────────
  { aq: "AQ030", nome: "Expedição",                      subprocesso: "expedicao" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SubprocessoKey = "materia_prima" | "porta" | "quadro" | "perfis" | "acabamento" | "expedicao";
type StepStatus = "concluido" | "em_andamento" | "pendente" | "ignorado";
type ViewMode = "search" | "detail";

interface FlowStep {
  aq: string;
  nome: string;
  subprocesso: SubprocessoKey;
}

interface FlowStepStatus extends FlowStep {
  status: StepStatus;
  registros: RegistroRastreavel[];
  ultimaMovimentacao?: string;
  alternativo?: boolean;
}

interface RegistroRastreavel {
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

interface LoteGroup {
  loteId: string;
  records: RegistroRastreavel[];
  currentAQ: string | null;
  currentEtapa: string | null;
  produto: string | null;
  cliente: string | null;
  fornecedor: string | null;
  loteFornecedor: string | null;
  totalConf: number;
  primeiraData: string | null;
  ultimaData: string | null;
}

interface NavEntry {
  loteId: string;
  label: string;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Detecta o AQ de um registro.
 * Método 1 (preferido): verifica quais colunas AQ-específicas têm valor.
 * Método 2 (fallback): match no nome da máquina.
 */
function detectAQ(record: RegistroRastreavel): string | null {
  for (const [col, aq] of Object.entries(AQ_COLUMN_MAP)) {
    const v = record[col];
    if (v !== null && v !== undefined && v !== "" && v !== false && v !== 0) {
      return aq;
    }
  }
  // fallback: match no nome da máquina
  const maq = record.maquina?.trim().toLowerCase();
  if (!maq) return null;
  for (const [pattern, aq] of MACHINE_TO_AQ) {
    if (maq.includes(pattern)) return aq;
  }
  return null;
}

function getLoteId(record: RegistroRastreavel): string | null {
  const v = record[TRACE_RELATION_FIELDS.loteId];
  return v !== null && v !== undefined ? String(v) : null;
}

function getLotePai(record: RegistroRastreavel): string | null {
  const v = record[TRACE_RELATION_FIELDS.lotePai];
  return v && typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function getProduto(record: RegistroRastreavel): string | null {
  return record.produto || record.cod_produto || null;
}

function getCliente(record: RegistroRastreavel): string | null {
  return record.nome_cliente || record.cliente || null;
}

function fmtData(d?: string | null): string {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function sortByDateAsc(a: RegistroRastreavel, b: RegistroRastreavel) {
  const da = (a.data ?? "") + (a.hora_inicial ?? "") + (a.hora_final ?? "");
  const db = (b.data ?? "") + (b.hora_inicial ?? "") + (b.hora_final ?? "");
  return da.localeCompare(db);
}

function sortByDateDesc(a: RegistroRastreavel, b: RegistroRastreavel) {
  return -sortByDateAsc(a, b);
}

/** Agrupa registros por n_lote, retorna lista de LoteGroup */
function groupByLote(records: RegistroRastreavel[]): LoteGroup[] {
  const map: Record<string, RegistroRastreavel[]> = {};
  for (const rec of records) {
    const key = getLoteId(rec) ?? `sem_lote:${getProduto(rec) ?? rec.id}`;
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
 * 5. Par alternativo não usado = "ignorado".
 * 6. AQ029 pode ter múltiplos registros (Montagem + Embalagem Kit):
 *    exibe o nome da máquina para diferenciar.
 */
function calcularFluxo(records: RegistroRastreavel[]): FlowStepStatus[] {
  const aqsPresentes = new Set<string>();
  const aqRegistros: Record<string, RegistroRastreavel[]> = {};

  for (const rec of records) {
    const aq = detectAQ(rec);
    if (aq) {
      aqsPresentes.add(aq);
      (aqRegistros[aq] ??= []).push(rec);
    }
  }

  // Última posição no fluxo oficial que tem registro
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

    // Para AQ029: inclui nome da máquina para distinguir Montagem vs Embalagem
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

// ─── Sub-componentes de UI ────────────────────────────────────────────────────

type SubprocessoInfo = { label: string; Icon: React.ComponentType<{ className?: string }> };

const SUBPROCESSO_INFO: Record<SubprocessoKey, SubprocessoInfo> = {
  materia_prima: { label: "Matéria Prima",           Icon: Layers  },
  porta:         { label: "Produção / Revestimento", Icon: Factory },
  quadro:        { label: "Montagem do Quadro",      Icon: Hammer  },
  perfis:        { label: "Produção dos Perfis",     Icon: Activity },
  acabamento:    { label: "Acabamento",              Icon: Package },
  expedicao:     { label: "Expedição",               Icon: Truck   },
};

function AQBadge({ aq, className }: { aq: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] px-1.5 py-0 shrink-0", className)}>
      {aq}
    </Badge>
  );
}

function StatusDot({ status }: { status: StepStatus }) {
  if (status === "concluido")    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "em_andamento") return <Clock className="h-4 w-4 text-primary animate-pulse shrink-0" />;
  return <Circle className={cn("h-4 w-4 shrink-0", status === "ignorado" ? "text-muted-foreground/25" : "text-muted-foreground/35")} />;
}

// ─── LoteCard (resultado de busca, clicável) ──────────────────────────────────

function LoteCard({
  group,
  onOpen,
}: {
  group: LoteGroup;
  onOpen: (loteId: string, label: string) => void;
}) {
  const loteLabel = group.loteId.startsWith("sem_lote:") ? "sem lote" : `Lote ${group.loteId}`;

  return (
    <Card className="hover:border-primary/40 transition-colors cursor-pointer group"
      onClick={() => onOpen(group.loteId, loteLabel)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base font-bold font-mono text-foreground">{loteLabel}</span>
              {group.currentAQ && <AQBadge aq={group.currentAQ} />}
              {group.currentEtapa && (
                <span className="text-xs text-muted-foreground">{group.currentEtapa}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {group.produto && <span className="font-medium text-foreground/80">{group.produto}</span>}
              {group.cliente && <span>Cliente: {group.cliente}</span>}
              {group.fornecedor && <span>Fornecedor: {group.fornecedor}</span>}
              {group.loteFornecedor && <span>Lote pai: <span className="font-mono">{group.loteFornecedor}</span></span>}
            </div>

            <div className="flex gap-4 mt-1.5 text-[11px] text-muted-foreground">
              <span>{fmtData(group.primeiraData)} → {fmtData(group.ultimaData)}</span>
              <span>{group.totalConf.toLocaleString("pt-BR")} un. conformes</span>
              <span>{group.records.length} registro(s)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 group-hover:border-primary/50">
              Ver rastreabilidade
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── RelacaoCard (origem / destino, clicável) ─────────────────────────────────

function RelacaoCard({
  titulo,
  loteId,
  produto,
  aq,
  etapa,
  data,
  qtd,
  onNavigate,
  direction = "forward",
}: {
  titulo: string;
  loteId: string | null;
  produto: string | null;
  aq: string | null;
  etapa: string | null;
  data?: string | null;
  qtd?: number;
  onNavigate: (loteId: string, label: string) => void;
  direction?: "forward" | "back";
}) {
  const canNavigate = !!loteId;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        canNavigate
          ? "border-border hover:border-primary/40 cursor-pointer hover:bg-muted/30"
          : "border-border/40 bg-muted/10 opacity-60"
      )}
      onClick={() => canNavigate && onNavigate(loteId!, `Lote ${loteId}`)}
    >
      <div className={cn("mt-0.5 shrink-0", direction === "back" ? "text-muted-foreground" : "text-primary")}>
        {direction === "back"
          ? <ArrowLeft className="h-4 w-4" />
          : <ArrowRight className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{titulo}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {loteId && <span className="text-sm font-bold font-mono">Lote {loteId}</span>}
          {aq && <AQBadge aq={aq} />}
          {etapa && <span className="text-xs text-muted-foreground">{etapa}</span>}
        </div>
        <div className="flex gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          {produto && <span>{produto}</span>}
          {data && <span>{fmtData(data)}</span>}
          {qtd !== undefined && <span>{qtd.toLocaleString("pt-BR")} un.</span>}
        </div>
      </div>

      {canNavigate && (
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
      )}
    </div>
  );
}

// ─── SummaryHeader ────────────────────────────────────────────────────────────

function SummaryHeader({ group }: { group: LoteGroup }) {
  const naExpedicao = group.records.some(r => detectAQ(r) === "AQ030");

  // Nota Fiscal do Recebimento de Chapa (AQ001)
  const recChapa = group.records.filter(r => detectAQ(r) === "AQ001");
  const notasFiscais = [...new Set(
    recChapa.map(r => r.nota_fiscal).filter(v => v !== null && v !== undefined && String(v).trim() !== "")
  )];
  const materialCertificado = notasFiscais.length > 0 ? notasFiscais.map(String).join(", ") : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Lote</p>
          <p className="text-xl font-bold font-mono">
            {group.loteId.startsWith("sem_lote:") ? "—" : group.loteId}
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-1 sm:col-span-1">
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
          <p className="text-sm font-semibold truncate" title={group.produto ?? ""}>
            {group.produto ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
          <p className="text-sm font-semibold truncate">{group.cliente ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Conforme</p>
          <p className="text-xl font-bold">{group.totalConf.toLocaleString("pt-BR")}</p>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Etapa Atual</p>
          <div className="flex items-center gap-2 flex-wrap">
            {group.currentAQ && <AQBadge aq={group.currentAQ} className="text-xs" />}
            <span className="text-sm font-semibold">{group.currentEtapa ?? "—"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmtData(group.primeiraData)} → {fmtData(group.ultimaData)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</p>
          {naExpedicao
            ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Expedido</Badge>
            : <Badge className="bg-primary/10 text-primary border-primary/20">Em produção</Badge>}
        </CardContent>
      </Card>

      {(group.fornecedor || group.loteFornecedor) && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Fornecedor</p>
            <p className="text-sm font-semibold truncate">{group.fornecedor ?? "—"}</p>
            {group.loteFornecedor && (
              <p className="text-[11px] text-muted-foreground font-mono">Lote: {group.loteFornecedor}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Material Certificado (NF)</p>
          <p className="text-sm font-semibold font-mono truncate" title={materialCertificado ?? ""}>
            {materialCertificado ?? "—"}
          </p>
          {recChapa.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Recebimento de Chapa · AQ001</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineFluxo({ steps }: { steps: FlowStepStatus[] }) {
  const grupos: Partial<Record<SubprocessoKey, FlowStepStatus[]>> = {};
  for (const s of steps) (grupos[s.subprocesso] ??= []).push(s);

  const ordemSubs: SubprocessoKey[] = ["materia_prima", "porta", "quadro", "perfis", "acabamento", "expedicao"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ordemSubs.map(sub => {
        const list = grupos[sub];
        if (!list || list.length === 0) return null;
        const { label, Icon } = SUBPROCESSO_INFO[sub];
        const temAtivo = list.some(s => s.status !== "pendente" && s.status !== "ignorado");

        return (
          <div key={sub} className={cn(
            "rounded-lg border p-3",
            temAtivo ? "border-border bg-card" : "border-border/40 bg-muted/10"
          )}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", temAtivo ? "text-primary" : "text-muted-foreground/40")} />
              <span className={cn("text-xs font-semibold", temAtivo ? "text-foreground" : "text-muted-foreground/50")}>
                {label}
              </span>
            </div>
            <div className="space-y-1.5">
              {list.map(step => (
                <div key={step.aq} className="flex items-start gap-2">
                  <StatusDot status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium leading-tight">
                        {step.nome}
                      </span>
                      <AQBadge aq={step.aq} />
                    </div>
                    {step.status !== "pendente" && step.status !== "ignorado" && step.ultimaMovimentacao && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{step.ultimaMovimentacao}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabela detalhada ─────────────────────────────────────────────────────────

function TabelaDetalhada({ records }: { records: RegistroRastreavel[] }) {
  const sorted = [...records].sort(sortByDateAsc);

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {["Data", "AQ", "Etapa / Máquina", "Produto", "H.Ini.", "H.Fin.", "Conf.", "N.C.", "Fornecedor", "Obs."]
              .map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(r => {
            const aq = detectAQ(r);
            const etapa = aq ? AQ_STAGE_MAP[aq] : null;
            return (
              <TableRow key={r.id} className="text-xs">
                <TableCell className="font-mono whitespace-nowrap">{fmtData(r.data)}</TableCell>
                <TableCell>{aq ? <AQBadge aq={aq} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="max-w-[180px]">
                  <span className="block truncate" title={r.maquina ?? ""}>
                    {etapa?.nome ?? r.maquina ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[120px]">
                  <span className="block truncate">{getProduto(r) ?? "—"}</span>
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">{String(r.hora_inicial ?? "—")}</TableCell>
                <TableCell className="font-mono whitespace-nowrap">{String(r.hora_final ?? "—")}</TableCell>
                <TableCell className="text-right font-mono">{r.qtd_conforme ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-destructive/70">{r.qtd_nao_conforme_1 ?? "—"}</TableCell>
                <TableCell className="max-w-[100px]">
                  <span className="block truncate">{r.fornecedor ?? "—"}</span>
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <span className="block truncate text-muted-foreground" title={r.observacao ?? ""}>
                    {r.observacao ?? "—"}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Componente de seção expansível ───────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setOpen(p => !p)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
            {badge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{badge}</Badge>
            )}
          </CardTitle>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ─── View: resultados de busca ────────────────────────────────────────────────

function SearchResultsView({
  groups,
  onOpen,
}: {
  groups: LoteGroup[];
  onOpen: (loteId: string, label: string) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {groups.length} lote(s) encontrado(s)
        </h2>
        <p className="text-xs text-muted-foreground">— clique em um lote para ver a rastreabilidade completa</p>
      </div>
      {groups.map(g => (
        <LoteCard key={g.loteId} group={g} onOpen={onOpen} />
      ))}
    </div>
  );
}

// ─── View: detalhe de um lote ─────────────────────────────────────────────────

function DetailView({
  group,
  originGroups,
  childGroups,
  onNavigate,
  onBack,
  navStack,
}: {
  group: LoteGroup;
  originGroups: LoteGroup[];
  childGroups: LoteGroup[];
  onNavigate: (loteId: string, label: string) => void;
  onBack: () => void;
  navStack: NavEntry[];
}) {
  const [showTable, setShowTable] = useState(true);
  const flowSteps = calcularFluxo(group.records);

  // Etapa atual e próxima etapa do fluxo
  const currentFlowIdx = PROCESS_FLOW_ORDER.findIndex(s => s.aq === group.currentAQ);
  const nextStep = currentFlowIdx >= 0
    ? PROCESS_FLOW_ORDER.slice(currentFlowIdx + 1).find(s => !group.records.some(r => detectAQ(r) === s.aq))
    : null;

  return (
    <div className="space-y-4">

      {/* Breadcrumb / navegação */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground px-2" onClick={onBack}>
          <ChevronLeft className="h-3.5 w-3.5" />
          {navStack.length === 0 ? "Busca" : `Lote ${navStack[navStack.length - 1].loteId}`}
        </Button>
        {navStack.map((entry, i) => (
          <span key={i} className="text-xs text-muted-foreground flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {entry.label}
          </span>
        ))}
        <span className="text-xs font-semibold flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          Lote {group.loteId.startsWith("sem_lote:") ? "—" : group.loteId}
        </span>
      </div>

      {/* Resumo */}
      <SummaryHeader group={group} />

      {/* Origem + Destinos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bloco Origem */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              Origem deste lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Fornecedor externo */}
            {group.fornecedor && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Fornecedor externo</p>
                <p className="text-sm font-semibold">{group.fornecedor}</p>
                {group.loteFornecedor && (
                  <p className="text-xs text-muted-foreground font-mono">Lote fornecedor: {group.loteFornecedor}</p>
                )}
              </div>
            )}

            {/* Lotes pai encontrados no banco */}
            {originGroups.length > 0 ? (
              originGroups.map(og => (
                <RelacaoCard
                  key={og.loteId}
                  titulo="Lote de origem (matéria-prima)"
                  loteId={og.loteId}
                  produto={og.produto}
                  aq={og.currentAQ}
                  etapa={og.currentEtapa}
                  data={og.ultimaData}
                  qtd={og.totalConf}
                  onNavigate={onNavigate}
                  direction="back"
                />
              ))
            ) : !group.fornecedor ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma origem vinculada encontrada no banco.</p>
            ) : null}
          </CardContent>
        </Card>

        {/* Bloco Destinos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Destinos deste lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Próxima etapa no fluxo */}
            {nextStep && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Próxima etapa esperada</p>
                <div className="flex items-center gap-2">
                  <AQBadge aq={nextStep.aq} className="text-xs" />
                  <span className="text-sm font-semibold">{nextStep.nome}</span>
                </div>
              </div>
            )}

            {/* Lotes filhos (que usaram este como fornecedor) */}
            {childGroups.length > 0 ? (
              <>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Lotes gerados a partir deste ({childGroups.length})
                </p>
                {childGroups.map(cg => (
                  <RelacaoCard
                    key={cg.loteId}
                    titulo="Produto gerado"
                    loteId={cg.loteId}
                    produto={cg.produto}
                    aq={cg.currentAQ}
                    etapa={cg.currentEtapa}
                    data={cg.ultimaData}
                    qtd={cg.totalConf}
                    onNavigate={onNavigate}
                    direction="forward"
                  />
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Nenhum lote filho encontrado. Este pode ser o produto final, ou o vínculo pode ser implícito.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Section title="Timeline do Fluxo Produtivo" icon={Activity}>
        <TimelineFluxo steps={flowSteps} />
      </Section>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowTable(p => !p)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Registros Técnicos
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {group.records.length}
              </Badge>
            </CardTitle>
            {showTable
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {showTable && (
          <CardContent className="pt-0">
            <TabelaDetalhada records={group.records} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ─── AQ Browse: grid de seleção ──────────────────────────────────────────────

interface AQNumberEntry {
  number: string;
  date: string | null;
  fornecedor: string | null;
  count: number;
}

const SUBPROCESSO_ORDER: SubprocessoKey[] = [
  "materia_prima", "porta", "quadro", "acabamento", "expedicao",
];

function AQSelectGrid({
  selectedAQ,
  onSelect,
}: {
  selectedAQ: string | null;
  onSelect: (aq: string) => void;
}) {
  const grupos: Partial<Record<SubprocessoKey, FlowStep[]>> = {};
  for (const step of PROCESS_FLOW_ORDER) {
    (grupos[step.subprocesso] ??= []).push(step);
  }
  return (
    <div className="space-y-4">
      {SUBPROCESSO_ORDER.map(sub => {
        const steps = grupos[sub];
        if (!steps?.length) return null;
        const { label, Icon } = SUBPROCESSO_INFO[sub];
        return (
          <div key={sub}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {steps.map(step => (
                <button
                  key={step.aq}
                  onClick={() => onSelect(step.aq)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all",
                    selectedAQ === step.aq
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  )}
                >
                  <span className="font-mono font-semibold">{step.aq}</span>
                  <span className="opacity-70">— {step.nome}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function RastreabilidadePage() {
  // ── Aba principal ────────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<"lote" | "aq">("lote");

  // ── Aba "Lote" ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]     = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [mode, setMode]                 = useState<ViewMode>("search");
  const [hasSearched, setHasSearched]   = useState(false);
  const [searchGroups, setSearchGroups] = useState<LoteGroup[]>([]);
  const [currentGroup, setCurrentGroup]   = useState<LoteGroup | null>(null);
  const [originGroups, setOriginGroups]   = useState<LoteGroup[]>([]);
  const [childGroups, setChildGroups]     = useState<LoteGroup[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [navStack, setNavStack]           = useState<NavEntry[]>([]);

  // ── Aba "AQ" ─────────────────────────────────────────────────────────────────
  const [selectedAQCode, setSelectedAQCode]       = useState<string | null>(null);
  const [aqNumbers, setAqNumbers]                 = useState<AQNumberEntry[]>([]);
  const [aqNumbersLoading, setAqNumbersLoading]   = useState(false);
  const [aqNumberSearch, setAqNumberSearch]       = useState("");
  const [selectedAQNumber, setSelectedAQNumber]   = useState<string | null>(null);
  const [aqJourneyRecords, setAqJourneyRecords]   = useState<RegistroRastreavel[]>([]);
  const [aqJourneyLoading, setAqJourneyLoading]   = useState(false);
  const [customAQCode, setCustomAQCode]           = useState<string>("");
  const [customAQNumber, setCustomAQNumber]       = useState<string>("");

  const filteredAQNumbers = useMemo(() =>
    aqNumberSearch
      ? aqNumbers.filter(n => n.number.toLowerCase().includes(aqNumberSearch.toLowerCase()))
      : aqNumbers,
    [aqNumbers, aqNumberSearch]
  );

  const aqJourneyFlow = useMemo(() => {
    const steps = calcularFluxo(aqJourneyRecords);
    if (!selectedAQCode) return steps;

    // Força a AQ de origem como "em_andamento" se não foi detectada nos registros
    const sourceIdx = steps.findIndex(s => s.aq === selectedAQCode);
    if (sourceIdx === -1 || steps[sourceIdx].status !== "pendente") return steps;

    return steps.map((step, idx) => {
      if (step.aq === selectedAQCode) return { ...step, status: "em_andamento" as StepStatus };
      // Etapas anteriores à AQ de origem que estão pendentes → inferidas como concluídas
      if (idx < sourceIdx && step.status === "pendente") return { ...step, status: "concluido" as StepStatus };
      return step;
    });
  }, [aqJourneyRecords, selectedAQCode]);

  // Registros que pertencem especificamente à AQ de origem (filtra por coluna, não por detectAQ)
  const sourceAQRecords = useMemo(() => {
    if (!selectedAQCode || !selectedAQNumber) return [];
    const cols = AQ_CODE_TO_COLUMNS[selectedAQCode] ?? [];
    const numVal = Number(selectedAQNumber);
    return aqJourneyRecords.filter(r =>
      cols.some(col => {
        const v = r[col];
        if (v === null || v === undefined || v === "" || v === false) return false;
        const sv = String(v).trim();
        return sv === selectedAQNumber || (!isNaN(numVal) && Math.abs(Number(sv) - numVal) < 0.001);
      })
    );
  }, [selectedAQCode, selectedAQNumber, aqJourneyRecords]);

  // ── Funções da aba "Lote" ────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const termo = searchTerm.trim();
    if (!termo) return;
    setIsLoading(true);
    setHasSearched(false);
    setSearchGroups([]);
    setMode("search");
    setNavStack([]);
    const termNum = Number(termo);
    const isNum   = !isNaN(termNum) && termo !== "";
    let found: RegistroRastreavel[] = [];
    try {
      if (isNum) {
        const { data } = await supabase.from("registros_producao").select("*").eq("n_lote", termNum).limit(500);
        if (data?.length) { found = data; }
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
        if (data?.length) { found = data; }
      }
      if (!found.length) {
        const { data } = await supabase.from("registros_producao").select("*").ilike("cod_produto", `%${termo}%`).limit(500);
        if (data?.length) { found = data; }
      }
      if (!found.length) {
        const { data } = await supabase.from("registros_producao").select("*")
          .or(`cliente.ilike.%${termo}%,nome_cliente.ilike.%${termo}%`).limit(500);
        if (data?.length) { found = data; }
      }
      if (!found.length) {
        const { data } = await supabase.from("registros_producao").select("*").ilike("fornecedor", `%${termo}%`).limit(500);
        if (data?.length) { found = data; }
      }
      if (!found.length) {
        const { data } = await supabase.from("registros_producao").select("*").ilike("lote_fornecedor", `%${termo}%`).limit(500);
        if (data?.length) { found = data; }
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
        if (data?.length) { found = data; }
      }
      const groups = groupByLote(found);
      setSearchGroups(groups);
      setHasSearched(true);
      if (groups.length === 0) {
        toast.info("Nenhum registro encontrado para o termo informado.");
      } else if (groups.length === 1) {
        await openLot(groups[0].loteId, `Lote ${groups[0].loteId}`, []);
      }
    } catch (err) {
      toast.error("Erro na busca: " + String(err));
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openLot = useCallback(async (loteId: string, label: string, stack: NavEntry[]) => {
    setLoadingDetail(true);
    setMode("detail");
    setNavStack(stack);
    try {
      const { data: loteDados } = await supabase
        .from("registros_producao").select("*")
        .eq("n_lote", isNaN(Number(loteId)) ? loteId : Number(loteId))
        .order("data", { ascending: true })
        .limit(500);
      const lotRecs: RegistroRastreavel[] = loteDados ?? [];
      const groups = groupByLote(lotRecs.length > 0 ? lotRecs : [{ id: -1, n_lote: loteId } as RegistroRastreavel]);
      const mainGroup = groups[0] ?? { loteId, records: [], currentAQ: null, currentEtapa: null, produto: null, cliente: null, fornecedor: null, loteFornecedor: null, totalConf: 0, primeiraData: null, ultimaData: null };
      setCurrentGroup(mainGroup);
      const lotePaiValue = mainGroup.loteFornecedor;
      let origins: LoteGroup[] = [];
      if (lotePaiValue) {
        const paiNum = Number(lotePaiValue);
        const q = isNaN(paiNum)
          ? supabase.from("registros_producao").select("*").ilike("n_lote", `%${lotePaiValue}%`).limit(200)
          : supabase.from("registros_producao").select("*").eq("n_lote", paiNum).limit(200);
        const { data: origemData } = await q;
        if (origemData?.length) origins = groupByLote(origemData);
      }
      setOriginGroups(origins);
      const { data: filhosData } = await supabase
        .from("registros_producao").select("*")
        .ilike("lote_fornecedor", `%${loteId}%`)
        .limit(300);
      const filhos = groupByLote(filhosData ?? []).filter(g => g.loteId !== loteId);
      setChildGroups(filhos);
    } catch (err) {
      toast.error("Erro ao carregar lote: " + String(err));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const navigateTo = useCallback(async (loteId: string, label: string) => {
    const newStack: NavEntry[] = [
      ...navStack,
      ...(currentGroup ? [{ loteId: currentGroup.loteId, label: `Lote ${currentGroup.loteId}` }] : []),
    ];
    await openLot(loteId, label, newStack);
  }, [navStack, currentGroup, openLot]);

  const goBack = useCallback(async () => {
    if (navStack.length === 0) {
      setMode("search");
      setCurrentGroup(null);
    } else {
      const prev = navStack[navStack.length - 1];
      const newStack = navStack.slice(0, -1);
      await openLot(prev.loteId, prev.label, newStack);
    }
  }, [navStack, openLot]);

  const handleOpenFromSearch = useCallback(async (loteId: string, label: string) => {
    await openLot(loteId, label, []);
  }, [openLot]);

  // ── Funções da aba "AQ" ──────────────────────────────────────────────────────

  const loadAQNumbers = useCallback(async (aqCode: string) => {
    setAqNumbersLoading(true);
    setAqNumbers([]);
    setSelectedAQNumber(null);
    setAqJourneyRecords([]);
    setAqNumberSearch("");

    const cols = AQ_CODE_TO_COLUMNS[aqCode] ?? [];
    if (!cols.length) { setAqNumbersLoading(false); return; }

    const numberMap = new Map<string, { date: string | null; fornecedor: string | null; count: number }>();
    for (const col of cols) {
      const { data } = await supabase
        .from("registros_producao")
        .select("*")
        .not(col, "is", null)
        .neq(col, "")
        .limit(2000);
      for (const row of ((data ?? []) as RegistroRastreavel[])) {
        const val = row[col];
        if (val !== null && val !== undefined) {
          const key = String(val).trim();
          if (!key) continue;
          const existing = numberMap.get(key);
          const rowDate = row.data ?? null;
          const rowForn = row.fornecedor ?? null;
          if (!existing) {
            numberMap.set(key, { date: rowDate, fornecedor: rowForn, count: 1 });
          } else {
            existing.count++;
            if (rowDate && (!existing.date || rowDate > existing.date)) existing.date = rowDate;
            if (rowForn && !existing.fornecedor) existing.fornecedor = rowForn;
          }
        }
      }
    }
    const entries: AQNumberEntry[] = Array.from(numberMap.entries())
      .map(([number, v]) => ({ number, ...v }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    setAqNumbers(entries);
    setAqNumbersLoading(false);
  }, []);

  const loadAQJourney = useCallback(async (aqNumber: string, fromAQCode?: string) => {
    setAqJourneyLoading(true);
    setAqJourneyRecords([]);

    const allCols = Object.keys(AQ_COLUMN_MAP);
    const escaped = aqNumber.replace(/"/g, '\\"');
    const orFilter = allCols.map(col => `${col}.eq."${escaped}"`).join(",");
    const { data, error } = await supabase
      .from("registros_producao").select("*").or(orFilter).limit(500);

    const existingIds = new Set<number>();
    const records: RegistroRastreavel[] = [];
    for (const r of (data ?? []) as RegistroRastreavel[]) {
      if (!existingIds.has(r.id)) { existingIds.add(r.id); records.push(r); }
    }

    // Busca direta nas colunas da AQ de origem — sempre executada, independente do OR filter.
    // Cobre incompatibilidade de tipo (real vs text) e formato ("11727" vs "11727.0").
    if (fromAQCode) {
      const sourceCols = AQ_CODE_TO_COLUMNS[fromAQCode] ?? [];
      const numVal = Number(aqNumber);
      // tenta: string original, valor numérico, inteiro arredondado
      const valuesToTry: (string | number)[] = [aqNumber];
      if (!isNaN(numVal)) {
        valuesToTry.push(numVal);
        if (!Number.isInteger(numVal)) valuesToTry.push(Math.round(numVal));
      }
      for (const col of sourceCols) {
        for (const v of valuesToTry) {
          const { data: extra } = await supabase
            .from("registros_producao").select("*").eq(col, v).limit(200);
          for (const r of (extra ?? []) as RegistroRastreavel[]) {
            if (!existingIds.has(r.id)) { existingIds.add(r.id); records.push(r); }
          }
        }
      }
    }

    if (error) toast.error("Erro ao buscar rastreabilidade: " + error.message);
    setAqJourneyRecords(records);
    setAqJourneyLoading(false);
  }, []);

  const selectAQ = useCallback(async (aqCode: string) => {
    setSelectedAQCode(aqCode);
    setSelectedAQNumber(null);
    setAqJourneyRecords([]);
    await loadAQNumbers(aqCode);
  }, [loadAQNumbers]);

  const selectAQNumber = useCallback(async (aqNumber: string) => {
    setSelectedAQNumber(aqNumber);
    await loadAQJourney(aqNumber, selectedAQCode ?? undefined);
  }, [loadAQJourney, selectedAQCode]);

  const handleCustomAQSearch = useCallback(async () => {
    const code = customAQCode.trim().toUpperCase();
    const number = customAQNumber.trim();
    if (!/^AQ\d+$/.test(code)) { toast.error("Digite um código AQ válido (ex: AQ017)"); return; }
    if (!number) { toast.error("Digite o número da AQ"); return; }
    setSelectedAQCode(code);
    setSelectedAQNumber(number);
    await loadAQJourney(number, code);
  }, [customAQCode, customAQNumber, loadAQJourney]);

  const selectedAQInfo = selectedAQCode ? AQ_STAGE_MAP[selectedAQCode] : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-5">

      {/* Cabeçalho */}
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produção</p>
        <h1 className="text-xl font-bold text-foreground">Rastreabilidade</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Navegue pela cadeia produtiva — lotes, origens, destinos e fluxo de processo.
        </p>
      </div>

      {/* Seletor de modo */}
      <div className="flex gap-2 border-b pb-4">
        <Button
          variant={mainTab === "lote" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setMainTab("lote")}
        >
          <Search className="h-3.5 w-3.5" />
          Buscar por Lote / Produto
        </Button>
        <Button
          variant={mainTab === "aq" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setMainTab("aq")}
        >
          <ScanLine className="h-3.5 w-3.5" />
          Navegar por AQ
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA: Buscar por Lote
      ════════════════════════════════════════════════════════════════════════ */}
      {mainTab === "lote" && (
        <>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar lote, OP, pedido, produto, cliente, fornecedor ou AQ..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    className="h-10"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 ml-0.5">
                    Prioridade:{" "}
                    <span className="font-mono">n_lote → op → pedido → produto → cliente → fornecedor → maquina/AQ</span>
                  </p>
                </div>
                <Button onClick={handleSearch} disabled={isLoading || !searchTerm.trim()} className="h-10 gap-2 shrink-0">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
                {(hasSearched || mode === "detail") && (
                  <Button
                    variant="outline"
                    className="h-10 shrink-0"
                    onClick={() => {
                      setSearchTerm(""); setHasSearched(false);
                      setSearchGroups([]); setMode("search");
                      setCurrentGroup(null); setNavStack([]);
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {loadingDetail && (
            <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
          )}

          {hasSearched && searchGroups.length === 0 && mode === "search" && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">Nenhum registro encontrado.</p>
              <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
                Tente buscar pelo número do lote, produto, cliente, fornecedor ou AQ.
              </p>
            </div>
          )}

          {mode === "search" && searchGroups.length > 1 && (
            <SearchResultsView groups={searchGroups} onOpen={handleOpenFromSearch} />
          )}

          {mode === "detail" && currentGroup && !loadingDetail && (
            <DetailView
              group={currentGroup}
              originGroups={originGroups}
              childGroups={childGroups}
              onNavigate={navigateTo}
              onBack={goBack}
              navStack={navStack}
            />
          )}

          {!hasSearched && mode === "search" && (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground/70">Como funciona a rastreabilidade</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <p className="font-medium text-foreground/60 mb-0.5">Rastrear para frente (origem → produto)</p>
                        <p>Busque um lote de matéria-prima e veja quais produtos foram gerados a partir dele.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground/60 mb-0.5">Rastrear para trás (produto → origem)</p>
                        <p>Busque um produto final e veja de qual lote de insumo ele veio.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground/60 mb-0.5">Navegação por AQ</p>
                        <p>Use a aba <strong>Navegar por AQ</strong> para explorar por etapa do processo.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground/60 mb-0.5">Vínculo entre lotes</p>
                        <p>O campo <span className="font-mono bg-muted px-1 rounded">lote_fornecedor</span> conecta um lote ao seu insumo de origem.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA: Navegar por AQ
      ════════════════════════════════════════════════════════════════════════ */}
      {mainTab === "aq" && (
        <div className="space-y-5">

          {/* Painel superior: grid de AQs + busca direta */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Grid de AQs (2/3) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-primary" />
                  Selecione uma AQ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AQSelectGrid selectedAQ={selectedAQCode} onSelect={selectAQ} />
              </CardContent>
            </Card>

            {/* Busca direta (1/3) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Busca direta por número
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Código AQ</label>
                  <Input
                    placeholder="Ex: AQ001"
                    value={customAQCode}
                    onChange={e => setCustomAQCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleCustomAQSearch()}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Número emitido pela AQ</label>
                  <Input
                    placeholder="Ex: 2024-001"
                    value={customAQNumber}
                    onChange={e => setCustomAQNumber(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCustomAQSearch()}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <Button
                  onClick={handleCustomAQSearch}
                  className="w-full h-8 text-sm gap-2"
                  disabled={!customAQCode.trim() || !customAQNumber.trim()}
                >
                  <Search className="h-3.5 w-3.5" />
                  Ver rastreabilidade
                </Button>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Selecione a AQ de origem e informe o número emitido para rastrear o lote por toda a produção.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* PASSO 2: Números únicos emitidos pela AQ selecionada */}
          {selectedAQCode && !selectedAQNumber && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-sm px-3 py-1">{selectedAQCode}</Badge>
                  <div>
                    <p className="font-semibold text-sm">{selectedAQInfo?.nome ?? selectedAQCode}</p>
                    {selectedAQInfo && (
                      <p className="text-xs text-muted-foreground">
                        {SUBPROCESSO_INFO[selectedAQInfo.subprocesso]?.label}
                      </p>
                    )}
                  </div>
                  {!aqNumbersLoading && (
                    <Badge variant="secondary" className="text-xs">
                      {aqNumbers.length} número(s) emitido(s)
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost" size="sm" className="text-xs gap-1"
                  onClick={() => { setSelectedAQCode(null); setAqNumbers([]); setAqNumberSearch(""); setCustomAQCode(""); setCustomAQNumber(""); }}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              </div>

              {aqNumbersLoading ? (
                <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
              ) : aqNumbers.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono font-semibold">{selectedAQCode}</span> não possui números registrados no banco.
                    </p>
                  </div>
                  {(AQ_EMITS_TO[selectedAQCode ?? ""] ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {selectedAQCode} emite para — navegue pelas AQs de destino:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(AQ_EMITS_TO[selectedAQCode ?? ""] ?? []).map(aqCode => {
                          const info = AQ_STAGE_MAP[aqCode];
                          return (
                            <button
                              key={aqCode}
                              onClick={() => selectAQ(aqCode)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs border-border hover:border-primary/50 hover:bg-muted/40 transition-all"
                            >
                              <span className="font-mono font-semibold">{aqCode}</span>
                              <span className="opacity-70">— {info?.nome ?? aqCode}</span>
                              <ArrowRight className="h-3 w-3 opacity-50" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Filtrar números..."
                        value={aqNumberSearch}
                        onChange={e => setAqNumberSearch(e.target.value)}
                        className="h-8 pl-8 text-sm"
                      />
                    </div>
                    {aqNumberSearch && (
                      <span className="text-xs text-muted-foreground">
                        {filteredAQNumbers.length} de {aqNumbers.length}
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-xs">Número AQ</TableHead>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Fornecedor</TableHead>
                          <TableHead className="text-xs text-right">Registros</TableHead>
                          <TableHead className="text-xs w-28"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAQNumbers.map(entry => (
                          <TableRow
                            key={entry.number}
                            className="text-xs cursor-pointer hover:bg-muted/30"
                            onClick={() => selectAQNumber(entry.number)}
                          >
                            <TableCell className="font-mono font-semibold">{entry.number}</TableCell>
                            <TableCell className="text-muted-foreground">{fmtData(entry.date)}</TableCell>
                            <TableCell className="text-muted-foreground">{entry.fornecedor ?? "—"}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{entry.count}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary pointer-events-none">
                                Ver percurso
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PASSO 3: Rastreabilidade completa de um número AQ */}
          {selectedAQCode && selectedAQNumber && (
            <div className="space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground px-2"
                  onClick={() => {
                    setSelectedAQNumber(null);
                    setAqJourneyRecords([]);
                    if (selectedAQCode && aqNumbers.length === 0 && !aqNumbersLoading) {
                      loadAQNumbers(selectedAQCode);
                    }
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {selectedAQInfo?.nome ?? selectedAQCode}
                </Button>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold font-mono">{selectedAQNumber}</span>
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto text-muted-foreground"
                  onClick={() => { setSelectedAQCode(null); setSelectedAQNumber(null); setAqNumbers([]); setAqJourneyRecords([]); setAqNumberSearch(""); setCustomAQCode(""); setCustomAQNumber(""); }}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              </div>

              {/* Card de contexto da AQ de origem */}
              {!aqJourneyLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">AQ de origem</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AQBadge aq={selectedAQCode!} className="text-xs" />
                        <span className="text-sm font-semibold truncate">{selectedAQInfo?.nome ?? selectedAQCode}</span>
                      </div>
                      {selectedAQInfo && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {SUBPROCESSO_INFO[selectedAQInfo.subprocesso]?.label}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Número rastreado</p>
                      <p className="text-xl font-bold font-mono">{selectedAQNumber}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Registros encontrados</p>
                      <p className="text-xl font-bold">{aqJourneyRecords.length}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        em {new Set(aqJourneyRecords.map(r => detectAQ(r)).filter(Boolean)).size} etapa(s)
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Emite para</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(AQ_EMITS_TO[selectedAQCode!] ?? []).map(aq => (
                          <AQBadge key={aq} aq={aq} className="text-xs" />
                        ))}
                        {(AQ_EMITS_TO[selectedAQCode!] ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">Saída final</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {aqJourneyLoading ? (
                <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
              ) : aqJourneyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro encontrado para o número <span className="font-mono font-semibold">{selectedAQNumber}</span>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Registros da própria AQ selecionada — seção prioritária */}
                  {sourceAQRecords.length > 0 && (
                    <Section
                      title={`Registros — ${selectedAQInfo?.nome ?? selectedAQCode}`}
                      icon={ScanLine}
                      badge={String(sourceAQRecords.length)}
                    >
                      <TabelaDetalhada records={sourceAQRecords} />
                    </Section>
                  )}

                  <Section title="Fluxo Produtivo" icon={Activity}>
                    <TimelineFluxo steps={aqJourneyFlow} />
                  </Section>

                </>
              )}
            </div>
          )}

          {/* Estado inicial da aba AQ */}
          {!selectedAQCode && !selectedAQNumber && (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground/70">Como funciona a navegação por AQ</p>
                    <p>1. Selecione uma AQ no grid — o sistema mostrará todos os números únicos emitidos por ela.</p>
                    <p>2. Clique em um número — o sistema rastreará esse número em todas as máquinas da fábrica.</p>
                    <p>3. Veja o percurso completo: quais etapas processaram aquele lote, com timeline e registros detalhados.</p>
                    <p className="mt-1">Ou use a <strong>Busca direta</strong> se você já souber o código AQ e o número.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
