"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Pencil, FileText, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_CONCREM_B64 } from "@/lib/logoBase64";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, getDaysInMonth, parseISO } from "date-fns";
import type { Maquina } from "./types";
import { type ColunaDef, getColunasParaMaquina } from "./colunasMaquina";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface RegistroProducao {
  id: number;
  data: string;
  hora_inicial: string | null;
  hora_final: string | null;
  maquina: string | null;
  produto: string | null;
  linha: string | null;
  nucleo: string | null;
  padrao: string | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  espessura_mm: number | null;
  qtd_conforme: number | null;
  qtd_nao_conforme_1: number | null;
  [key: string]: unknown;
}

function fmtCelula(val: unknown, col: ColunaDef): string {
  if (val == null || val === "") return "—";
  if (col.date) { try { return format(parseISO(String(val)), "dd/MM/yyyy"); } catch { return String(val); } }
  if (col.numeric) { const n = Number(val); return isNaN(n) ? String(val) : n.toLocaleString("pt-BR"); }
  const s = String(val);
  return col.uppercase ? s.toUpperCase() : s;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.trim().toLowerCase();
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Histórico de Produção ────────────────────────────────────────────────────

export function HistoricoSheet({ maquina, open, onClose, canEdit }: {
  maquina: Maquina | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const hoje = new Date();
  const [anoFiltro, setAnoFiltro] = useState<string>(String(hoje.getFullYear()));
  const histReqRef = useRef(0);
  const [todosMD, setTodosMD] = useState<boolean>(true);
  const [selecaoMD, setSelecaoMD] = useState<Set<string>>(new Set());
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set());
  const [todosRegistros, setTodosRegistros] = useState<RegistroProducao[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [editReg, setEditReg] = useState<RegistroProducao | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  // Filtro por coluna (estilo planilha) — uma entrada de texto por coluna,
  // aplicada em cima do filtro de Ano/Mês/Dia já existente (não substitui).
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, string>>({});

  const colunas = getColunasParaMaquina(maquina?.nome ?? "");

  // Colunas mudam por máquina — filtros de coluna de uma máquina não fazem
  // sentido pra outra, então limpa ao trocar (evita filtro "fantasma" preso).
  useEffect(() => { setFiltrosColuna({}); }, [maquina?.id]);

  // Filtragem client-side por mês/dia
  const registrosPeriodo = todosMD
    ? todosRegistros
    : todosRegistros.filter(r => {
        const mm = r.data.slice(5, 7);
        const dd = r.data.slice(8, 10);
        return selecaoMD.has(mm) || selecaoMD.has(`${mm}-${dd}`);
      });

  const temFiltroColuna = Object.values(filtrosColuna).some(v => v?.trim());
  const registros = temFiltroColuna
    ? registrosPeriodo.filter(r => colunas.every(col => {
        const termo = filtrosColuna[col.key]?.trim().toLowerCase();
        if (!termo) return true;
        return fmtCelula((r as Record<string, unknown>)[col.key], col).toLowerCase().includes(termo);
      }))
    : registrosPeriodo;

  const buscarHistorico = useCallback(async () => {
    if (!maquina?.nome) return;
    histReqRef.current += 1;
    const myReq = histReqRef.current;
    setLoadingHist(true);

    const nomeMaquina = (maquina.nome as string).trim();
    const nomeAlternativo = /alizar/i.test(nomeMaquina)
      ? nomeMaquina.replace(/alizar/gi, "ALIZA")
      : null;
    const nomesQuery = nomeAlternativo ? [nomeMaquina, nomeAlternativo] : [nomeMaquina];
    const TAM = 1000;
    let pagina = 0;
    const todos: RegistroProducao[] = [];

    while (true) {
      let query = supabase
        .from("registros_producao")
        .select("*")
        .in("maquina", nomesQuery)
        .order("data", { ascending: false })
        .order("hora_inicial", { ascending: true, nullsFirst: false })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);

      if (anoFiltro !== "todos") {
        query = query.gte("data", `${anoFiltro}-01-01`).lte("data", `${anoFiltro}-12-31`);
      }

      const { data, error } = await query;
      if (myReq !== histReqRef.current) return;
      if (error) {
        toast.error("Erro ao buscar histórico: " + error.message);
        break;
      }
      if (!data || data.length === 0) break;
      todos.push(...data);
      if (data.length < TAM) break;
      pagina++;
    }

    if (myReq !== histReqRef.current) return;
    setTodosRegistros(todos);
    setLoadingHist(false);
  }, [maquina, anoFiltro]);

  useEffect(() => {
    if (open && maquina) buscarHistorico();
  }, [open, maquina, buscarHistorico]);

  // Dados para o gráfico — agrupa por dia se apenas 1 mês, por ano-mês se "todos", por mês caso contrário
  const dadosGrafico = (() => {
    const MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

    const anosComDados = new Set(registros.map(r => r.data.slice(0, 4)));
    const mesesComDados = new Set(registros.map(r => r.data.slice(5, 7)));

    // Um único mês → mostra por dia
    if (anosComDados.size <= 1 && mesesComDados.size <= 1 && registros.length > 0) {
      const mm = [...mesesComDados][0];
      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
      const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
      const mapa: Record<string, number> = {};
      for (let d = 1; d <= diasNo; d++) mapa[String(d).padStart(2, "0")] = 0;
      for (const r of registros) {
        const d = r.data.slice(8, 10);
        mapa[d] = (mapa[d] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([label, producao]) => ({ label, producao }));
    }

    // "Todos" ou múltiplos anos → agrupa por ano-mês ordenado cronologicamente
    if (anoFiltro === "todos" || anosComDados.size > 1) {
      const mapa: Record<string, number> = {};
      for (const r of registros) {
        const ym = r.data.slice(0, 7); // "2024-01"
        mapa[ym] = (mapa[ym] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, producao]) => {
          const [ano, mm] = ym.split("-");
          return { label: `${MESES_PT[Number(mm) - 1]}/${ano.slice(2)}`, producao };
        });
    }

    // Ano específico → agrupa por mês, ordenado numericamente
    const mapa: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) mapa[String(m).padStart(2, "0")] = 0;
    for (const r of registros) {
      const m = r.data.slice(5, 7);
      mapa[m] = (mapa[m] ?? 0) + (Number(r.qtd_conforme) || 0);
    }
    // Limite: ano atual → até o mês corrente; ano passado → até o último mês com dados
    const ultimoComDados = Object.entries(mapa)
      .filter(([, v]) => v > 0).map(([m]) => Number(m))
      .reduce((max, m) => Math.max(max, m), 0);
    const limite = anoFiltro === String(hoje.getFullYear())
      ? Math.max(hoje.getMonth() + 1, ultimoComDados)
      : ultimoComDados || 12;
    return Object.entries(mapa)
      .sort(([a], [b]) => Number(a) - Number(b))
      .filter(([m]) => Number(m) <= limite)
      .map(([m, producao]) => ({
        label: MESES[Number(m) - 1].slice(0, 3),
        producao,
      }));
  })();

  const total = registros.reduce((s, r) => s + (Number(r.qtd_conforme) || 0), 0);

  const anos = Array.from({ length: 5 }, (_, i) => String(hoje.getFullYear() - i));

  const labelMesDia = todosMD ? "Todos" : selecaoMD.size === 0 ? "Nenhum" : `${selecaoMD.size} selecionado(s)`;

  function toggleTodos() {
    setTodosMD(p => !p);
    setSelecaoMD(new Set());
  }

  function toggleMes(mm: string) {
    setTodosMD(false);
    setSelecaoMD(prev => {
      const next = new Set(prev);
      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
      const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
      if (next.has(mm)) {
        next.delete(mm);
        for (let d = 1; d <= diasNo; d++) next.delete(`${mm}-${String(d).padStart(2, "0")}`);
      } else {
        next.add(mm);
        for (let d = 1; d <= diasNo; d++) next.delete(`${mm}-${String(d).padStart(2, "0")}`);
      }
      return next;
    });
  }

  function toggleDia(mm: string, dd: string) {
    setTodosMD(false);
    setSelecaoMD(prev => {
      const next = new Set(prev);
      const key = `${mm}-${dd}`;
      if (next.has(mm)) {
        next.delete(mm);
        const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
        const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
        for (let d = 1; d <= diasNo; d++) {
          const dk = `${mm}-${String(d).padStart(2, "0")}`;
          if (dk !== key) next.add(dk);
        }
      } else if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleExpandir(mm: string) {
    setMesesExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(mm)) next.delete(mm); else next.add(mm);
      return next;
    });
  }

  function gerarPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const nomeMaquina = (maquina?.nome as string) ?? "Máquina";
    const periodoLabel = todosMD
      ? (anoFiltro === "todos" ? "Todos os períodos" : anoFiltro)
      : anoFiltro;

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const green: [number, number, number] = [26, 91, 46];

    // ─── CABEÇALHO ──────────────────────────────────────────────────
    // Logo (proporção original: 3134×695 → 68×15mm)
    doc.addImage(LOGO_CONCREM_B64, "PNG", margin, 7, 68, 15);

    // Título e dados à direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("RELATÓRIO DE PRODUÇÃO", pageW - margin, 13, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Máquina: ${nomeMaquina}`, pageW - margin, 19, { align: "right" });
    doc.text(`Período: ${periodoLabel}`, pageW - margin, 24, { align: "right" });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW - margin, 29, { align: "right" });

    // Linha separadora verde
    doc.setFillColor(...green);
    doc.rect(margin, 32, pageW - margin * 2, 0.7, "F");

    // ─── BOXES DE KPI ───────────────────────────────────────────────
    const kpis = [
      { label: "TOTAL DE REGISTROS", value: registros.length.toString() },
      { label: "TOTAL PRODUZIDO", value: `${total.toLocaleString("pt-BR")} pç` },
      { label: "PERÍODO", value: periodoLabel },
      { label: "GERADO EM", value: format(new Date(), "dd/MM/yyyy HH:mm") },
    ];
    const boxCount = kpis.length;
    const boxGap = 3;
    const boxW = (pageW - margin * 2 - boxGap * (boxCount - 1)) / boxCount;
    const boxH = 19;
    const boxY = 36;

    kpis.forEach((kpi, i) => {
      const boxX = margin + i * (boxW + boxGap);
      doc.setFillColor(242, 247, 242);
      doc.setDrawColor(210, 225, 212);
      doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, boxX + boxW / 2, boxY + 6.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(26, 26, 26);
      doc.text(kpi.value, boxX + boxW / 2, boxY + 14, { align: "center" });
    });

    let yPos = boxY + boxH + 8;

    // ─── RESUMO POR PERÍODO ─────────────────────────────────────────
    const temDadosGrafico = dadosGrafico.some((d) => d.producao > 0);
    if (temDadosGrafico) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text("Resumo por Período", margin, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        head: [["Período", "Produção (pç)"]],
        body: dadosGrafico.map((d) => [d.label, d.producao.toLocaleString("pt-BR")]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [242, 247, 242] },
        columnStyles: { 1: { halign: "right" } },
        tableWidth: 85,
      });

      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // ─── REGISTROS DETALHADOS ───────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("Registros Detalhados", margin, yPos);

    const colunasPDF = getColunasParaMaquina(nomeMaquina);
    const muitasColunas = colunasPDF.length > 12;
    autoTable(doc, {
      startY: yPos + 3,
      head: [colunasPDF.map((col) => col.label)],
      body: registros.map((r) =>
        colunasPDF.map((col) => fmtCelula((r as Record<string, unknown>)[col.key], col))
      ),
      styles: {
        fontSize: muitasColunas ? 6 : 7.5,
        cellPadding: muitasColunas ? 1.2 : 2,
        overflow: "ellipsize",
        minCellHeight: 5,
      },
      headStyles: {
        fillColor: green,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        overflow: "ellipsize",
        minCellHeight: 6,
        halign: "center",
      },
      alternateRowStyles: { fillColor: [242, 247, 242] },
      margin: { left: margin, right: margin },
    });

    // ─── RODAPÉ COM NÚMERO DE PÁGINA ────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `Página ${p} de ${totalPages}  —  Concrem Portas Premium`,
        pageW / 2,
        pageH - 5,
        { align: "center" }
      );
    }

    const nomeArquivo = `relatorio-${norm(nomeMaquina).replace(/\s+/g, "-")}-${periodoLabel.replace(/[\s/]+/g, "-")}.pdf`;
    doc.save(nomeArquivo);
  }

  function gerarExcel() {
    const nomeMaquina = (maquina?.nome as string) ?? "Máquina";
    const periodoLabel = todosMD
      ? (anoFiltro === "todos" ? "todos" : anoFiltro)
      : anoFiltro;

    const colunasXLS = getColunasParaMaquina(nomeMaquina);
    const cabecalho = colunasXLS.map((col) => col.label);
    const linhas = registros.map((r) =>
      colunasXLS.map((col) => {
        const val = (r as Record<string,unknown>)[col.key];
        if (val == null || val === "") return "";
        if (col.date) { try { return format(parseISO(String(val)), "dd/MM/yyyy"); } catch { return String(val); } }
        if (col.numeric) { const n = Number(val); return isNaN(n) ? String(val) : n; }
        return String(val);
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomeMaquina.slice(0, 31));

    const nomeArquivo = `relatorio-${norm(nomeMaquina).replace(/\s+/g, "-")}-${periodoLabel}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  function openEdit(r: RegistroProducao) {
    setEditReg(r);
    setEditForm({ ...r });
  }

  async function salvarEdicao() {
    if (!editReg) return;
    setSavingEdit(true);
    const colunas = getColunasParaMaquina(maquina?.nome ?? "");
    const payload: Record<string, unknown> = {};
    for (const col of colunas) {
      const raw = editForm[col.key];
      if (col.numeric) {
        payload[col.key] = raw === "" || raw === undefined || raw === null ? null : Number(raw);
      } else {
        payload[col.key] = raw === "" ? null : (raw ?? null);
      }
    }
    const { error } = await supabase.from("registros_producao").update(payload).eq("id", editReg.id);
    setSavingEdit(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Registro atualizado.");
    setEditReg(null);
    buscarHistorico();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[90vw] w-full h-[85vh] flex flex-col gap-0 p-0 overflow-hidden mt-[72px]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Produção — {(maquina?.nome as string) ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0 overflow-y-auto px-6 py-4 space-y-4 max-h-[280px]">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Ano */}
            <div className="grid gap-1">
              <Label className="text-xs">Ano</Label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-8 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mês, Dia — tree select */}
            <div className="grid gap-1">
              <Label className="text-xs">Mês, Dia</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 text-xs w-44 border border-input rounded-md px-2 flex items-center justify-between bg-background hover:bg-accent transition-colors"
                  >
                    <span className="truncate">{labelMesDia}</span>
                    <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-52" align="start">
                  <div className="max-h-72 overflow-y-auto text-xs">
                    {/* Selecionar tudo */}
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                      <input type="checkbox" checked={todosMD} onChange={toggleTodos} className="h-3.5 w-3.5 accent-primary" />
                      <span>Selecionar tudo</span>
                    </label>
                    <div className="border-t my-0.5" />
                    {/* Meses */}
                    {MESES.map((nomeMes, i) => {
                      const mm = String(i + 1).padStart(2, "0");
                      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
                      const diasNo = getDaysInMonth(new Date(anoNum, i, 1));
                      const checkedMes = todosMD || selecaoMD.has(mm);
                      const indetermMes = !todosMD && !selecaoMD.has(mm) &&
                        Array.from({ length: diasNo }, (_, d) => String(d + 1).padStart(2, "0"))
                          .some(d => selecaoMD.has(`${mm}-${d}`));
                      const expandido = mesesExpandidos.has(mm);
                      return (
                        <div key={mm}>
                          <div className="flex items-center gap-1 px-2 py-1 hover:bg-accent">
                            <button
                              type="button"
                              onClick={() => toggleExpandir(mm)}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {expandido
                                ? <ChevronDown className="h-3 w-3" />
                                : <ChevronRight className="h-3 w-3" />}
                            </button>
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={checkedMes}
                                ref={el => { if (el) el.indeterminate = indetermMes; }}
                                onChange={() => toggleMes(mm)}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              {nomeMes.toLowerCase()}
                            </label>
                          </div>
                          {expandido && (
                            <div className="pl-8">
                              {Array.from({ length: diasNo }, (_, d) => {
                                const dd = String(d + 1).padStart(2, "0");
                                const checkedDia = todosMD || selecaoMD.has(mm) || selecaoMD.has(`${mm}-${dd}`);
                                return (
                                  <label key={dd} className="flex items-center gap-2 px-3 py-0.5 hover:bg-accent cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checkedDia}
                                      onChange={() => toggleDia(mm, dd)}
                                      className="h-3.5 w-3.5 accent-primary"
                                    />
                                    {d + 1}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button size="sm" onClick={buscarHistorico} disabled={loadingHist} className="h-8 gap-1.5">
              {loadingHist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Buscar
            </Button>

            {registros.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={gerarPDF} className="h-8 gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={gerarExcel} className="h-8 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </>
            )}
          </div>

          {/* Resumo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              {registros.length} registro(s)
              {temFiltroColuna && (
                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-1.5" onClick={() => setFiltrosColuna({})}>
                  Limpar filtros de coluna
                </Button>
              )}
            </span>
            <span className="font-semibold">{total.toLocaleString("pt-BR")} pç no total</span>
          </div>

          {/* Gráfico */}
          {dadosGrafico.some((d) => d.producao > 0) && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosGrafico} barSize={dadosGrafico.length <= 12 ? 20 : 10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                  formatter={(v: number) => [v.toLocaleString("pt-BR") + " pç", "Produção"]}
                />
                <Bar dataKey="producao" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

        {/* Tabela */}
        <div
          className="flex-1 min-h-0 border-t"
          style={{ overflowX: "scroll", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(120,120,120,0.5) transparent" }}
        >
            {loadingHist ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : registrosPeriodo.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum registro encontrado para o período.
              </div>
            ) : (
                  <table className="w-full min-w-max text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {colunas.map((col) => (
                          <th key={col.key} style={col.wide ? {minWidth: 280} : undefined} className={`px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap${col.numeric ? " text-right" : " text-left"}`}>
                            {col.label}
                          </th>
                        ))}
                        {canEdit && <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Ações</th>}
                      </tr>
                      {/* Filtro por coluna (estilo planilha) — uma linha de entradas de texto abaixo do cabeçalho. */}
                      <tr className="border-b bg-muted/20">
                        {colunas.map((col) => (
                          <th key={`filtro-${col.key}`} style={col.wide ? {minWidth: 280} : undefined} className="px-2 py-1.5 font-normal">
                            <input
                              type="text"
                              value={filtrosColuna[col.key] ?? ""}
                              onChange={(e) => setFiltrosColuna(prev => ({ ...prev, [col.key]: e.target.value }))}
                              placeholder="Filtrar..."
                              className="h-6 w-full text-[11px] border border-input rounded px-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </th>
                        ))}
                        {canEdit && <th className="px-2 py-1.5" />}
                      </tr>
                    </thead>
                    <tbody>
                      {registros.length === 0 ? (
                        <tr>
                          <td colSpan={colunas.length + (canEdit ? 1 : 0)} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Nenhum registro encontrado para os filtros de coluna.
                          </td>
                        </tr>
                      ) : registros.map((r, i) => (
                        <tr key={r.id} className={`border-b hover:bg-muted/30 transition-colors${i % 2 === 0 ? "" : " bg-muted/10"}`}>
                          {colunas.map((col, ci) => (
                            <td key={col.key} style={col.wide ? {minWidth: 280} : undefined} className={`px-3 py-2 text-xs whitespace-nowrap${col.numeric ? " text-right tabular-nums" : ""}`}>
                              {ci === 0 && canEdit ? (
                                <span className="inline-flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => openEdit(r)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  {fmtCelula((r as Record<string,unknown>)[col.key], col)}
                                </span>
                              ) : fmtCelula((r as Record<string,unknown>)[col.key], col)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog de edição de registro */}
    <Dialog open={!!editReg} onOpenChange={(v) => { if (!v) setEditReg(null); }}>
      <DialogContent className="sm:max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Editar Registro</DialogTitle>
        </DialogHeader>
        {editReg && (() => {
          const colunasEdit = getColunasParaMaquina(maquina?.nome ?? "");
          return (
            <div className="max-h-[60vh] overflow-y-auto py-2 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {colunasEdit.map((col) => {
                  const inputType = col.date
                    ? "date"
                    : (col.key === "hora_inicial" || col.key === "hora_final")
                      ? "time"
                      : col.numeric
                        ? "number"
                        : "text";
                  return (
                    <div key={col.key} className="space-y-1.5">
                      <Label className="text-xs">{col.label}</Label>
                      {col.options ? (
                        <Select
                          value={String(editForm[col.key] ?? "")}
                          onValueChange={(v) => setEditForm(prev => ({ ...prev, [col.key]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {col.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={inputType}
                          value={String(editForm[col.key] ?? "")}
                          onChange={(e) => setEditForm(prev => ({ ...prev, [col.key]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={salvarEdicao} disabled={savingEdit}>
            {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
