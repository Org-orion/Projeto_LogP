"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle2, AlertTriangle, Package, Plus, Pencil, Trash2,
  CalendarIcon, Loader2, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const COR_VERDE = "#216C3B";
const COR_VERDE_CLARO = "rgba(33,108,59,0.22)";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Registro {
  maquina: string | null;
  data: string | null;
  qtd_conforme: number | null;
  produto: string | null;
  linha: string | null;
  padrao: string | null;
  largura_cm: string | null;
}

interface MaterialEntry {
  id: string;
  date: Date;
  material: string;
  lote: string;
  quantidade: number;
  unidade: string;
  fornecedor: string;
  verificado: boolean;
  conforme: boolean | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  material: "", lote: "", quantidade: "", unidade: "pcs",
  fornecedor: "", verificado: "pendente" as "pendente" | "conforme" | "nao_conforme",
  date: new Date(),
};

const INITIAL_MATERIALS: MaterialEntry[] = [
  { id: "1", date: new Date(2026, 2, 26), material: "MDF 15mm", lote: "L-2026-0341", quantidade: 120, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
  { id: "2", date: new Date(2026, 2, 26), material: "Cola PVA", lote: "L-2026-0342", quantidade: 50, unidade: "kg", fornecedor: "Henkel", verificado: true, conforme: false },
  { id: "3", date: new Date(2026, 2, 25), material: "Fita de Borda", lote: "L-2026-0338", quantidade: 300, unidade: "m", fornecedor: "Rehau", verificado: true, conforme: true },
  { id: "4", date: new Date(2026, 2, 25), material: "Dobradiça 35mm", lote: "L-2026-0339", quantidade: 500, unidade: "pcs", fornecedor: "Blum", verificado: false, conforme: null },
  { id: "5", date: new Date(2026, 2, 24), material: "Painel MDP 18mm", lote: "L-2026-0335", quantidade: 80, unidade: "chapas", fornecedor: "Duratex", verificado: true, conforme: true },
  { id: "6", date: new Date(2026, 2, 24), material: "Verniz PU", lote: "L-2026-0336", quantidade: 25, unidade: "L", fornecedor: "Sayerlack", verificado: true, conforme: false },
  { id: "7", date: new Date(2026, 2, 23), material: "Puxador Inox", lote: "L-2026-0330", quantidade: 200, unidade: "pcs", fornecedor: "Hafele", verificado: false, conforme: null },
  { id: "8", date: new Date(2026, 2, 20), material: "MDF 6mm", lote: "L-2026-0325", quantidade: 60, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
];

// Barra de dados inline para tabelas
function DataBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="relative flex items-center h-5 min-w-[90px]">
      <div
        className="absolute left-0 top-0 bottom-0 rounded-sm"
        style={{ width: `${pct}%`, backgroundColor: COR_VERDE_CLARO }}
      />
      <span className="relative z-10 text-xs pl-1 font-medium" style={{ color: COR_VERDE }}>
        {label}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HomePage() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth(); // 0-indexed

  // ── Dados ──
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<string[]>([]);

  // ── Filtros BI ──
  const [anoFiltro, setAnoFiltro] = useState(anoAtual);
  const [mesFiltro, setMesFiltro] = useState<number | null>(mesAtual);
  const [maquinasFiltro, setMaquinasFiltro] = useState<string[]>([]);
  const [maquinaPickerOpen, setMaquinaPickerOpen] = useState(false);

  // ── Aba ──
  const [abaAtiva, setAbaAtiva] = useState<"portas" | "guarnicao">("portas");

  // ── Materiais ──
  const [materials, setMaterials] = useState<MaterialEntry[]>(INITIAL_MATERIALS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [matDatePickerOpen, setMatDatePickerOpen] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const dataInicio = `${anoFiltro}-01-01`;
    const dataFim = `${anoFiltro}-12-31`;

    const todos: Registro[] = [];
    const TAM_PAG = 1000;
    let pagina = 0;

    while (true) {
      const { data: lote, error } = await supabase
        .from("registros_producao")
        .select("maquina, data, qtd_conforme, produto, linha, padrao, largura_cm")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .range(pagina * TAM_PAG, (pagina + 1) * TAM_PAG - 1);

      if (error) break;
      if (!lote || lote.length === 0) break;
      todos.push(...lote);
      if (lote.length < TAM_PAG) break;
      pagina++;
    }

    setRegistros(todos);
    setLoading(false);
  }, [anoFiltro]);

  useEffect(() => {
    async function fetchMaquinas() {
      const { data } = await supabase
        .from("maquinas")
        .select("nome")
        .order("nome");
      if (data) {
        const lista = data.map((r) => r.nome).filter(Boolean) as string[];
        setMaquinasDisponiveis(lista);
      }
    }
    fetchMaquinas();
  }, []);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  // ─── Dados filtrados (mês + máquina) ────────────────────────────────────────

  const registrosFiltrados = registros.filter((r) => {
    if (mesFiltro !== null && r.data) {
      const mes = parseInt(r.data.split("-")[1]) - 1;
      if (mes !== mesFiltro) return false;
    }
    if (maquinasFiltro.length > 0 && r.maquina && !maquinasFiltro.includes(r.maquina)) {
      return false;
    }
    return true;
  });

  // ─── Derivações ──────────────────────────────────────────────────────────────

  const totalGeral = registrosFiltrados.reduce((acc, r) => acc + (Number(r.qtd_conforme) || 0), 0);

  // Gráfico horizontal: Produção por Máquina
  const porMaquina = Object.entries(
    registrosFiltrados.reduce((acc, r) => {
      if (!r.maquina) return acc;
      acc[r.maquina] = (acc[r.maquina] ?? 0) + (Number(r.qtd_conforme) || 0);
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  // Gráfico vertical: Produção por Mês (respeita filtro de máquina, mas não de mês)
  const registrosPorAno = registros.filter((r) => {
    if (maquinasFiltro.length > 0 && r.maquina && !maquinasFiltro.includes(r.maquina)) return false;
    return true;
  });

  const porMes = MESES_CURTO.map((mes, i) => ({
    mes,
    total: registrosPorAno
      .filter((r) => r.data && parseInt(r.data.split("-")[1]) - 1 === i)
      .reduce((acc, r) => acc + (Number(r.qtd_conforme) || 0), 0),
  })).filter((m) => m.total > 0);

  // Tabela Linha / Produto
  const linhaMap = registrosFiltrados.reduce((acc, r) => {
    const k = r.linha || "Outro";
    acc[k] = (acc[k] ?? 0) + (Number(r.qtd_conforme) || 0);
    return acc;
  }, {} as Record<string, number>);
  const porLinha = Object.entries(linhaMap)
    .map(([linha, qtd]) => ({ linha, qtd, pct: totalGeral > 0 ? (qtd / totalGeral) * 100 : 0 }))
    .sort((a, b) => b.qtd - a.qtd);
  const maxLinhaPct = Math.max(...porLinha.map((l) => l.pct), 0);

  // Tabela Produção por Padrão
  const padraoMap = registrosFiltrados.reduce((acc, r) => {
    const k = r.padrao || "N/D";
    acc[k] = (acc[k] ?? 0) + (Number(r.qtd_conforme) || 0);
    return acc;
  }, {} as Record<string, number>);
  const totalPadrao = Object.values(padraoMap).reduce((a, b) => a + b, 0);
  const porPadrao = Object.entries(padraoMap)
    .map(([padrao, qtd]) => ({ padrao, qtd, pct: totalPadrao > 0 ? (qtd / totalPadrao) * 100 : 0 }))
    .sort((a, b) => b.qtd - a.qtd);
  const maxPadraoPct = Math.max(...porPadrao.map((p) => p.pct), 0);

  // Tabela Produção por Largura
  const larguraMap = registrosFiltrados.reduce((acc, r) => {
    const k = r.largura_cm ? String(r.largura_cm) : "N/D";
    acc[k] = (acc[k] ?? 0) + (Number(r.qtd_conforme) || 0);
    return acc;
  }, {} as Record<string, number>);
  const totalLargura = Object.values(larguraMap).reduce((a, b) => a + b, 0);
  const porLargura = Object.entries(larguraMap)
    .map(([largura, qtd]) => ({ largura, qtd, pct: totalLargura > 0 ? (qtd / totalLargura) * 100 : 0 }))
    .sort((a, b) => b.qtd - a.qtd);
  const maxLarguraPct = Math.max(...porLargura.map((l) => l.pct), 0);

  // ─── Materiais ───────────────────────────────────────────────────────────────

  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); }
  function openEdit(entry: MaterialEntry) {
    setEditingId(entry.id);
    setForm({
      material: entry.material, lote: entry.lote, quantidade: String(entry.quantidade),
      unidade: entry.unidade, fornecedor: entry.fornecedor,
      verificado: entry.conforme === null ? "pendente" : entry.conforme ? "conforme" : "nao_conforme",
      date: entry.date,
    });
    setDialogOpen(true);
  }
  function handleDelete(id: string) {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    toast.success("Material removido.");
  }
  function handleSave() {
    if (!form.material.trim() || !form.lote.trim() || !form.quantidade || !form.fornecedor.trim()) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    const qty = Number(form.quantidade);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantidade inválida."); return; }
    const verificado = form.verificado !== "pendente";
    const conforme = form.verificado === "pendente" ? null : form.verificado === "conforme";
    if (editingId) {
      setMaterials((prev) => prev.map((m) => m.id === editingId
        ? { ...m, material: form.material.trim(), lote: form.lote.trim(), quantidade: qty, unidade: form.unidade, fornecedor: form.fornecedor.trim(), verificado, conforme, date: form.date }
        : m));
      toast.success("Material atualizado.");
    } else {
      setMaterials((prev) => [{
        id: crypto.randomUUID(), date: form.date,
        material: form.material.trim(), lote: form.lote.trim(), quantidade: qty,
        unidade: form.unidade, fornecedor: form.fornecedor.trim(), verificado, conforme,
      }, ...prev]);
      toast.success("Material adicionado.");
    }
    setDialogOpen(false); setForm(EMPTY_FORM); setEditingId(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produção</p>
          <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>
            {abaAtiva === "portas" ? "Produção de Portas" : "Produção de Guarnição"}
          </h1>
        </div>
        <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
          <button
            onClick={() => setAbaAtiva("portas")}
            className={cn(
              "px-5 py-1.5 text-sm font-medium transition-colors",
              abaAtiva === "portas"
                ? "text-white"
                : "text-muted-foreground hover:bg-muted"
            )}
            style={abaAtiva === "portas" ? { backgroundColor: COR_VERDE } : {}}
          >
            Portas
          </button>
          <button
            onClick={() => setAbaAtiva("guarnicao")}
            className={cn(
              "px-5 py-1.5 text-sm font-medium transition-colors",
              abaAtiva === "guarnicao"
                ? "text-white"
                : "text-muted-foreground hover:bg-muted"
            )}
            style={abaAtiva === "guarnicao" ? { backgroundColor: COR_VERDE } : {}}
          >
            Guarnição
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Ano */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={String(anoFiltro)} onValueChange={(v) => setAnoFiltro(Number(v))}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mês */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mês / Dia</Label>
          <Select
            value={mesFiltro === null ? "__todos__" : String(mesFiltro)}
            onValueChange={(v) => setMesFiltro(v === "__todos__" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os meses</SelectItem>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Máquina multi-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Máquina</Label>
          <Popover open={maquinaPickerOpen} onOpenChange={setMaquinaPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-52 justify-between text-xs font-normal">
                <span className="truncate">
                  {maquinasFiltro.length === 0
                    ? "Seleções múltiplas"
                    : maquinasFiltro.length === 1
                      ? maquinasFiltro[0]
                      : `${maquinasFiltro.length} selecionadas`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {maquinasFiltro.length > 0 && (
                  <Button
                    variant="ghost" size="sm"
                    className="w-full justify-start text-xs text-muted-foreground h-7"
                    onClick={() => setMaquinasFiltro([])}
                  >
                    Limpar seleção
                  </Button>
                )}
                {maquinasDisponiveis.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma máquina encontrada.</p>
                )}
                {maquinasDisponiveis.map((maq) => (
                  <label key={maq} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={maquinasFiltro.includes(maq)}
                      onCheckedChange={(checked) => {
                        setMaquinasFiltro((prev) =>
                          checked ? [...prev, maq] : prev.filter((m) => m !== maq)
                        );
                      }}
                    />
                    <span className="text-xs">{maq}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando dados...
        </div>
      ) : (
        <>
          {/* ── Linha 1: KPI + Gráfico Mensal ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* KPI Qtd. Conforme */}
            <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
              <CardContent className="p-6 flex flex-col justify-center h-full min-h-[140px]">
                <p className="text-xs text-muted-foreground font-medium mb-2">Qtd. Conforme</p>
                <p className="text-6xl font-bold tracking-tight" style={{ color: COR_VERDE }}>
                  {totalGeral.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>

            {/* Gráfico Produção de Portas/Mês */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Produção de Portas/Mês</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {porMes.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    Sem dados no período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={porMes} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} Mil`} axisLine={false} tickLine={false} width={48} />
                      <Tooltip
                        formatter={(v: number) => [v.toLocaleString("pt-BR"), "Portas"]}
                        labelFormatter={(l) => `Mês: ${l}`}
                      />
                      <Bar dataKey="total" fill={COR_VERDE} radius={[3, 3, 0, 0]} barSize={48}
                        label={{ position: "top", fontSize: 10, fill: COR_VERDE, formatter: (v: number) => v > 0 ? v.toLocaleString("pt-BR") : "" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Linha 2: Gráfico Horizontal por Máquina ── */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Produção de Portas</CardTitle>
              <p className="text-[10px] text-muted-foreground">Máquina · Soma de Qtd. Conforme</p>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {porMaquina.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Sem dados no período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, porMaquina.length * 38)}>
                  <BarChart data={porMaquina} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)} Mil`}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 11 }}
                      width={200}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip formatter={(v: number) => [v.toLocaleString("pt-BR"), "Qtd. Conforme"]} />
                    <Bar dataKey="total" fill={COR_VERDE} radius={[0, 3, 3, 0]} barSize={20}
                      label={{ position: "right", fontSize: 10, fill: COR_VERDE, formatter: (v: number) => v.toLocaleString("pt-BR") }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ── Linha 3: 3 tabelas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Linha / Produto */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Linha / Produto</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>Linha</TableHead>
                      <TableHead className="text-xs font-semibold px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>Qtd. Conforme</TableHead>
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>% Linha Geral</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porLinha.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                          Sem dados
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {porLinha.map((item) => (
                          <TableRow key={item.linha} className="hover:bg-muted/40">
                            <TableCell className="text-xs px-4 py-1.5">{item.linha}</TableCell>
                            <TableCell className="text-xs px-2 py-1.5 text-right font-medium">
                              {item.qtd.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="px-4 py-1.5">
                              <DataBar value={item.pct} max={maxLinhaPct} label={`${item.pct.toFixed(2)}%`} />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-semibold bg-muted/30">
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>Total</TableCell>
                          <TableCell className="text-xs px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>
                            {totalGeral.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>
                            {porLinha.reduce((a, b) => a + b.pct, 0).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Produção por Padrão */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Produção por Padrão (cm)</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>Padrão</TableHead>
                      <TableHead className="text-xs font-semibold px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>Qtd. Conforme</TableHead>
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>% Padrão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porPadrao.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                          Sem dados
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {porPadrao.map((item) => (
                          <TableRow key={item.padrao} className="hover:bg-muted/40">
                            <TableCell className="text-xs px-4 py-1.5">{item.padrao}</TableCell>
                            <TableCell className="text-xs px-2 py-1.5 text-right font-medium">
                              {item.qtd.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="px-4 py-1.5">
                              <DataBar value={item.pct} max={maxPadraoPct} label={`${item.pct.toFixed(2)}%`} />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-semibold bg-muted/30">
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>Total</TableCell>
                          <TableCell className="text-xs px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>
                            {totalPadrao.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>
                            {porPadrao.reduce((a, b) => a + b.pct, 0).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Produção por Largura */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Produção por Largura (cm)</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>Largura (cm)</TableHead>
                      <TableHead className="text-xs font-semibold px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>Qtd. Conforme</TableHead>
                      <TableHead className="text-xs font-semibold px-4 py-1.5" style={{ color: COR_VERDE }}>% Largura (cm)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porLargura.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                          Sem dados
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {porLargura.map((item) => (
                          <TableRow key={item.largura} className="hover:bg-muted/40">
                            <TableCell className="text-xs px-4 py-1.5">{item.largura}</TableCell>
                            <TableCell className="text-xs px-2 py-1.5 text-right font-medium">
                              {item.qtd.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="px-4 py-1.5">
                              <DataBar value={item.pct} max={maxLarguraPct} label={`${item.pct.toFixed(2)}%`} />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t font-semibold bg-muted/30">
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>Total</TableCell>
                          <TableCell className="text-xs px-2 py-1.5 text-right" style={{ color: COR_VERDE }}>
                            {totalLargura.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs px-4 py-1.5" style={{ color: COR_VERDE }}>
                            {porLargura.reduce((a, b) => a + b.pct, 0).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Tabela de Materiais ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Recebimento de Materiais
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar Material
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">{m.material}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                  <TableCell>{m.quantidade} {m.unidade}</TableCell>
                  <TableCell>{m.fornecedor}</TableCell>
                  <TableCell>
                    {m.verificado
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  </TableCell>
                  <TableCell>
                    {m.conforme === null ? (
                      <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    ) : m.conforme ? (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Não Conforme</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog Material ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Material" : "Adicionar Material"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Material *</Label>
                <Input placeholder="Ex: MDF 15mm" maxLength={100} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Lote *</Label>
                <Input placeholder="Ex: L-2026-0341" maxLength={50} value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Peças</SelectItem>
                    <SelectItem value="chapas">Chapas</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="L">Litros</SelectItem>
                    <SelectItem value="m">Metros</SelectItem>
                    <SelectItem value="m2">m²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Popover open={matDatePickerOpen} onOpenChange={setMatDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(form.date, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.date} locale={ptBR} className="pointer-events-auto"
                      onSelect={(d) => { if (d) { setForm({ ...form, date: d }); setMatDatePickerOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fornecedor *</Label>
                <Input placeholder="Ex: Eucatex" maxLength={100} value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Verificação de Qualidade</Label>
                <Select value={form.verificado} onValueChange={(v: "pendente" | "conforme" | "nao_conforme") => setForm({ ...form, verificado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
