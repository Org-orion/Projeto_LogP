"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Package, TrendingDown, TrendingUp, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Scissors, Factory } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format, startOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const COR_VERDE = "hsl(var(--primary))";


// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Material {
  id: number;
  nome: string;
  categoria: "painel" | "laminado" | "outro";
  unidade: string;
  preco_unitario: number;
  estoque_minimo: number;
  ativo: boolean;
  obs: string | null;
}

interface Movimentacao {
  id: number;
  material_id: number;
  tipo: "entrada" | "saida" | "ajuste";
  data: string;
  quantidade: number;
  preco_unitario: number | null;
  nota_fiscal: string | null;
  obs: string | null;
  criado_por: string | null;
  criado_em: string;
  material?: { nome: string; unidade: string };
}

interface SaldoMaterial extends Material {
  saldo: number;         // quantidade líquida (entradas − saídas − ajustes − consumo produção)
  valor_total: number;   // saldo × preco_unitario
  status: "ok" | "baixo" | "critico";
}

interface ConsumoProd {
  dia: string;
  material_id: number;
  material_nome: string;
  consumo_m3: number;
  pecas: number;
}

interface ResumoProducao {
  maquina: string;
  produto_codigo: string;
  produto_descricao: string;
  produto_categoria: string;
  tipo_material: string;
  material_id: number;
  material_nome: string;
  largura_ref: number;
  espessura_ref: number;
  pecas: number;
  volume_unitario_m3: number;
  consumo_m3: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, dec = 2) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtBRL(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarMeses() {
  const hoje = new Date();
  const lista: { label: string; value: string }[] = [];
  for (let i = -12; i <= 0; i++) {
    const d = startOfMonth(i < 0 ? subMonths(hoje, -i) : addMonths(hoje, i));
    lista.push({ label: format(d, "MMMM/yyyy", { locale: ptBR }), value: format(d, "yyyy-MM-dd") });
  }
  return lista.reverse();
}

const MESES = gerarMeses();
const MES_ATUAL = format(startOfMonth(new Date()), "yyyy-MM-dd");

const CATEGORIAS = [
  { value: "painel",   label: "Painel (MDF/MDP)" },
  { value: "laminado", label: "Laminado / Revestimento" },
  { value: "outro",    label: "Outro" },
];

const UNIDADES = ["m³", "m²", "kg", "l", "un"];

const TIPOS_MOV = [
  { value: "entrada", label: "Entrada",  icon: ArrowDownToLine, cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "saida",   label: "Saída",    icon: ArrowUpFromLine,  cor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "ajuste",  label: "Ajuste",   icon: SlidersHorizontal,cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
];

type MatForm = { nome: string; categoria: Material["categoria"]; unidade: string; preco_unitario: string; estoque_minimo: string; obs: string };
type MovForm = { material_id: string; tipo: Movimentacao["tipo"]; data: string; quantidade: string; preco_unitario: string; nota_fiscal: string; obs: string };

const EMPTY_MATERIAL: MatForm = {
  nome: "", categoria: "painel", unidade: "m³",
  preco_unitario: "", estoque_minimo: "", obs: "",
};

const EMPTY_MOV: MovForm = {
  material_id: "", tipo: "entrada",
  data: format(new Date(), "yyyy-MM-dd"),
  quantidade: "", preco_unitario: "", nota_fiscal: "", obs: "",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function UsoeConsumoPage() {
  const [aba, setAba] = useState<"saldo" | "movimentacoes" | "producao" | "producao-lixadeira">("saldo");

  // Materiais
  const [materiais, setMateriais]       = useState<Material[]>([]);
  const [loadingMat, setLoadingMat]     = useState(true);
  const [matDialog, setMatDialog]       = useState(false);
  const [matEditId, setMatEditId]       = useState<number | null>(null);
  const [matForm, setMatForm]           = useState<MatForm>(EMPTY_MATERIAL);
  const [savingMat, setSavingMat]       = useState(false);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  // Movimentações
  const [movs, setMovs]               = useState<Movimentacao[]>([]);
  const [loadingMov, setLoadingMov]   = useState(false);
  const [movDialog, setMovDialog]     = useState(false);
  const [movEditId, setMovEditId]     = useState<number | null>(null);
  const [movForm, setMovForm]         = useState<MovForm>(EMPTY_MOV);
  const [savingMov, setSavingMov]     = useState(false);
  const [mesMov, setMesMov]           = useState(MES_ATUAL);
  const [filtroMat, setFiltroMat]     = useState("todos");

  // ─── Carrega materiais e movimentações do mês ─────────────────────────────

  const carregarMateriais = useCallback(async () => {
    setLoadingMat(true);
    const { data } = await supabase
      .from("estoque_materiais")
      .select("*")
      .eq("ativo", true)
      .order("categoria")
      .order("nome");
    setMateriais((data ?? []) as Material[]);
    setLoadingMat(false);
  }, []);

  const carregarMovimentacoes = useCallback(async () => {
    setLoadingMov(true);
    const mesDate = parseISO(mesMov);
    const inicio = format(mesDate, "yyyy-MM-dd");
    const fim    = format(new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0), "yyyy-MM-dd");

    const { data } = await supabase
      .from("estoque_movimentacoes")
      .select("*, material:material_id(nome, unidade)")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    setMovs((data ?? []) as Movimentacao[]);
    setLoadingMov(false);
  }, [mesMov]);

  // Saldo usa todas as movimentações (sem filtro de mês)
  const [todasMovs, setTodasMovs] = useState<Movimentacao[]>([]);
  const carregarTodasMovs = useCallback(async () => {
    const { data } = await supabase
      .from("estoque_movimentacoes")
      .select("material_id, tipo, quantidade");
    setTodasMovs((data ?? []) as Movimentacao[]);
  }, []);

  // Consumo calculado a partir dos registros da Seccionadora
  const [consumoProd, setConsumoProd] = useState<ConsumoProd[]>([]);
  const [loadingConsumo, setLoadingConsumo] = useState(false);
  const carregarConsumoProd = useCallback(async () => {
    setLoadingConsumo(true);
    const { data } = await supabase.rpc("consumo_mdf_seccionadora");
    setConsumoProd((data ?? []) as ConsumoProd[]);
    setLoadingConsumo(false);
  }, []);

  // Resumo de produção (3º tab) — agrupado por produto + máquina
  const [resumoProd, setResumoProd] = useState<ResumoProducao[]>([]);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [mesResumo, setMesResumo] = useState(MES_ATUAL);
  const [filtroMaquina, setFiltroMaquina] = useState("todas");

  const carregarResumoProd = useCallback(async (mesInicio: string) => {
    setLoadingResumo(true);
    // Parse year/month directly to avoid timezone offset issues with new Date(isoString)
    const [year, month] = mesInicio.split("-").map(Number);
    const inicio = mesInicio;                                              // "yyyy-MM-01"
    const fim = format(new Date(year, month, 0), "yyyy-MM-dd");           // last day of month
    const { data } = await supabase.rpc("producao_seccionadora_resumo", {
      p_inicio: inicio,
      p_fim: fim,
    });
    setResumoProd((data ?? []) as ResumoProducao[]);
    setLoadingResumo(false);
  }, []);

  // Resumo Lixadeira 1
  const [resumoLixadeira, setResumoLixadeira] = useState<ResumoProducao[]>([]);
  const [loadingLixadeira, setLoadingLixadeira] = useState(true);
  const [mesLixadeira, setMesLixadeira] = useState(MES_ATUAL);

  const carregarResumoLixadeira = useCallback(async (mesInicio: string) => {
    setLoadingLixadeira(true);
    const [year, month] = mesInicio.split("-").map(Number);
    const inicio = mesInicio;
    const fim = format(new Date(year, month, 0), "yyyy-MM-dd");
    const { data, error } = await supabase.rpc("producao_lixadeira_resumo", {
      p_inicio: inicio,
      p_fim: fim,
    });
    if (error) {
      console.error("producao_lixadeira_resumo:", error);
      toast.error(`Lixadeira: erro ao carregar dados`);
    }
    setResumoLixadeira((data ?? []) as ResumoProducao[]);
    setLoadingLixadeira(false);
  }, []);

  // m³ de chapas recebidas no mês (input da Seccionadora)
  const [totalChapasM3Mes, setTotalChapasM3Mes] = useState(0);
  const [loadingChapas, setLoadingChapas] = useState(false);
  const carregarChapasM3 = useCallback(async (mesInicio: string, maquina = "todas") => {
    setLoadingChapas(true);
    const [year, month] = mesInicio.split("-").map(Number);
    const fim = format(new Date(year, month, 0), "yyyy-MM-dd");
    const params: Record<string, unknown> = { p_inicio: mesInicio, p_fim: fim };
    if (maquina !== "todas") params.p_maquina = maquina;
    const { data } = await supabase.rpc("consumo_mdf_seccionadora", params);
    const total = (data ?? []).reduce((s: number, c: { consumo_m3?: number }) => s + (c.consumo_m3 ?? 0), 0);
    setTotalChapasM3Mes(total);
    setLoadingChapas(false);
  }, []);

  useEffect(() => {
    carregarMateriais();
    carregarTodasMovs();
    carregarConsumoProd();
  }, [carregarMateriais, carregarTodasMovs, carregarConsumoProd]);

  useEffect(() => {
    carregarResumoProd(mesResumo);
    carregarChapasM3(mesResumo, filtroMaquina);
  }, [mesResumo, filtroMaquina, carregarResumoProd, carregarChapasM3]);
  useEffect(() => { if (aba === "movimentacoes") carregarMovimentacoes(); }, [aba, carregarMovimentacoes]);
  useEffect(() => { carregarResumoLixadeira(mesLixadeira); }, [mesLixadeira, carregarResumoLixadeira]);

  // ─── Cálculo de saldo ─────────────────────────────────────────────────────

  function calcularSaldos(
    mats: Material[],
    movimentos: Movimentacao[],
    consumoPorMat: Record<number, number> = {}
  ): SaldoMaterial[] {
    return mats.map(mat => {
      const movMat   = movimentos.filter(m => m.material_id === mat.id);
      const entradas = movMat.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.quantidade, 0);
      const saidas   = movMat.filter(m => m.tipo === "saida").reduce((s, m) => s + m.quantidade, 0);
      const ajustes  = movMat.filter(m => m.tipo === "ajuste").reduce((s, m) => s + m.quantidade, 0);
      const consumoP = consumoPorMat[mat.id] ?? 0;
      const saldo    = entradas - saidas + ajustes - consumoP;
      const pct      = mat.estoque_minimo > 0 ? saldo / mat.estoque_minimo : 1;
      const status: SaldoMaterial["status"] =
        pct <= 0.25 ? "critico" : pct <= 0.75 ? "baixo" : "ok";
      return { ...mat, saldo, valor_total: saldo * mat.preco_unitario, status };
    });
  }

  // ─── Salvar material ──────────────────────────────────────────────────────

  async function salvarMaterial() {
    if (!matForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSavingMat(true);
    const payload = {
      nome: matForm.nome.trim(),
      categoria: matForm.categoria,
      unidade: matForm.unidade,
      preco_unitario: parseFloat(String(matForm.preco_unitario).replace(",", ".")) || 0,
      estoque_minimo: parseFloat(String(matForm.estoque_minimo).replace(",", ".")) || 0,
      obs: matForm.obs || null,
    };
    const { error } = matEditId
      ? await supabase.from("estoque_materiais").update(payload).eq("id", matEditId)
      : await supabase.from("estoque_materiais").insert(payload);
    setSavingMat(false);
    if (error) { toast.error("Erro ao salvar material"); return; }
    toast.success(matEditId ? "Material atualizado" : "Material criado");
    setMatDialog(false);
    carregarMateriais();
    carregarTodasMovs();
  }

  async function excluirMaterial(id: number) {
    if (!confirm("Excluir este material? As movimentações vinculadas serão mantidas.")) return;
    setDeletingId(id);
    await supabase.from("estoque_materiais").update({ ativo: false }).eq("id", id);
    setDeletingId(null);
    toast.success("Material removido");
    carregarMateriais();
    carregarTodasMovs();
  }

  // ─── Salvar movimentação ──────────────────────────────────────────────────

  async function salvarMovimentacao() {
    if (!movForm.material_id) { toast.error("Selecione o material"); return; }
    if (!movForm.quantidade || parseFloat(String(movForm.quantidade)) <= 0) {
      toast.error("Quantidade deve ser maior que zero"); return;
    }
    setSavingMov(true);
    const mat = materiais.find(m => m.id === Number(movForm.material_id));
    const payload = {
      material_id: Number(movForm.material_id),
      tipo: movForm.tipo,
      data: movForm.data,
      quantidade: parseFloat(String(movForm.quantidade).replace(",", ".")),
      preco_unitario: movForm.preco_unitario
        ? parseFloat(String(movForm.preco_unitario).replace(",", "."))
        : mat?.preco_unitario ?? null,
      nota_fiscal: movForm.nota_fiscal || null,
      obs: movForm.obs || null,
    };
    const { error } = movEditId
      ? await supabase.from("estoque_movimentacoes").update(payload).eq("id", movEditId)
      : await supabase.from("estoque_movimentacoes").insert(payload);
    setSavingMov(false);
    if (error) { toast.error("Erro ao salvar movimentação"); return; }
    toast.success(movEditId ? "Movimentação atualizada" : "Movimentação registrada");
    setMovDialog(false);
    carregarMovimentacoes();
    carregarTodasMovs();
  }

  async function excluirMovimentacao(id: number) {
    if (!confirm("Excluir esta movimentação?")) return;
    await supabase.from("estoque_movimentacoes").delete().eq("id", id);
    toast.success("Movimentação excluída");
    carregarMovimentacoes();
    carregarTodasMovs();
  }

  // ─── Dialogs ──────────────────────────────────────────────────────────────

  function abrirNovoMaterial() {
    setMatEditId(null); setMatForm(EMPTY_MATERIAL); setMatDialog(true);
  }
  function abrirEditarMaterial(mat: Material) {
    setMatEditId(mat.id);
    setMatForm({
      nome: mat.nome, categoria: mat.categoria, unidade: mat.unidade,
      preco_unitario: String(mat.preco_unitario), estoque_minimo: String(mat.estoque_minimo),
      obs: mat.obs ?? "",
    });
    setMatDialog(true);
  }
  function abrirNovaMovimentacao(tipo: "entrada" | "saida" | "ajuste" = "entrada") {
    setMovEditId(null);
    setMovForm({ ...EMPTY_MOV, tipo, data: format(new Date(), "yyyy-MM-dd") });
    setMovDialog(true);
  }
  function abrirEditarMovimentacao(mov: Movimentacao) {
    setMovEditId(mov.id);
    setMovForm({
      material_id: String(mov.material_id),
      tipo: mov.tipo,
      data: mov.data,
      quantidade: String(mov.quantidade),
      preco_unitario: String(mov.preco_unitario ?? ""),
      nota_fiscal: mov.nota_fiscal ?? "",
      obs: mov.obs ?? "",
    });
    setMovDialog(true);
  }

  // ─── Derivados do consumo de produção ─────────────────────────────────────

  const mesAtual = format(new Date(), "yyyy-MM");

  // Consumo acumulado total por material (para saldo)
  const consumoProdTotal: Record<number, number> = {};
  for (const c of consumoProd) {
    consumoProdTotal[c.material_id] = (consumoProdTotal[c.material_id] ?? 0) + (c.consumo_m3 ?? 0);
  }

  // Consumo somente do mês atual (para exibição na tabela)
  const consumoProdMes: Record<number, { m3: number; pecas: number }> = {};
  for (const c of consumoProd) {
    if (c.dia.startsWith(mesAtual)) {
      const prev = consumoProdMes[c.material_id] ?? { m3: 0, pecas: 0 };
      consumoProdMes[c.material_id] = { m3: prev.m3 + (c.consumo_m3 ?? 0), pecas: prev.pecas + c.pecas };
    }
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  const saldosAtivos = calcularSaldos(materiais, todasMovs, consumoProdTotal);
  const valorTotal   = saldosAtivos.reduce((s, m) => s + m.valor_total, 0);
  const abaixoMin    = saldosAtivos.filter(m => m.status !== "ok").length;
  const totalMat     = saldosAtivos.length;
  const totalM3Mes   = resumoProd
    .filter(r => r.produto_categoria !== "SOBRA")
    .filter(r => filtroMaquina === "todas" || r.maquina === filtroMaquina)
    .reduce((s, r) => s + (r.consumo_m3 ?? 0), 0);

  // ─── Filtro movimentações ─────────────────────────────────────────────────

  const movsFiltradas = filtroMat === "todos"
    ? movs
    : movs.filter(m => String(m.material_id) === filtroMat);

  // ─── Totais movimentações do mês ──────────────────────────────────────────

  const totalEntradas = movsFiltradas
    .filter(m => m.tipo === "entrada")
    .reduce((s, m) => s + m.quantidade * (m.preco_unitario ?? materiais.find(x => x.id === m.material_id)?.preco_unitario ?? 0), 0);
  const totalSaidas = movsFiltradas
    .filter(m => m.tipo === "saida")
    .reduce((s, m) => s + m.quantidade * (m.preco_unitario ?? materiais.find(x => x.id === m.material_id)?.preco_unitario ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-6 pb-16">

      {/* Título */}
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produção</p>
          <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Uso e Consumo</h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Package size={15} style={{ color: COR_VERDE }} />}
          label="Valor em estoque" value={fmtBRL(valorTotal)} loading={loadingMat} />
        <KpiCard icon={<Scissors size={15} style={{ color: COR_VERDE }} />}
          label="MDF processado (mês)" value={`${fmt(totalM3Mes, 2)} m³`} loading={loadingResumo} />
        <KpiCard icon={<TrendingUp size={15} className="text-emerald-500" />}
          label="Chapas recebidas (mês)" value={`${fmt(totalChapasM3Mes, 2)} m³`} loading={loadingChapas} />
        <KpiCard
          icon={<TrendingDown size={15} className={abaixoMin > 0 ? "text-red-500" : "text-muted-foreground"} />}
          label="Abaixo do mínimo" value={String(abaixoMin)}
          alert={abaixoMin > 0} loading={loadingMat} />
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {(["saldo", "movimentacoes", "producao", "producao-lixadeira"] as const).map(a => (
          <button key={a}
            onClick={() => setAba(a)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              a === aba
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a === "saldo" ? "Saldo Atual"
              : a === "movimentacoes" ? "Movimentações"
              : a === "producao" ? "Seccionadora"
              : "Lixadeira 1"}
          </button>
        ))}
      </div>

      {/* ══ ABA SALDO ══ */}
      {aba === "saldo" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Posição atual do estoque · todas as movimentações
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={abrirNovoMaterial}>
                  <Plus className="h-4 w-4" /> Novo Material
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => abrirNovaMovimentacao("entrada")}>
                  <ArrowDownToLine className="h-4 w-4" /> Registrar Entrada
                </Button>
              </div>
            </div>

            {loadingMat ? (
              <div className="flex items-center justify-center h-48"><SpinnerCustom /></div>
            ) : saldosAtivos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum material cadastrado. Clique em "Novo Material" para começar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Scissors className="h-3 w-3" /> Consumo (mês)
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldosAtivos.map(mat => {
                      const cMes = consumoProdMes[mat.id];
                      return (
                      <TableRow key={mat.id}>
                        <TableCell className="text-xs font-medium">{mat.nome}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORIAS.find(c => c.value === mat.categoria)?.label ?? mat.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">
                          {fmt(mat.saldo, 3)} {mat.unidade}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {loadingConsumo ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : cMes ? (
                            <span className="text-amber-600 dark:text-amber-400" title={`${cMes.pecas} peças produzidas`}>
                              -{fmt(cMes.m3, 4)} {mat.unidade}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {fmtBRL(mat.preco_unitario)}/{mat.unidade}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">
                          {fmtBRL(mat.valor_total)}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                          {fmt(mat.estoque_minimo, 2)} {mat.unidade}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={mat.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => abrirEditarMaterial(mat)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              disabled={deletingId === mat.id}
                              onClick={() => excluirMaterial(mat.id)}>
                              {deletingId === mat.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ ABA MOVIMENTAÇÕES ══ */}
      {aba === "movimentacoes" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={mesMov} onValueChange={setMesMov}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MESES.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroMat} onValueChange={setFiltroMat}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Todos os materiais" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">Todos os materiais</SelectItem>
                    {materiais.map(m => (
                      <SelectItem key={m.id} value={String(m.id)} className="text-xs">{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-600 border-orange-200"
                  onClick={() => abrirNovaMovimentacao("saida")}>
                  <ArrowUpFromLine className="h-4 w-4" /> Registrar Saída
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => abrirNovaMovimentacao("entrada")}>
                  <ArrowDownToLine className="h-4 w-4" /> Registrar Entrada
                </Button>
              </div>
            </div>

            {/* Totais do período */}
            {!loadingMov && movsFiltradas.length > 0 && (
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="text-emerald-600 font-medium">
                  ↓ Entradas: {fmtBRL(totalEntradas)}
                </span>
                <span className="text-orange-600 font-medium">
                  ↑ Saídas: {fmtBRL(totalSaidas)}
                </span>
              </div>
            )}

            {loadingMov ? (
              <div className="flex items-center justify-center h-48"><SpinnerCustom /></div>
            ) : movsFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma movimentação em {MESES.find(m => m.value === mesMov)?.label}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total R$</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead>Obs</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movsFiltradas.map(mov => {
                      const mat = materiais.find(m => m.id === mov.material_id);
                      const preco = mov.preco_unitario ?? mat?.preco_unitario ?? 0;
                      const total = mov.quantidade * preco;
                      const tipoInfo = TIPOS_MOV.find(t => t.value === mov.tipo);
                      return (
                        <TableRow key={mov.id}>
                          <TableCell className="text-xs tabular-nums">
                            {format(parseISO(mov.data), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", tipoInfo?.cor)}>
                              {tipoInfo?.label ?? mov.tipo}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {mov.material?.nome ?? mat?.nome ?? `#${mov.material_id}`}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {mov.tipo === "saida" ? "-" : "+"}{fmt(mov.quantidade, 3)} {mov.material?.unidade ?? mat?.unidade ?? ""}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {preco > 0 ? fmtBRL(preco) : "—"}
                          </TableCell>
                          <TableCell className={cn("text-xs text-right tabular-nums font-semibold",
                            mov.tipo === "saida" ? "text-orange-600" : "text-emerald-600")}>
                            {mov.tipo === "saida" ? "-" : "+"}{fmtBRL(total)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {mov.nota_fiscal ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {mov.obs ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => abrirEditarMovimentacao(mov)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                onClick={() => excluirMovimentacao(mov.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ ABA PRODUÇÃO SECCIONADORA ══ */}
      {aba === "producao" && (() => {
        const linhasFiltradas = filtroMaquina === "todas"
          ? resumoProd
          : resumoProd.filter(r => r.maquina === filtroMaquina);

        // Agrupa por maquina + produto_codigo + descricao + largura_ref + espessura_ref
        const groupMap: Record<string, ResumoProducao & { total_pecas: number; total_m3: number }> = {};
        for (const r of linhasFiltradas) {
          const k = `${r.maquina}||${r.produto_codigo}||${r.produto_descricao}||${r.largura_ref}||${r.espessura_ref}`;
          if (!groupMap[k]) groupMap[k] = { ...r, total_pecas: 0, total_m3: 0 };
          groupMap[k].total_pecas += r.pecas;
          groupMap[k].total_m3   += (r.consumo_m3 ?? 0);
          // volume_unitario_m3 é constante por produto — mantém o do catálogo
          if (r.volume_unitario_m3) groupMap[k].volume_unitario_m3 = r.volume_unitario_m3;
        }
        const linhas = Object.values(groupMap).sort((a, b) => {
          // Sobras sempre por último
          if (a.produto_categoria === "SOBRA" && b.produto_categoria !== "SOBRA") return 1;
          if (a.produto_categoria !== "SOBRA" && b.produto_categoria === "SOBRA") return -1;
          return a.maquina.localeCompare(b.maquina) || a.tipo_material.localeCompare(b.tipo_material) || a.largura_ref - b.largura_ref;
        });

        // totais por material (só produção, não sobra)
        const totaisMat: Record<string, { m3: number; pecas: number }> = {};
        for (const r of linhas) {
          if (r.produto_categoria === "SOBRA") continue;
          const prev = totaisMat[r.material_nome] ?? { m3: 0, pecas: 0 };
          totaisMat[r.material_nome] = { m3: prev.m3 + r.total_m3, pecas: prev.pecas + r.total_pecas };
        }

        // Agrupa por Material MDF + Largura para o gráfico
        const _chartMap: Record<string, { material: string; largura: number; m3: number }> = {};
        for (const r of linhas) {
          if (r.produto_categoria === "SOBRA") continue;
          const k = `${r.tipo_material}||${r.largura_ref}`;
          const prev = _chartMap[k] ?? { material: r.tipo_material, largura: Number(r.largura_ref), m3: 0 };
          _chartMap[k] = { ...prev, m3: prev.m3 + r.total_m3 };
        }
        const chartProd = Object.values(_chartMap)
          .sort((a, b) => b.m3 - a.m3)
          .slice(0, 5)
          .map(g => ({
            produto: `${g.material.replace("MDF ", "")} ${g.largura}`,
            m3: parseFloat(g.m3.toFixed(4)),
            fill: COR_VERDE,
          }));
        const chartCfg = {
          m3: { label: "m³", color: COR_VERDE },
        } as ChartConfig;


        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Gráfico — m³ por Material / Largura */}
              {!loadingResumo && chartProd.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    m³ por material / largura
                  </p>
                  <ChartContainer config={chartCfg} className="h-[180px] w-full">
                    <BarChart accessibilityLayer data={chartProd} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" dataKey="m3" hide />
                      <YAxis dataKey="produto" type="category" tickLine={false} tickMargin={8} axisLine={false} width={90} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="m3" fill={COR_VERDE} radius={5} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={mesResumo} onValueChange={setMesResumo}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MESES.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroMaquina} onValueChange={setFiltroMaquina}>
                  <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">Todas as Seccionadoras</SelectItem>
                    <SelectItem value="SECCIONADORA 1" className="text-xs">SECCIONADORA 1</SelectItem>
                    <SelectItem value="SECCIONADORA 2" className="text-xs">SECCIONADORA 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resumo por material */}
              {Object.keys(totaisMat).length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(totaisMat).map(([nome, t]) => (
                    <div key={nome} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs">
                      <Scissors className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">{nome}:</span>
                      <span className="tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {fmt(t.m3, 4)} m³
                      </span>
                      <span className="text-muted-foreground">({t.pecas} peças)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela */}
              {loadingResumo ? (
                <div className="flex items-center justify-center h-48"><SpinnerCustom /></div>
              ) : linhas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro de produção em {MESES.find(m => m.value === mesResumo)?.label}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Máquina</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Largura</TableHead>
                        <TableHead className="text-right">Esp.</TableHead>
                        <TableHead>Material MDF</TableHead>
                        <TableHead className="text-right">Peças</TableHead>
                        <TableHead className="text-right">Vol/peça (m³)</TableHead>
                        <TableHead className="text-right">Total m³</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((r, i) => {
                        const isSobra = r.produto_categoria === "SOBRA";
                        return (
                        <TableRow key={i} className={isSobra ? "opacity-70 bg-muted/30" : ""}>
                          <TableCell className="text-xs">
                            <span className="flex items-center gap-1">
                              <Factory className="h-3 w-3 text-muted-foreground" />
                              {r.maquina}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold">
                            {isSobra ? <span className="text-orange-500">↩ sobra</span> : r.produto_codigo}
                          </TableCell>
                          <TableCell className="text-xs">{r.produto_descricao}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className={cn("text-[10px]", isSobra && "border-orange-300 text-orange-600")}>
                              {r.produto_categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmt(r.largura_ref, 1)} cm</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{r.espessura_ref} mm</TableCell>
                          <TableCell className="text-xs">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              r.tipo_material === "MDF Hidro"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400"
                            )}>
                              {r.tipo_material}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{r.total_pecas}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {fmt(r.volume_unitario_m3, 6)}
                          </TableCell>
                          <TableCell className={cn("text-xs text-right tabular-nums font-semibold",
                            isSobra ? "text-orange-500" : "text-amber-600 dark:text-amber-400")}>
                            {fmt(r.total_m3, 4)} m³
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* ══ ABA LIXADEIRA 1 ══ */}
      {aba === "producao-lixadeira" && (() => {
        // Agrupa por produto_codigo + descricao + largura_ref + espessura_ref
        const groupMap: Record<string, ResumoProducao & { total_pecas: number; total_m3: number }> = {};
        for (const r of resumoLixadeira) {
          const k = `${r.produto_codigo}||${r.produto_descricao}||${r.largura_ref}||${r.espessura_ref}`;
          if (!groupMap[k]) groupMap[k] = { ...r, total_pecas: 0, total_m3: 0 };
          groupMap[k].total_pecas += r.pecas;
          groupMap[k].total_m3   += (r.consumo_m3 ?? 0);
          if (r.volume_unitario_m3) groupMap[k].volume_unitario_m3 = r.volume_unitario_m3;
        }
        const linhas = Object.values(groupMap).sort((a, b) =>
          a.tipo_material.localeCompare(b.tipo_material) || a.largura_ref - b.largura_ref
        );

        // Totais por material
        const totaisMat: Record<string, { m3: number; pecas: number }> = {};
        for (const r of linhas) {
          const prev = totaisMat[r.material_nome] ?? { m3: 0, pecas: 0 };
          totaisMat[r.material_nome] = { m3: prev.m3 + r.total_m3, pecas: prev.pecas + r.total_pecas };
        }

        // Gráfico top-5 por m³
        const chartProd = Object.values(
          linhas.reduce<Record<string, { material: string; largura: number; m3: number }>>((acc, r) => {
            const k = `${r.tipo_material}||${r.largura_ref}`;
            const prev = acc[k] ?? { material: r.tipo_material, largura: Number(r.largura_ref), m3: 0 };
            acc[k] = { ...prev, m3: prev.m3 + r.total_m3 };
            return acc;
          }, {})
        ).sort((a, b) => b.m3 - a.m3).slice(0, 5).map(g => ({
          produto: `${g.material.replace("MDF ", "")} ${g.largura}`,
          m3: parseFloat(g.m3.toFixed(4)),
          fill: COR_VERDE,
        }));
        const chartCfg = { m3: { label: "m³", color: COR_VERDE } } as ChartConfig;

        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Gráfico */}
              {!loadingLixadeira && chartProd.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    m³ por material / largura
                  </p>
                  <ChartContainer config={chartCfg} className="h-[180px] w-full">
                    <BarChart accessibilityLayer data={chartProd} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" dataKey="m3" hide />
                      <YAxis dataKey="produto" type="category" tickLine={false} tickMargin={8} axisLine={false} width={90} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="m3" fill={COR_VERDE} radius={5} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {/* Seletor de mês */}
              <div className="flex items-center gap-2">
                <Select value={mesLixadeira} onValueChange={setMesLixadeira}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MESES.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Totais por material */}
              {Object.keys(totaisMat).length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(totaisMat).map(([nome, t]) => (
                    <div key={nome} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs">
                      <Scissors className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">{nome}:</span>
                      <span className="tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {fmt(t.m3, 4)} m³
                      </span>
                      <span className="text-muted-foreground">({t.pecas} peças)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela */}
              {loadingLixadeira ? (
                <div className="flex items-center justify-center h-48"><SpinnerCustom /></div>
              ) : linhas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro de produção em {MESES.find(m => m.value === mesLixadeira)?.label}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Largura</TableHead>
                        <TableHead className="text-right">Esp.</TableHead>
                        <TableHead>Material MDF</TableHead>
                        <TableHead className="text-right">Peças</TableHead>
                        <TableHead className="text-right">Vol/peça (m³)</TableHead>
                        <TableHead className="text-right">Total m³</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono font-semibold">{r.produto_codigo}</TableCell>
                          <TableCell className="text-xs">{r.produto_descricao}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">{r.produto_categoria}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmt(r.largura_ref, 1)} cm</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{r.espessura_ref} mm</TableCell>
                          <TableCell className="text-xs">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              r.tipo_material === "MDF Hidro"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400"
                            )}>
                              {r.tipo_material}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{r.total_pecas}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {fmt(r.volume_unitario_m3, 6)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                            {fmt(r.total_m3, 4)} m³
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* ══ DIALOG MATERIAL ══ */}
      <Dialog open={matDialog} onOpenChange={setMatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{matEditId ? "Editar Material" : "Novo Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="field-label">Nome</Label>
              <Input value={matForm.nome}
                onChange={e => setMatForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: MDF Cru 18mm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="field-label">Categoria</Label>
                <Select value={matForm.categoria}
                  onValueChange={v => setMatForm(f => ({ ...f, categoria: v as Material["categoria"] }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="field-label">Unidade</Label>
                <Select value={matForm.unidade}
                  onValueChange={v => setMatForm(f => ({ ...f, unidade: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="field-label">Preço unit. (R$/{matForm.unidade})</Label>
                <Input type="number" value={matForm.preco_unitario}
                  onChange={e => setMatForm(f => ({ ...f, preco_unitario: e.target.value }))}
                  placeholder="0,00" />
              </div>
              <div>
                <Label className="field-label">Estoque mínimo ({matForm.unidade})</Label>
                <Input type="number" value={matForm.estoque_minimo}
                  onChange={e => setMatForm(f => ({ ...f, estoque_minimo: e.target.value }))}
                  placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="field-label">Observação</Label>
              <Input value={matForm.obs}
                onChange={e => setMatForm(f => ({ ...f, obs: e.target.value }))}
                placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvarMaterial} disabled={savingMat} className="gap-2">
              {savingMat && <Loader2 className="h-4 w-4 animate-spin" />}
              {matEditId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG MOVIMENTAÇÃO ══ */}
      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movEditId ? "Editar Movimentação" : "Nova Movimentação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="field-label">Tipo</Label>
              <div className="flex gap-2">
                {TIPOS_MOV.map(t => (
                  <button key={t.value}
                    onClick={() => setMovForm(f => ({ ...f, tipo: t.value as Movimentacao["tipo"] }))}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                      movForm.tipo === t.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="field-label">Material</Label>
                <Select value={String(movForm.material_id)}
                  onValueChange={v => setMovForm(f => ({ ...f, material_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {materiais.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="field-label">Data</Label>
                <Input type="date" value={movForm.data}
                  onChange={e => setMovForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="field-label">
                  Quantidade ({materiais.find(m => String(m.id) === String(movForm.material_id))?.unidade ?? "—"})
                </Label>
                <Input type="number" value={movForm.quantidade}
                  onChange={e => setMovForm(f => ({ ...f, quantidade: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label className="field-label">Preço unit. (R$) — opcional</Label>
                <Input type="number" value={movForm.preco_unitario}
                  onChange={e => setMovForm(f => ({ ...f, preco_unitario: e.target.value }))}
                  placeholder="Usa preço do material" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="field-label">Nota Fiscal</Label>
                <Input value={movForm.nota_fiscal}
                  onChange={e => setMovForm(f => ({ ...f, nota_fiscal: e.target.value }))}
                  placeholder="Opcional" />
              </div>
              <div>
                <Label className="field-label">Observação</Label>
                <Input value={movForm.obs}
                  onChange={e => setMovForm(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Opcional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvarMovimentacao} disabled={savingMov} className="gap-2">
              {savingMov && <Loader2 className="h-4 w-4 animate-spin" />}
              {movEditId ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, loading, alert = false }: {
  icon: React.ReactNode; label: string; value: string; loading: boolean; alert?: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {loading
        ? <div className="h-7 w-24 rounded animate-pulse bg-muted" />
        : <p className={cn("text-xl font-bold", alert ? "text-red-600" : "text-foreground")}>{value}</p>
      }
    </div>
  );
}

function StatusBadge({ status }: { status: SaldoMaterial["status"] }) {
  const cfg = {
    ok:      { label: "OK",       cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    baixo:   { label: "Baixo",    cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    critico: { label: "Crítico",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  }[status];
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
