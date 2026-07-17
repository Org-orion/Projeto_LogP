"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, AlertCircle, RefreshCw, Plus, ChevronDown,
  LayoutDashboard, Factory, BarChart3, Workflow, BarChart2,
  Download, X, BadgeCheck, Ruler, ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import EmbalagemPerfilForm from "@/components/EmbalagemPerfilForm";
import { LancarProducaoForm } from "@/components/production/LancarProducaoForm";
import BoletimMensal from "@/components/BoletimMensal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, LabelList,
} from "recharts";
import { format, endOfMonth, startOfWeek, endOfWeek, addWeeks, startOfMonth, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistoricoSheet } from "@/components/production/HistoricoSheet";
import { MaquinaCard } from "@/components/production/MaquinaCard";
import { MetricCard } from "@/components/production/MetricCard";
import { EmptyState } from "@/components/production/EmptyState";
import { SectionHeader } from "@/components/production/SectionHeader";
import { isMaquinaAtiva } from "@/components/production/StatusBadge";
import { MachineTable, type MachineSortKey, type SortDir } from "@/components/production/MachineTable";
import { MachineFilters, type StatusFiltro } from "@/components/production/MachineFilters";
import { SearchToolbar, type ViewMode } from "@/components/production/SearchToolbar";
import ConnectionBadge from "@/components/ConnectionBadge";
import type { Maquina } from "@/components/production/types";

// ── Cores dos KPIs/gráficos (Produção → Visão Geral) ──
// Sempre os tokens reais do tema (globals.css, :root/.dark) — nenhuma paleta
// fixa paralela. Como são strings "hsl(var(--x))", o navegador resolve o valor
// atual a cada repaint, então trocar de tema já atualiza os gráficos sozinho.
const DASH_GREEN  = "hsl(var(--primary))";

const CHART_GRID           = "hsl(var(--border))";
const CHART_AXIS           = "hsl(var(--muted-foreground))";
const CHART_TOOLTIP_BG     = "hsl(var(--popover))";
const CHART_TOOLTIP_TEXT   = "hsl(var(--popover-foreground))";
const CHART_TOOLTIP_BORDER = "hsl(var(--border))";

const KPI_FADE = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const MESES_DASH = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface RowDash {
  maquina:      string | null;
  data:         string;
  linha:        string | null;
  produto:      string | null;
  padrao:       string | null;
  largura_cm:   number | null;
  qtd_conforme: number | null;
}

function pctBarD(pct: number) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div className="w-[70px] h-2 rounded-[3px] overflow-hidden shrink-0 bg-primary/15">
        <div className="h-full rounded-[3px] bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-primary min-w-[50px] text-right">
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

interface DistribuicaoLinha {
  key: string;
  label: string;
  total: number;
  pct: number;
  ativo?: boolean;
}

interface DistribuicaoCardProps {
  icone: LucideIcon;
  titulo: string;
  linhas: DistribuicaoLinha[];
  totalGeral: number;
  onClickLinha?: (key: string) => void;
  verMais?: { expandido: boolean; restante: number; onToggle: () => void };
  vazio: string;
}

// Card de distribuição (Unidade/Padrão/Largura) do dashboard executivo — usa os
// tokens normais do tema (bg-card/border-border), então segue claro no Light
// Mode e escuro no Dark Mode automaticamente, como qualquer outro card do app.
function DistribuicaoCard({ icone: Icone, titulo, linhas, totalGeral, onClickLinha, verMais, vazio }: DistribuicaoCardProps) {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icone size={15} className="text-primary" />
        <p className="text-sm font-semibold">{titulo}</p>
      </div>
      {linhas.length === 0 && !verMais ? (
        <EmptyState icon={Icone} title="Sem dados" description={vazio} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {linhas.map(row => (
                <tr
                  key={row.key}
                  onClick={onClickLinha ? () => onClickLinha(row.key) : undefined}
                  className={cn("transition-colors", onClickLinha ? "cursor-pointer" : "cursor-default", row.ativo && "bg-primary/10")}
                >
                  <td className="py-1.5 text-xs" style={{ fontWeight: row.ativo ? 700 : 400 }}>{row.label}</td>
                  <td className="py-1.5 text-xs text-right font-bold text-primary">{row.total.toLocaleString("pt-BR")}</td>
                  <td className="py-1.5 pl-4">{pctBarD(row.pct)}</td>
                </tr>
              ))}
              {verMais && (
                <tr>
                  <td colSpan={3} className="text-center pt-2">
                    <button onClick={verMais.onToggle} className="text-xs font-medium text-primary hover:underline">
                      {verMais.expandido ? "Ver menos ↑" : `Ver mais (${verMais.restante}) ↓`}
                    </button>
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-primary/25">
                <td className="pt-2 text-xs font-bold">Total</td>
                <td className="pt-2 text-xs text-right font-bold text-primary">{totalGeral.toLocaleString("pt-BR")}</td>
                <td className="pt-2 pl-4 text-xs font-bold text-primary">100,00%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ANOS_DASH = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

type SetorDash = "todos" | "portas" | "guarnicao";

const SETOR_DASH_LABELS: Record<SetorDash, string> = {
  todos:     "Todos",
  portas:    "Portas",
  guarnicao: "Guarnição",
};

const KW_PORTAS_DASH = [
  "embalagem de porta",
  "esquadrejadeira",
  "furação e corte",
  "montagem do kit",
  "prensa fria",
  "colagem de borda",
  "pintura de porta",
  "pintura de tampo",
  "linha de pintura",
];

const KW_GUARNICAO_DASH = [
  "coladeira de alizar",
  "moldureira de aliza",
  "moldureira de batente",
  "recobridora de perfil",
  "embalagem de perfil",
  "unesa",
  "gaidzinski",
];

function getSetorDash(maquina: string): "portas" | "guarnicao" | null {
  const lower = (maquina ?? "").toLowerCase();
  if (KW_PORTAS_DASH.some(k => lower.includes(k))) return "portas";
  if (KW_GUARNICAO_DASH.some(k => lower.includes(k))) return "guarnicao";
  return null;
}

// Seccionadora 1/2 não têm "linha" de produção — usa o produto produzido no
// lugar em "Produção por Linha", em vez de cair num balde "—" genérico.
function chaveLinhaOuProduto(r: { maquina?: string | null; linha?: string | null; produto?: string | null }): string {
  if (/seccionadora/i.test(r.maquina ?? "")) return r.produto || "—";
  return r.linha || r.produto || "—";
}

// A tabela indicadores_producao guarda o setor como texto livre (configurado
// na tela de Metas) — não necessariamente "portas"/"guarnicao". Faz um match
// por palavra-chave em vez de igualdade exata.
function matchSetorLabel(label: string, alvo: "portas" | "guarnicao"): boolean {
  const l = (label ?? "").toLowerCase();
  return alvo === "portas" ? l.includes("porta") : l.includes("guarn");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSemanasMes(ano: number, mes: number): { label: string; inicio: string; fim: string }[] {
  const refMes = new Date(ano, mes - 1, 1);
  const inicio = startOfMonth(refMes);
  const fimMes = endOfMonth(refMes);
  const semanas = [];
  for (let i = 0; i < 5; i++) {
    const seg = startOfWeek(addWeeks(inicio, i), { weekStartsOn: 1 });
    const sex = endOfWeek(seg, { weekStartsOn: 1 });
    if (seg > fimMes) break;
    semanas.push({
      label: `Sem ${i + 1}`,
      inicio: format(seg < inicio ? inicio : seg, "yyyy-MM-dd"),
      fim: format(sex > fimMes ? fimMes : sex, "yyyy-MM-dd"),
    });
  }
  return semanas;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

// "MOLDUREIRA DE ALIZAR X" é o nome canônico cadastrado, mas alguns registros
// de produção foram lançados como "MOLDUREIRA DE ALIZA X" (sem o R final) —
// mapeia a variante pro nome canônico pra não perder produção na agregação.
function buildAliasMap(maquinas: Maquina[]): Record<string, string> {
  const aliasMap: Record<string, string> = {};
  for (const m of maquinas) {
    const n = norm(String(m.nome ?? ""));
    if (n.includes("alizar")) {
      aliasMap[n.replace(/alizar/g, "aliza")] = n;
    }
  }
  return aliasMap;
}

// Período anterior "equivalente" pra comparação: se o mês/ano selecionado é o
// atual (ainda em andamento), o período de comparação não pode ser o mês/ano
// anterior INTEIRO — senão compara N dias decorridos contra o mês/ano cheio,
// o que sempre faz o período atual parecer pior. Nesse caso, trunca o período
// anterior no mesmo dia-do-mês (ou dia-do-ano) de hoje. Se o período
// selecionado já é passado (totalmente encerrado), compara cheio com cheio.
function periodoAnteriorEquivalente(ano: number, mes: number): { inicio: string; fim: string } {
  const hoje = new Date();

  if (mes === 0) {
    // "Todos os meses" = ano inteiro
    const anoAnterior = ano - 1;
    const isAnoAtual = ano === hoje.getFullYear();
    if (!isAnoAtual) {
      return { inicio: `${anoAnterior}-01-01`, fim: `${anoAnterior}-12-31` };
    }
    const fimEquivalente = new Date(anoAnterior, hoje.getMonth(), hoje.getDate());
    return { inicio: `${anoAnterior}-01-01`, fim: format(fimEquivalente, "yyyy-MM-dd") };
  }

  const mAnterior = mes === 1 ? 12 : mes - 1;
  const anoRef = mes === 1 ? ano - 1 : ano;
  const inicio = `${anoRef}-${String(mAnterior).padStart(2, "0")}-01`;

  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  if (!isMesAtual) {
    const fim = format(endOfMonth(new Date(anoRef, mAnterior - 1, 1)), "yyyy-MM-dd");
    return { inicio, fim };
  }

  const diasNoMesAnterior = getDaysInMonth(new Date(anoRef, mAnterior - 1, 1));
  const diaEquivalente = Math.min(hoje.getDate(), diasNoMesAnterior);
  const fim = format(new Date(anoRef, mAnterior - 1, diaEquivalente), "yyyy-MM-dd");
  return { inicio, fim };
}

// ─── Página Principal ─────────────────────────────────────────────────────────

const EMPTY_MAQUINA = { nome: "" };

export default function MaquinasPage({ user }: { user: { perfil?: string } }) {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [producao, setProducao] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ nome: string }>(EMPTY_MAQUINA);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<Maquina | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | null>(null);
  const [editNome, setEditNome] = useState("");
  const [lancamentoMaquina, setLancamentoMaquina] = useState<Maquina | null>(null);
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  // ── Aba Máquinas: período, filtros, visão ──
  const [anoMaq,     setAnoMaq]     = useState(String(new Date().getFullYear()));
  const [mesMaq,     setMesMaq]     = useState(String(new Date().getMonth() + 1));
  const [rawRegistrosMaq, setRawRegistrosMaq] = useState<{ maquina: string | null; data: string | null; qtd_conforme: number | null; linha: string | null }[]>([]);
  const [comparativoMaq, setComparativoMaq] = useState<{ total: number; porMaquina: Record<string, number> } | null>(null);
  const [viewMode,   setViewMode]   = useState<ViewMode>("list");
  const [statusFiltroMaq, setStatusFiltroMaq] = useState<StatusFiltro>("todas");
  const [linhasSelMaq,    setLinhasSelMaq]    = useState<Set<string>>(new Set());
  const [sortByMaq,  setSortByMaq]  = useState<MachineSortKey>("producao");
  const [sortDirMaq, setSortDirMaq] = useState<SortDir>("desc");
  const [pageMaq,     setPageMaq]     = useState(1);
  const [pageSizeMaq, setPageSizeMaq] = useState(25);

  // ── Dashboard states ──
  const [anoD,       setAnoD]       = useState(String(new Date().getFullYear()));
  const [mesD,       setMesD]       = useState(String(new Date().getMonth() + 1));
  const [diasSel,    setDiasSel]    = useState<Set<number>>(new Set());   // vazio = todos
  const [setorD,     setSetorD]     = useState<SetorDash>("todos");
  const [maqsSel,    setMaqsSel]    = useState<Set<string>>(new Set()); // vazio = todas
  const [dashRows,   setDashRows]   = useState<RowDash[]>([]);
  const [dashRowsAno, setDashRowsAno] = useState<RowDash[]>([]); // ano inteiro, p/ tendência mensal
  const [loadingD,   setLoadingD]   = useState(false);
  const [dashErro,   setDashErro]   = useState<string | null>(null);
  // drill-down selections
  const [selMaq,     setSelMaq]     = useState<string | null>(null);
  const [selLinhas,       setSelLinhas]       = useState<Set<string>>(new Set());
  const [selPadrao,       setSelPadrao]       = useState<string | null>(null);
  const [showAllPadrao,   setShowAllPadrao]   = useState(false);
  const [showAllLargura,  setShowAllLargura]  = useState(false);
  const [showAllLinhas,   setShowAllLinhas]   = useState(false);
  const [showAllMaq,      setShowAllMaq]      = useState(false);

  // ── Cabeçalho executivo / KPIs adicionais ──
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [comparativo, setComparativo] = useState<{ total: number; diasComProducao: number } | null>(null);
  const [metaProducao, setMetaProducao] = useState<number | null>(null);

  const canEdit = ["administrador", "supervisor"].includes((user.perfil ?? "").toLowerCase());

  const clearDrill = () => { setSelMaq(null); setSelLinhas(new Set()); setSelPadrao(null); };
  const handleSetorD = (s: SetorDash) => { setSetorD(s); setMaqsSel(new Set()); clearDrill(); };
  const handleAnoD   = (v: string)    => { setAnoD(v);   setDiasSel(new Set()); clearDrill(); };
  const handleMesD   = (v: string)    => { setMesD(v);   setDiasSel(new Set()); clearDrill(); };

  function limparFiltros() {
    setSetorD("todos");
    setAnoD(String(new Date().getFullYear()));
    setMesD(String(new Date().getMonth() + 1));
    setDiasSel(new Set());
    setMaqsSel(new Set());
    clearDrill();
  }

  // Seleções independentes — cada uma filtra as demais dimensões
  const clickMaq    = (orig: string) => setSelMaq(p    => p    === orig ? null : orig);
  const clickLinha  = (l: string, multi = false) => setSelLinhas(prev => {
    const next = new Set(prev);
    if (multi) {
      if (next.has(l)) next.delete(l); else next.add(l);
    } else {
      if (next.size === 1 && next.has(l)) next.clear();
      else { next.clear(); next.add(l); }
    }
    return next;
  });
  const clickPadrao = (pad: string)  => setSelPadrao(p => p    === pad  ? null : pad);

  const semanas = getSemanasMes(Number(anoMaq), Number(mesMaq));
  const dashReqRef = useRef(0);

  const buscarDash = useCallback(async () => {
    dashReqRef.current += 1;
    const myReq = dashReqRef.current;
    setLoadingD(true);
    setDashErro(null);
    const mm = String(Number(mesD)).padStart(2, "0");
    const inicio = mesD === "0" ? `${anoD}-01-01` : `${anoD}-${mm}-01`;
    const fim    = mesD === "0" ? `${anoD}-12-31`
      : format(endOfMonth(new Date(Number(anoD), Number(mesD) - 1, 1)), "yyyy-MM-dd");
    const TAM = 1000;
    let pagina = 0;
    const todas: RowDash[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina,data,linha,produto,padrao,largura_cm,qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: true })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (myReq !== dashReqRef.current) return;
      if (error) {
        setDashErro(`Erro Supabase: ${error.message} (código: ${error.code})`);
        break;
      }
      if (!data || data.length === 0) break;
      todas.push(...(data as RowDash[]));
      if (data.length < TAM) break;
      pagina++;
    }
    if (myReq !== dashReqRef.current) return;
    setDashRows(todas);
    setLoadingD(false);
    setLastSyncedAt(new Date());
  }, [anoD, mesD]);

  useEffect(() => { void buscarDash(); }, [buscarDash]);

  // ── Ano inteiro (independente do filtro de Mês/Dia) — alimenta só o card
  // "Produção Mensal", que precisa de uma tendência de 12 meses mesmo quando
  // um mês específico está selecionado nos demais filtros. ──
  const dashAnoReqRef = useRef(0);
  const buscarDashAno = useCallback(async () => {
    dashAnoReqRef.current += 1;
    const myReq = dashAnoReqRef.current;
    const inicio = `${anoD}-01-01`;
    const fim = `${anoD}-12-31`;
    const TAM = 1000;
    let pagina = 0;
    const todas: RowDash[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina,data,linha,produto,padrao,largura_cm,qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: true })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (myReq !== dashAnoReqRef.current) return;
      if (error || !data || data.length === 0) break;
      todas.push(...(data as RowDash[]));
      if (data.length < TAM) break;
      pagina++;
    }
    if (myReq !== dashAnoReqRef.current) return;
    setDashRowsAno(todas);
  }, [anoD]);

  useEffect(() => { void buscarDashAno(); }, [buscarDashAno]);

  // ── Comparativo com o período anterior equivalente (mesma tabela, leitura extra) ──
  const comparativoReqRef = useRef(0);
  const buscarComparativo = useCallback(async () => {
    comparativoReqRef.current += 1;
    const myReq = comparativoReqRef.current;

    const { inicio, fim } = periodoAnteriorEquivalente(Number(anoD), Number(mesD));

    const TAM = 1000;
    let pagina = 0;
    const todas: { maquina: string | null; data: string; qtd_conforme: number | null }[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina,data,qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: true })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (myReq !== comparativoReqRef.current) return;
      if (error || !data || data.length === 0) break;
      todas.push(...data);
      if (data.length < TAM) break;
      pagina++;
    }
    if (myReq !== comparativoReqRef.current) return;

    const filtradas = setorD === "todos" ? todas : todas.filter(r => getSetorDash(r.maquina ?? "") === setorD);
    const total = filtradas.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
    const diasComProducao = new Set(filtradas.filter(r => (r.qtd_conforme ?? 0) > 0).map(r => r.data)).size;
    setComparativo({ total, diasComProducao });
  }, [anoD, mesD, setorD]);

  useEffect(() => { void buscarComparativo(); }, [buscarComparativo]);

  // ── Meta de produção (indicadores_producao), definida na tela de Metas ──
  const buscarMeta = useCallback(async () => {
    let query = supabase.from("indicadores_producao").select("meta_producao, setor, mes");
    query = mesD === "0"
      ? query.gte("mes", `${anoD}-01-01`).lt("mes", `${Number(anoD) + 1}-01-01`)
      : query.eq("mes", `${anoD}-${String(Number(mesD)).padStart(2, "0")}-01`);

    const { data, error } = await query;
    if (error || !data) { setMetaProducao(null); return; }

    const relevantes = setorD === "todos" ? data : data.filter(r => matchSetorLabel(r.setor ?? "", setorD));
    const soma = relevantes.reduce((s, r) => s + (Number(r.meta_producao) || 0), 0);
    setMetaProducao(relevantes.length > 0 ? soma : null);
  }, [anoD, mesD, setorD]);

  useEffect(() => { void buscarMeta(); }, [buscarMeta]);

  const fetchDados = useCallback(async (setSpin: (v: boolean) => void) => {
    setSpin(true);
    setErro(null);

    const ano = Number(anoMaq);
    const mes = Number(mesMaq);
    const refMes = new Date(ano, mes - 1, 1);
    const dataInicio = format(startOfMonth(refMes), "yyyy-MM-dd");
    const dataFim    = format(endOfMonth(refMes), "yyyy-MM-dd");
    const semanasAtual = getSemanasMes(ano, mes);

    const { data: maquinasData, error: err1 } = await supabase.from("maquinas").select("*").order("nome");
    if (err1) { setErro(err1.message); setSpin(false); return; }
    setMaquinas(maquinasData ?? []);
    const aliasMap = buildAliasMap(maquinasData ?? []);

    type Registro = { maquina: string | null; data: string | null; qtd_conforme: number | null; linha: string | null };
    const registros: Registro[] = [];
    const TAM_PAG = 1000;
    let pagina = 0;
    while (true) {
      const { data: lote, error: err2 } = await supabase
        .from("registros_producao")
        .select("maquina, data, qtd_conforme, linha")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true })
        .range(pagina * TAM_PAG, (pagina + 1) * TAM_PAG - 1);
      if (err2) { setErro(err2.message); setSpin(false); return; }
      if (!lote || lote.length === 0) break;
      registros.push(...lote);
      if (lote.length < TAM_PAG) break;
      pagina++;
    }

    setRawRegistrosMaq(registros);

    const mapa: Record<string, Record<string, number>> = {};
    for (const r of registros) {
      if (!r.maquina || !r.data) continue;
      const data = r.data;
      const raw = norm(r.maquina);
      const chave = aliasMap[raw] ?? raw;
      const qtd = Number(r.qtd_conforme) || 0;
      const semana = semanasAtual.find((s) => data >= s.inicio && data <= s.fim);
      if (!semana) continue;
      if (!mapa[chave]) mapa[chave] = {};
      mapa[chave][semana.label] = (mapa[chave][semana.label] ?? 0) + qtd;
    }

    setProducao(mapa);
    setSpin(false);
  }, [anoMaq, mesMaq]);

  useEffect(() => { fetchDados(setLoading); }, [fetchDados]);

  // ── Comparativo com o período anterior (aba Máquinas) — mesmo padrão de
  // buscarComparativo (Visão Geral), leitura extra só de maquina/qtd_conforme. ──
  const comparativoMaqReqRef = useRef(0);
  const buscarComparativoMaq = useCallback(async () => {
    comparativoMaqReqRef.current += 1;
    const myReq = comparativoMaqReqRef.current;

    const { inicio, fim } = periodoAnteriorEquivalente(Number(anoMaq), Number(mesMaq));

    const TAM = 1000;
    let pagina = 0;
    const todas: { maquina: string | null; qtd_conforme: number | null }[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina, qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: true })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (myReq !== comparativoMaqReqRef.current) return;
      if (error || !data || data.length === 0) break;
      todas.push(...data);
      if (data.length < TAM) break;
      pagina++;
    }
    if (myReq !== comparativoMaqReqRef.current) return;

    const porMaquina: Record<string, number> = {};
    let total = 0;
    for (const r of todas) {
      const qtd = Number(r.qtd_conforme) || 0;
      total += qtd;
      if (r.maquina) {
        const chave = norm(r.maquina);
        porMaquina[chave] = (porMaquina[chave] ?? 0) + qtd;
      }
    }
    setComparativoMaq({ total, porMaquina });
  }, [anoMaq, mesMaq]);

  useEffect(() => { void buscarComparativoMaq(); }, [buscarComparativoMaq]);

  function abrirEdicao(m: Maquina) {
    setEditMaquina(m);
    setEditNome((m.nome as string) ?? "");
    setEditDialogOpen(true);
  }

  async function salvarEdicao() {
    if (!editNome.trim()) {
      toast.error("Informe o nome da máquina.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("maquinas")
      .update({ nome: editNome.trim() })
      .eq("id", editMaquina!.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Nome atualizado com sucesso.");
    setEditDialogOpen(false);
    setEditMaquina(null);
    fetchDados(setSyncing);
  }

  async function salvarMaquina() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da máquina.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("maquinas").insert({ nome: form.nome.trim() });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Máquina adicionada com sucesso.");
    setDialogOpen(false);
    setForm(EMPTY_MAQUINA);
    fetchDados(setSyncing);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerCustom />
      </div>
    );
  }

  if (erro) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Erro ao carregar a produção"
        description={erro}
      />
    );
  }

  if (maquinas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma máquina cadastrada"
        description="Adicione uma máquina para começar a acompanhar a produção."
      />
    );
  }

  // ── Derivados: aba Máquinas ──
  const totalAtivas = maquinas.filter((m) => isMaquinaAtiva(m.status as string | undefined)).length;
  const totalInativas = maquinas.length - totalAtivas;

  const totalGeralMaq = rawRegistrosMaq.reduce((s, r) => s + (Number(r.qtd_conforme) || 0), 0);

  const aliasMapMaq = buildAliasMap(maquinas);
  const producaoPorMaquinaMap: Record<string, number> = {};
  const linhasPorMaquinaMap: Record<string, Set<string>> = {};
  for (const r of rawRegistrosMaq) {
    if (!r.maquina) continue;
    const raw = norm(r.maquina);
    const chave = aliasMapMaq[raw] ?? raw;
    producaoPorMaquinaMap[chave] = (producaoPorMaquinaMap[chave] ?? 0) + (Number(r.qtd_conforme) || 0);
    if (r.linha) {
      if (!linhasPorMaquinaMap[chave]) linhasPorMaquinaMap[chave] = new Set();
      linhasPorMaquinaMap[chave].add(r.linha);
    }
  }

  const linhasDisponiveisMaq = Array.from(
    new Set(rawRegistrosMaq.map((r) => r.linha).filter((l): l is string => !!l)),
  ).sort();

  const mediaPorMaquina = (() => {
    const comProducao = Object.values(producaoPorMaquinaMap).filter((v) => v > 0).length;
    return comProducao > 0 ? Math.round(totalGeralMaq / comProducao) : 0;
  })();

  const deltaGeralMaq = comparativoMaq && comparativoMaq.total > 0
    ? ((totalGeralMaq - comparativoMaq.total) / comparativoMaq.total) * 100
    : null;

  // Uma linha por máquina: produção, participação %, sparkline semanal e Δ% vs período anterior
  const linhasTabelaMaq = maquinas.map((m) => {
    const chave = norm(m.nome ?? "");
    const chaveAlias = chave.replace(/alizar/g, "aliza");
    const producaoTotal = producaoPorMaquinaMap[chave] ?? 0;
    const participacaoPct = totalGeralMaq > 0 ? (producaoTotal / totalGeralMaq) * 100 : 0;
    const producaoAnterior = comparativoMaq?.porMaquina[chave] ?? comparativoMaq?.porMaquina[chaveAlias] ?? 0;
    const deltaPct = producaoAnterior > 0 ? ((producaoTotal - producaoAnterior) / producaoAnterior) * 100 : null;
    const dadosSemana = producao[chave] ?? {};
    const sparklineData = semanas.map((s) => ({ value: dadosSemana[s.label] ?? 0 }));
    return {
      maquina: m,
      producaoTotal,
      participacaoPct,
      deltaPct,
      sparklineData,
      linhasDaMaquina: linhasPorMaquinaMap[chave] ?? new Set<string>(),
    };
  });

  const linhasFiltradasMaq = linhasTabelaMaq.filter((r) => {
    const ativa = isMaquinaAtiva(r.maquina.status as string | undefined);
    if (statusFiltroMaq === "ativas" && !ativa) return false;
    if (statusFiltroMaq === "inativas" && ativa) return false;
    if (linhasSelMaq.size > 0) {
      const temAlguma = Array.from(linhasSelMaq).some((l) => r.linhasDaMaquina.has(l));
      if (!temAlguma) return false;
    }
    const termo = norm(busca);
    if (termo) {
      const nomeMatch = norm(r.maquina.nome ?? "").includes(termo);
      const linhaMatch = Array.from(r.linhasDaMaquina).some((l) => norm(l).includes(termo));
      if (!nomeMatch && !linhaMatch) return false;
    }
    return true;
  });

  const linhasOrdenadasMaq = [...linhasFiltradasMaq].sort((a, b) => {
    let cmp = 0;
    if (sortByMaq === "nome") cmp = (a.maquina.nome ?? "").localeCompare(b.maquina.nome ?? "");
    else if (sortByMaq === "producao") cmp = a.producaoTotal - b.producaoTotal;
    else if (sortByMaq === "tendencia") cmp = (a.deltaPct ?? -Infinity) - (b.deltaPct ?? -Infinity);
    else if (sortByMaq === "status") {
      cmp = Number(isMaquinaAtiva(a.maquina.status as string | undefined)) - Number(isMaquinaAtiva(b.maquina.status as string | undefined));
    }
    return sortDirMaq === "asc" ? cmp : -cmp;
  });

  const totalPaginasMaq = Math.max(1, Math.ceil(linhasOrdenadasMaq.length / pageSizeMaq));
  const paginaAtualMaq = Math.min(pageMaq, totalPaginasMaq);
  const linhasPaginaMaq = linhasOrdenadasMaq.slice((paginaAtualMaq - 1) * pageSizeMaq, paginaAtualMaq * pageSizeMaq);

  const destaqueAlta = [...linhasFiltradasMaq].filter((r) => r.producaoTotal > 0).sort((a, b) => b.producaoTotal - a.producaoTotal)[0];
  const destaqueQueda = [...linhasFiltradasMaq]
    .filter((r) => r.deltaPct !== null && r.deltaPct <= -15)
    .sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))[0];

  function toggleLinhaMaq(l: string) {
    setPageMaq(1);
    setLinhasSelMaq((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l); else next.add(l);
      return next;
    });
  }

  function limparFiltrosMaq() {
    setStatusFiltroMaq("todas");
    setLinhasSelMaq(new Set());
    setAnoMaq(String(new Date().getFullYear()));
    setMesMaq(String(new Date().getMonth() + 1));
    setBusca("");
    setPageMaq(1);
  }

  function handleSortMaq(key: MachineSortKey) {
    setPageMaq(1);
    if (sortByMaq === key) {
      setSortDirMaq((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortByMaq(key);
      setSortDirMaq(key === "nome" ? "asc" : "desc");
    }
  }

  function handleSortChangeMaq(key: MachineSortKey, dir: SortDir) {
    setPageMaq(1);
    setSortByMaq(key);
    setSortDirMaq(dir);
  }

  function getLancarAction(m: Maquina) {
    return () => setLancamentoMaquina(m);
  }

  // ── Cálculos do Dashboard — filtro facetado ──
  const dashPorSetor = setorD === "todos"
    ? dashRows
    : dashRows.filter(r => getSetorDash(r.maquina ?? "") === setorD);

  const dashComDia = diasSel.size === 0
    ? dashPorSetor
    : dashPorSetor.filter(r => diasSel.has(Number(r.data.slice(8, 10))));

  const dashFiltrados = maqsSel.size === 0
    ? dashComDia
    : dashComDia.filter(r => maqsSel.has(r.maquina ?? ""));

  // Helpers de filtro por dimensão
  const byMaq    = (r: RowDash) => !selMaq    || (r.maquina ?? "")    === selMaq;
  const byLinha  = (r: RowDash) => selLinhas.size === 0 || selLinhas.has(chaveLinhaOuProduto(r));
  const byPadrao = (r: RowDash) => !selPadrao || (r.padrao  || "—")   === selPadrao;

  // KPIs — aplica todos os filtros de clique (máquina, linha, padrão)
  const ctxKpi = dashFiltrados.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const totalDash = ctxKpi.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const diasComProducao = new Set(ctxKpi.filter(r => (r.qtd_conforme ?? 0) > 0).map(r => r.data)).size;
  const mediaDiaria = diasComProducao > 0 ? Math.round(totalDash / diasComProducao) : 0;

  // Gráfico de máquinas: vê todas as máquinas, filtrado por linha + padrão
  // (a própria dimensão máquina NÃO filtra seu próprio gráfico — selMaq só destaca)
  const ctxMaqChart = dashFiltrados.filter(r => byLinha(r) && byPadrao(r));
  const totalMaq = ctxMaqChart.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashMaqMap: Record<string, number> = {};
  for (const r of ctxMaqChart) {
    const m = r.maquina ?? "—";
    dashMaqMap[m] = (dashMaqMap[m] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorMaquinaAll = Object.entries(dashMaqMap)
    .map(([orig, total]) => ({ maquina: orig.toUpperCase(), orig, total, pct: totalMaq > 0 ? (total / totalMaq) * 100 : 0 }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const dashPorMaquina = showAllMaq ? dashPorMaquinaAll : dashPorMaquinaAll.slice(0, 10);

  // Gráfico mensal: sempre a tendência do ano inteiro (dashRowsAno, busca própria
  // que ignora Mês/Dia — não fazem sentido para uma tendência anual), mas ainda
  // respeitando Unidade/Máquina/Linha/Padrão como os demais cards.
  const ctxDaily = dashRowsAno.filter(r =>
    (setorD === "todos" || getSetorDash(r.maquina ?? "") === setorD) &&
    (maqsSel.size === 0 || maqsSel.has(r.maquina ?? "")) &&
    byMaq(r) && byLinha(r) && byPadrao(r)
  );
  const _MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const dashMesMap: Record<string, number> = {};
  for (let m = 1; m <= 12; m++) {
    dashMesMap[`${anoD}-${String(m).padStart(2, "0")}`] = 0;
  }
  for (const r of ctxDaily) {
    const mes = r.data.slice(0, 7); // "2026-05"
    dashMesMap[mes] = (dashMesMap[mes] ?? 0) + (r.qtd_conforme ?? 0);
  }
  // Limite: ano atual → nunca passa do mês corrente (meses futuros não têm
  // produção ainda, então não devem aparecer); ano passado → até o último mês com dados.
  const _agora = new Date();
  const anoAtualStr = String(_agora.getFullYear());
  const mesAtualKey = `${anoD}-${String(_agora.getMonth() + 1).padStart(2, "0")}`;
  const ultimoDashKey = Object.entries(dashMesMap)
    .filter(([, v]) => v > 0).map(([k]) => k).sort().pop() ?? "";
  const limiteDashKey = anoD === anoAtualStr ? mesAtualKey : (ultimoDashKey || `${anoD}-12`);
  const dashPorDia = Object.entries(dashMesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([key]) => key <= limiteDashKey)
    .map(([mes, total]) => {
      const [ano, mm] = mes.split("-");
      return { label: `${_MESES_PT[Number(mm) - 1]}/${ano.slice(2)}`, mesKey: mes, total };
    });

  // Tabela Linha: filtrada por máquina + padrão (não pela própria linha)
  const ctxLinha = dashFiltrados.filter(r => byMaq(r) && byPadrao(r));
  const total1 = ctxLinha.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashLinhaMap: Record<string, number> = {};
  for (const r of ctxLinha) {
    const l = chaveLinhaOuProduto(r);
    dashLinhaMap[l] = (dashLinhaMap[l] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorLinha = Object.entries(dashLinhaMap)
    .map(([linha, total]) => ({ linha, total, pct: total1 > 0 ? (total / total1) * 100 : 0 }))
    .filter(x => x.total > 0 && x.linha !== "—")
    .sort((a, b) => b.total - a.total);
  // "Produção por Linha" mostra só essas por padrão; as demais ficam atrás do "ver mais".
  const LINHAS_PRODUCAO_DESTAQUE = ["Essenziale", "Innovazione", "Sofisticato"];
  const dashPorLinhaDestaque = dashPorLinha.filter(x => LINHAS_PRODUCAO_DESTAQUE.some(l => l.toLowerCase() === x.linha.toLowerCase()));
  const dashPorLinhaDemais = dashPorLinha.filter(x => !LINHAS_PRODUCAO_DESTAQUE.some(l => l.toLowerCase() === x.linha.toLowerCase()));


  // Tabela Padrão: filtrada por máquina + linha (não pelo próprio padrão)
  const ctxPadrao = dashFiltrados.filter(r => byMaq(r) && byLinha(r));
  const total2 = ctxPadrao.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashPadraoMap: Record<string, number> = {};
  for (const r of ctxPadrao) {
    const p = r.padrao || "—";
    dashPadraoMap[p] = (dashPadraoMap[p] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorPadrao = Object.entries(dashPadraoMap)
    .map(([padrao, total]) => ({ padrao, total, pct: total2 > 0 ? (total / total2) * 100 : 0 }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // Tabela Largura: todas as dimensões
  const ctxLargura = dashFiltrados.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const total3 = ctxLargura.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashLargMap: Record<string, number> = {};
  for (const r of ctxLargura) {
    const l = r.largura_cm != null ? String(r.largura_cm) : "—";
    dashLargMap[l] = (dashLargMap[l] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorLargura = Object.entries(dashLargMap)
    .map(([largura, total]) => ({ largura, total, pct: total3 > 0 ? (total / total3) * 100 : 0 }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // máquinas e linhas disponíveis para filtro do dashboard
  const maqsDash = Array.from(new Set(dashPorSetor.map(r => r.maquina ?? ""))).filter(Boolean).sort();
  const linhasDash = Array.from(new Set(dashPorSetor.map(r => chaveLinhaOuProduto(r)).filter(l => l && l !== "—"))).sort();

  const temSelecao = !!(selMaq || selLinhas.size > 0 || selPadrao);

  // Produção por Unidade (Portas/Guarnição) — ignora o próprio filtro de Unidade
  // (senão a distribuição colapsaria pra uma linha só), mas respeita dia/máquina/linha/padrão.
  const dashSemUnidadeDia = diasSel.size === 0 ? dashRows : dashRows.filter(r => diasSel.has(Number(r.data.slice(8, 10))));
  const dashSemUnidadeMaq = maqsSel.size === 0 ? dashSemUnidadeDia : dashSemUnidadeDia.filter(r => maqsSel.has(r.maquina ?? ""));
  const ctxUnidade = dashSemUnidadeMaq.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const total4 = ctxUnidade.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashUnidadeMap: Record<string, number> = {};
  for (const r of ctxUnidade) {
    const s = getSetorDash(r.maquina ?? "");
    const label = s === "portas" ? "Portas" : s === "guarnicao" ? "Guarnição" : "Outros";
    dashUnidadeMap[label] = (dashUnidadeMap[label] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorUnidade = Object.entries(dashUnidadeMap)
    .map(([unidade, total]) => ({ unidade, total, pct: total4 > 0 ? (total / total4) * 100 : 0 }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);

  // Período legível pro cabeçalho executivo
  const periodoLabel = mesD === "0"
    ? `Ano de ${anoD}`
    : diasSel.size === 1
      ? `${[...diasSel][0]} de ${MESES_DASH[Number(mesD) - 1]} de ${anoD}`
      : diasSel.size > 1
        ? `${diasSel.size} dias · ${MESES_DASH[Number(mesD) - 1]}/${anoD}`
        : `${MESES_DASH[Number(mesD) - 1]} de ${anoD}`;

  // Comparação com período anterior + meta de produção
  const prevTotal = comparativo?.total ?? null;
  const prevMedia = comparativo && comparativo.diasComProducao > 0
    ? Math.round(comparativo.total / comparativo.diasComProducao) : null;
  const deltaTotal = prevTotal && prevTotal > 0 ? ((totalDash - prevTotal) / prevTotal) * 100 : null;
  const deltaMedia = prevMedia && prevMedia > 0 ? ((mediaDiaria - prevMedia) / prevMedia) * 100 : null;
  const metaPct = metaProducao && metaProducao > 0 ? (totalDash / metaProducao) * 100 : null;
  const sparklineTotal = dashPorDia.slice(-12).map(d => ({ value: d.total }));

  function exportarExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Período", periodoLabel],
      ["Produção Total", totalDash],
      ["Média de Produção Diária", mediaDiaria],
      ["Meta de Produção", metaProducao ?? "Não definida"],
      ["Meta Atingida (%)", metaPct !== null ? metaPct.toFixed(1) : "—"],
      ["Linhas Ativas", dashPorLinha.length],
    ]), "KPIs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Unidade", "Quantidade", "%"],
      ...dashPorUnidade.map(r => [r.unidade, r.total, r.pct.toFixed(2)]),
    ]), "Por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Padrão", "Quantidade", "%"],
      ...dashPorPadrao.map(r => [r.padrao, r.total, r.pct.toFixed(2)]),
    ]), "Por Padrão");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Largura (cm)", "Quantidade", "%"],
      ...dashPorLargura.map(r => [r.largura, r.total, r.pct.toFixed(2)]),
    ]), "Por Largura");
    const sufixoMes = mesD !== "0" ? `-${String(Number(mesD)).padStart(2, "0")}` : "";
    XLSX.writeFile(wb, `producao-visao-geral-${anoD}${sufixoMes}.xlsx`);
  }

  return (
    <div className="w-full space-y-5">

      <SectionHeader
        title="Produção"
        description="Acompanhe os indicadores de produção e o catálogo de máquinas da fábrica."
      />

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="visao-geral" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />Visão Geral
          </TabsTrigger>
          <TabsTrigger value="maquinas" className="gap-1.5">
            <Factory className="h-3.5 w-3.5" />Máquinas
          </TabsTrigger>
          <TabsTrigger value="boletim" className="gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />Boletim
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════ ABA: VISÃO GERAL (chrome da página segue o tema normal do app; só os cartões analíticos abaixo são escuros) ══════════════════ */}
        <TabsContent value="visao-geral" className="mt-4 space-y-6">
          {/* Cabeçalho executivo — chrome normal da página */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Produção</h2>
              <p className="text-sm mt-1 text-muted-foreground">
                Acompanhe em tempo real os indicadores e a performance da produção.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <span className="px-3 py-1.5 rounded-lg font-medium bg-card border border-border">
                {periodoLabel}
              </span>
              <Button size="sm" variant="outline" onClick={exportarExcel} className="h-8 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
              <span>
                Última sincronização: {lastSyncedAt ? format(lastSyncedAt, "HH:mm:ss") : "—"}
              </span>
              <ConnectionBadge />
            </div>
          </div>

          {/* KPIs — cartões analíticos individuais (estilo Grafana/Power BI) */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <motion.div variants={KPI_FADE}>
              <MetricCard
                dark icon={BarChart3} iconColor={DASH_GREEN}
                label="Produção Total"
                value={loadingD ? "…" : totalDash.toLocaleString("pt-BR")}
                trend={loadingD ? undefined : deltaTotal}
                hint="vs. período anterior"
                sparkline={sparklineTotal}
              />
            </motion.div>
            <motion.div variants={KPI_FADE}>
              <MetricCard
                dark icon={BarChart3} iconColor={DASH_GREEN}
                label="Média de Produção"
                value={loadingD ? "…" : mediaDiaria.toLocaleString("pt-BR")}
                trend={loadingD ? undefined : deltaMedia}
                hint="peças / dia"
              />
            </motion.div>
            <motion.div variants={KPI_FADE}>
              <MetricCard
                dark icon={Workflow} iconColor={DASH_GREEN}
                label="Linhas Ativas"
                value={loadingD ? "…" : dashPorLinha.length}
                hint="produzindo no período"
              />
            </motion.div>
          </motion.div>

          {/* Barra de filtros — chrome normal da página (não é um componente analítico) */}
          <div className="rounded-xl p-3 flex flex-wrap items-end gap-3 bg-card border border-border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unidade</Label>
              <Select value={setorD} onValueChange={(v) => handleSetorD(v as SetorDash)}>
                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["todos", "portas", "guarnicao"] as SetorDash[]).map(s => (
                    <SelectItem key={s} value={s}>{SETOR_DASH_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Linha</Label>
              {(() => {
                const nenhuma = selLinhas.size === 0;
                const labelBtn = nenhuma ? "Todas" : `${selLinhas.size} linha${selLinhas.size > 1 ? "s" : ""}`;
                const toggleLinhaFiltro = (l: string) => {
                  setSelLinhas(prev => {
                    const next = new Set(prev);
                    if (next.has(l)) next.delete(l); else next.add(l);
                    return next;
                  });
                };
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 text-xs w-36 border border-input rounded-md px-2 flex items-center justify-between text-foreground bg-transparent"
                      >
                        <span className="truncate">{labelBtn}</span>
                        <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-56" align="start">
                      <div className="max-h-72 overflow-y-auto text-xs">
                        {linhasDash.map(l => (
                          <label key={l} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selLinhas.has(l)}
                              onChange={() => toggleLinhaFiltro(l)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="leading-tight">{l}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select value={anoD} onValueChange={handleAnoD}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANOS_DASH.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={mesD} onValueChange={handleMesD}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  {MESES_DASH.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mesD !== "0" && <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dia</Label>
              {(() => {
                const totalDias = getDaysInMonth(new Date(Number(anoD), Number(mesD) - 1, 1));
                const nomeMes = MESES_DASH[Number(mesD) - 1].toLowerCase();
                const todosSel = diasSel.size === 0;
                const labelBtn = todosSel ? "Todos" : `${diasSel.size} dia${diasSel.size > 1 ? "s" : ""}`;

                const toggleTodos = () => { setDiasSel(new Set()); clearDrill(); };
                const toggleDia = (d: number) => {
                  setDiasSel(prev => {
                    const next = new Set(prev);
                    if (next.has(d)) next.delete(d); else next.add(d);
                    return next;
                  });
                  clearDrill();
                };

                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 text-xs w-28 border border-input rounded-md px-2 flex items-center justify-between text-foreground bg-transparent"
                      >
                        <span className="truncate">{labelBtn}</span>
                        <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-44" align="start">
                      <div className="max-h-72 overflow-y-auto text-xs">
                        <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                          <input type="checkbox" checked={todosSel} onChange={toggleTodos} className="h-3.5 w-3.5 accent-primary" />
                          <span>Selecionar todos</span>
                        </label>
                        <div className="border-t border-border my-0.5" />
                        <div className="px-3 py-1 font-medium text-xs text-muted-foreground">{nomeMes}</div>
                        {Array.from({ length: totalDias }, (_, i) => i + 1).map(d => (
                          <label key={d} className="flex items-center gap-2 px-5 py-0.5 hover:bg-accent cursor-pointer">
                            <input
                              type="checkbox"
                              checked={todosSel || diasSel.has(d)}
                              onChange={() => toggleDia(d)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Máquina</Label>
              {(() => {
                const todasExpl = maqsSel.size === maqsDash.length && maqsDash.length > 0;
                const nenhuma   = maqsSel.size === 0;
                const labelBtn  = nenhuma ? "Todas" : `${maqsSel.size} máq.`;
                const toggleTodas = () => {
                  if (todasExpl || !nenhuma) { setMaqsSel(new Set()); }
                  else { setMaqsSel(new Set(maqsDash)); }
                  clearDrill();
                };
                const toggleMaq = (m: string) => {
                  setMaqsSel(prev => {
                    const next = new Set(prev);
                    if (next.has(m)) next.delete(m); else next.add(m);
                    return next;
                  });
                  clearDrill();
                };
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 text-xs w-40 border border-input rounded-md px-2 flex items-center justify-between text-foreground bg-transparent"
                      >
                        <span className="truncate">{labelBtn}</span>
                        <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64" align="start">
                      <div className="max-h-72 overflow-y-auto text-xs">
                        <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                          <input type="checkbox" checked={todasExpl} onChange={toggleTodas} className="h-3.5 w-3.5 accent-primary" />
                          <span>Selecionar todas</span>
                        </label>
                        <div className="border-t border-border my-0.5" />
                        {maqsDash.map(m => (
                          <label key={m} className="flex items-center gap-2 px-3 py-1 hover:bg-accent cursor-pointer">
                            <input
                              type="checkbox"
                              checked={maqsSel.has(m)}
                              onChange={() => toggleMaq(m)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="leading-tight">{m}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>

            <Button size="sm" variant="outline" onClick={() => buscarDash()} disabled={loadingD} className="h-8 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingD ? "animate-spin" : ""}`} />
              {loadingD ? "Carregando..." : "Atualizar"}
            </Button>

            <Button size="sm" variant="ghost" onClick={limparFiltros} className="h-8 gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          </div>

          {temSelecao && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>Filtro ativo:</span>
              {selMaq && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-primary text-primary-foreground">
                  {selMaq.toUpperCase()}
                  <button onClick={() => { setSelMaq(null); setSelLinhas(new Set()); setSelPadrao(null); }} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                </span>
              )}
              {selLinhas.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-primary/80 text-primary-foreground">
                  {selLinhas.size === 1 ? `Linha: ${[...selLinhas][0]}` : `Linhas (${selLinhas.size})`}
                  <button onClick={() => { setSelLinhas(new Set()); setSelPadrao(null); }} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                </span>
              )}
              {selPadrao && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-primary/60 text-primary-foreground">
                  Padrão: {selPadrao}
                  <button onClick={() => setSelPadrao(null)} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                </span>
              )}
              <button onClick={clearDrill} className="underline hover:text-foreground">Limpar tudo</button>
            </div>
          )}

          {dashErro && (
            <div className="rounded-md border px-4 py-3 text-xs font-mono border-destructive/30 bg-destructive/10 text-destructive">
              {dashErro}
            </div>
          )}

          {loadingD ? (
            <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
          ) : (
            <>
                {/* Gráficos principais — 60/40, cartões que seguem o tema (claro/escuro) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                  {/* Produção por Máquina — 60% */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="lg:col-span-3">
                    <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Workflow size={15} className="text-primary" />
                        <p className="text-sm font-semibold">Produção por Máquina</p>
                        <span className="text-xs opacity-60 text-muted-foreground">(clique para filtrar)</span>
                      </div>
                      {dashPorMaquina.length === 0 ? (
                        <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum registro para o período e filtros selecionados." />
                      ) : (
                        <>
                          {(() => {
                            const linhasVisiveis = dashPorMaquina.map(r => ({
                              ...r,
                              rotulo: `${r.total.toLocaleString("pt-BR")} · ${r.pct.toFixed(0)}%`,
                            }));
                            return (
                              <ResponsiveContainer width="100%" height={Math.max(180, linhasVisiveis.length * 40)}>
                                <BarChart
                                  layout="vertical"
                                  data={linhasVisiveis}
                                  margin={{ top: 0, right: 56, left: 8, bottom: 0 }}
                                  barSize={20}
                                >
                                  <YAxis dataKey="maquina" type="category" tickLine={false} axisLine={false} hide />
                                  <XAxis type="number" hide />
                                  <Tooltip
                                    cursor={{ fill: "hsl(var(--accent))" }}
                                    contentStyle={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}`, borderRadius: 8, fontSize: 12, color: CHART_TOOLTIP_TEXT }}
                                    formatter={(v: number) => [v.toLocaleString("pt-BR"), "Conforme"]}
                                  />
                                  <Bar dataKey="total" radius={4} style={{ cursor: "pointer" }} onClick={(d: { orig: string }) => clickMaq(d.orig)}>
                                    {linhasVisiveis.map((item) => (
                                      <Cell key={item.orig} fill={!selMaq || selMaq === item.orig ? DASH_GREEN : "hsl(var(--primary) / 0.25)"} />
                                    ))}
                                    <LabelList
                                      dataKey="maquina"
                                      content={(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
                                        const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
                                        const item = linhasVisiveis[index];
                                        if (!item) return null;
                                        const cy = y + height / 2 + 4;
                                        // Estima se o nome cabe dentro da barra (~6.3px por caractere em 11px);
                                        // se não couber, joga nome + valor pra fora, à direita da barra.
                                        const nomeCabe = width - 20 > item.maquina.length * 6.3;
                                        if (nomeCabe) {
                                          return (
                                            <g>
                                              <text x={x + 10} y={cy} fontSize={11} fontWeight={500} fill="#fff">{item.maquina}</text>
                                              <text x={x + width + 8} y={cy} fontSize={11} fontWeight={600} fill="hsl(var(--card-foreground))">{item.rotulo}</text>
                                            </g>
                                          );
                                        }
                                        return (
                                          <text x={x + width + 8} y={cy} fontSize={11} fontWeight={500} fill="hsl(var(--card-foreground))">
                                            {item.maquina} · {item.rotulo}
                                          </text>
                                        );
                                      }}
                                    />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            );
                          })()}
                          {dashPorMaquinaAll.length > 10 && (
                            <button
                              onClick={() => setShowAllMaq(v => !v)}
                              className="mt-2 w-full text-xs text-muted-foreground transition-colors py-1 border-t border-dashed border-border"
                            >
                              {showAllMaq ? "Ver menos ↑" : `Ver todas as máquinas (${dashPorMaquinaAll.length}) ↓`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* Produção Mensal — 40%, área */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="lg:col-span-2">
                    <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 h-full shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={15} style={{ color: DASH_GREEN }} />
                        <p className="text-sm font-semibold">Produção Mensal</p>
                        {selMaq && <span className="text-xs" style={{ color: DASH_GREEN }}>· {selMaq.toUpperCase()}</span>}
                      </div>
                      {dashPorDia.length === 0 ? (
                        <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum registro para o período e filtros selecionados." />
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={dashPorDia} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                            <defs>
                              <linearGradient id="producaoMensalFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={DASH_GREEN} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={DASH_GREEN} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                            <XAxis
                              dataKey="label" tickLine={false} tickMargin={10} axisLine={false}
                              tick={{ fontSize: 10, fill: CHART_AXIS }} tickFormatter={(v: string) => v.slice(0, 3)}
                            />
                            <YAxis hide />
                            <Tooltip
                              contentStyle={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}`, borderRadius: 8, fontSize: 12, color: CHART_TOOLTIP_TEXT }}
                              formatter={(v: number) => [v.toLocaleString("pt-BR"), "Conforme"]}
                            />
                            <Area
                              type="monotone" dataKey="total" stroke={DASH_GREEN} strokeWidth={2}
                              fill="url(#producaoMensalFill)"
                              dot={{ r: 3, fill: DASH_GREEN, strokeWidth: 0 }}
                              activeDot={{ r: 5 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* 3 distribuições: Unidade / Padrão / Largura */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <DistribuicaoCard
                    icone={Workflow} titulo="Produção por Linha"
                    linhas={(showAllLinhas ? dashPorLinha : dashPorLinhaDestaque).map(r => ({ key: r.linha, label: r.linha, total: r.total, pct: r.pct, ativo: selLinhas.has(r.linha) }))}
                    totalGeral={total1}
                    onClickLinha={(key) => clickLinha(key)}
                    verMais={dashPorLinhaDemais.length > 0 ? { expandido: showAllLinhas, restante: dashPorLinhaDemais.length, onToggle: () => setShowAllLinhas(v => !v) } : undefined}
                    vazio="Nenhuma linha no período selecionado."
                  />
                  <DistribuicaoCard
                    icone={BadgeCheck} titulo="Produção por Padrão"
                    linhas={(showAllPadrao ? dashPorPadrao : dashPorPadrao.slice(0, 6)).map(r => ({ key: r.padrao, label: r.padrao, total: r.total, pct: r.pct, ativo: selPadrao === r.padrao }))}
                    totalGeral={total2}
                    onClickLinha={(key) => clickPadrao(key)}
                    verMais={dashPorPadrao.length > 6 ? { expandido: showAllPadrao, restante: dashPorPadrao.length - 6, onToggle: () => setShowAllPadrao(v => !v) } : undefined}
                    vazio="Nenhum padrão no período selecionado."
                  />
                  <DistribuicaoCard
                    icone={Ruler} titulo="Produção por Largura"
                    linhas={(showAllLargura ? dashPorLargura : dashPorLargura.slice(0, 6)).map(r => ({ key: r.largura, label: `${r.largura} cm`, total: r.total, pct: r.pct }))}
                    totalGeral={total3}
                    verMais={dashPorLargura.length > 6 ? { expandido: showAllLargura, restante: dashPorLargura.length - 6, onToggle: () => setShowAllLargura(v => !v) } : undefined}
                    vazio="Nenhuma largura no período selecionado."
                  />
                </div>
              </>
            )}
        </TabsContent>

        {/* ══════════════════ ABA: MÁQUINAS ══════════════════ */}
        <TabsContent value="maquinas" className="space-y-4 mt-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard tone="neutral" label="Total de Máquinas" value={maquinas.length} hint={`${totalAtivas} ativas`} />
            <MetricCard
              tone="neutral"
              label="Produção Total"
              value={totalGeralMaq.toLocaleString("pt-BR")}
              trend={deltaGeralMaq}
              hint="vs. período anterior"
            />
            <MetricCard
              tone="neutral"
              label="Média por Máquina"
              value={mediaPorMaquina.toLocaleString("pt-BR")}
              hint="peças conformes"
              className="hidden sm:block"
            />
          </div>

          {/* Indicadores rápidos + destaques */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-success" /> {totalAtivas} Ativas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {totalInativas} Inativas
            </span>
            {destaqueAlta && (
              <button
                type="button"
                onClick={() => setBusca(destaqueAlta.maquina.nome ?? "")}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                🔥 Alta produção: <span className="font-medium">{destaqueAlta.maquina.nome}</span>
              </button>
            )}
            {destaqueQueda && (
              <button
                type="button"
                onClick={() => setBusca(destaqueQueda.maquina.nome ?? "")}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                ⬇ Produção caiu: <span className="font-medium">{destaqueQueda.maquina.nome}</span> ({destaqueQueda.deltaPct?.toFixed(0)}%)
              </button>
            )}
          </div>

          {/* Toolbar + filtros */}
          <SearchToolbar
            busca={busca}
            onBuscaChange={(v) => { setBusca(v); setPageMaq(1); }}
            sortBy={sortByMaq}
            sortDir={sortDirMaq}
            onSortChange={handleSortChangeMaq}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSync={() => fetchDados(setSyncing)}
            syncing={syncing}
            onAdicionar={() => { setForm(EMPTY_MAQUINA); setDialogOpen(true); }}
          />
          <MachineFilters
            statusFiltro={statusFiltroMaq}
            onStatusChange={(v) => { setStatusFiltroMaq(v); setPageMaq(1); }}
            linhasDisponiveis={linhasDisponiveisMaq}
            linhasSelecionadas={linhasSelMaq}
            onToggleLinha={toggleLinhaMaq}
            anos={ANOS_DASH}
            ano={anoMaq}
            onAnoChange={(v) => { setAnoMaq(v); setPageMaq(1); }}
            meses={MESES_DASH}
            mes={mesMaq}
            onMesChange={(v) => { setMesMaq(v); setPageMaq(1); }}
            onLimpar={limparFiltrosMaq}
          />

          {/* Área principal: tabela (desktop) ou cards (toggle "Cards" ou mobile) */}
          {(() => {
            const cardsGrid = (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linhasPaginaMaq.map((r) => (
                  <MaquinaCard
                    key={r.maquina.id}
                    maquina={r.maquina}
                    producaoPorSemana={semanas.map((s) => ({ label: s.label, producao: (producao[norm(r.maquina.nome ?? "")] ?? {})[s.label] ?? 0 }))}
                    totalMes={r.producaoTotal}
                    periodoLabel={`${MESES_DASH[Number(mesMaq) - 1]} ${anoMaq}`}
                    onClick={() => setMaquinaSelecionada(r.maquina)}
                    onEdit={abrirEdicao}
                    onLancar={getLancarAction(r.maquina)}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            );

            return viewMode === "list" ? (
              <>
                <div className="hidden md:block">
                  <MachineTable
                    rows={linhasPaginaMaq}
                    sortBy={sortByMaq}
                    sortDir={sortDirMaq}
                    onSort={handleSortMaq}
                    onRowClick={(m) => setMaquinaSelecionada(m)}
                    onEdit={abrirEdicao}
                    getLancarAction={getLancarAction}
                    canEdit={canEdit}
                  />
                </div>
                <div className="md:hidden">{cardsGrid}</div>
              </>
            ) : cardsGrid;
          })()}

          {/* Paginação */}
          {linhasOrdenadasMaq.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Mostrar</span>
                <Select value={String(pageSizeMaq)} onValueChange={(v) => { setPageSizeMaq(Number(v)); setPageMaq(1); }}>
                  <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>de {linhasOrdenadasMaq.length} máquinas</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon" variant="outline" className="h-7 w-7"
                  disabled={paginaAtualMaq <= 1}
                  onClick={() => setPageMaq((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1.5">
                  Página {paginaAtualMaq} de {totalPaginasMaq}
                </span>
                <Button
                  size="icon" variant="outline" className="h-7 w-7"
                  disabled={paginaAtualMaq >= totalPaginasMaq}
                  onClick={() => setPageMaq((p) => Math.min(totalPaginasMaq, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════ ABA: BOLETIM MENSAL ══════════════════ */}
        <TabsContent value="boletim" className="mt-4">
          <BoletimMensal />
        </TabsContent>
      </Tabs>

      {/* Dialog: Adicionar Máquina */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Máquina</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex: Betoneira 01"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && salvarMaquina()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={salvarMaquina} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Máquina */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome da Máquina</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={salvarEdicao} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet: Histórico */}
      <HistoricoSheet
        maquina={maquinaSelecionada}
        open={maquinaSelecionada !== null}
        onClose={() => setMaquinaSelecionada(null)}
        canEdit={canEdit}
      />

      {/* Form: Lançamento manual — Embalagem de Perfil tem formulário dedicado
          (selects encadeados de produto/largura/padrão); as demais máquinas
          usam o formulário genérico, guiado pelo mesmo mapa de colunas do
          histórico (colunasMaquina.ts). */}
      <EmbalagemPerfilForm
        open={norm(lancamentoMaquina?.nome ?? "") === norm("EMBALAGEM DE PERFIL")}
        onClose={() => setLancamentoMaquina(null)}
        onSaved={() => fetchDados(setSyncing)}
      />
      <LancarProducaoForm
        maquina={lancamentoMaquina && norm(lancamentoMaquina.nome ?? "") !== norm("EMBALAGEM DE PERFIL") ? lancamentoMaquina : null}
        onClose={() => setLancamentoMaquina(null)}
        onSaved={() => fetchDados(setSyncing)}
      />
    </div>
  );
}
