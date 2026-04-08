"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cog, Loader2, AlertCircle, RefreshCw, Plus, History, Pencil, FileText, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks,
  getDaysInMonth, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Maquina {
  id: number | string;
  nome?: string;
  status?: string;
  [key: string]: unknown;
}

interface RegistroProducao {
  data: string;
  maquina: string | null;
  qtd_conforme: number | null;
  qtd_nao_conforme_1: number | null;
  produto: string | null;
  linha: string | null;
  nucleo: string | null;
  padrao: string | null;
}

interface ColunaDef {
  key: keyof RegistroProducao;
  label: string;
  numeric?: boolean;
}

const COLUNAS_MAQUINA: Record<string, ColunaDef[]> = {
  "prensa fria": [
    { key: "produto", label: "Produto" },
    { key: "nucleo", label: "Núcleo" },
    { key: "padrao", label: "Cor" },
    { key: "qtd_conforme", label: "Quantidade", numeric: true },
  ],
  "colagem de borda": [
    { key: "linha", label: "Linha" },
    { key: "nucleo", label: "Núcleo" },
    { key: "padrao", label: "Cor" },
    { key: "qtd_conforme", label: "Quantidade", numeric: true },
    { key: "qtd_nao_conforme_1", label: "Qtd. Não Conforme", numeric: true },
  ],
  "esquadro": [
    { key: "linha", label: "Linha" },
    { key: "nucleo", label: "Núcleo" },
    { key: "padrao", label: "Cor" },
    { key: "qtd_conforme", label: "Quantidade", numeric: true },
  ],
};

const COLUNAS_DEFAULT: ColunaDef[] = [
  { key: "produto", label: "Produto" },
  { key: "linha", label: "Linha" },
  { key: "qtd_conforme", label: "Qtd. Conforme", numeric: true },
];

function getColunasParaMaquina(nomeMaquina: string): ColunaDef[] {
  const chave = nomeMaquina.trim().toLowerCase();
  for (const [k, cols] of Object.entries(COLUNAS_MAQUINA)) {
    if (chave.includes(k)) return cols;
  }
  return COLUNAS_DEFAULT;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSemanasMes(): { label: string; inicio: string; fim: string }[] {
  const inicio = startOfMonth(new Date());
  const semanas = [];
  for (let i = 0; i < 5; i++) {
    const seg = startOfWeek(addWeeks(inicio, i), { weekStartsOn: 1 });
    const sex = endOfWeek(seg, { weekStartsOn: 1 });
    const fimMes = endOfMonth(new Date());
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

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Histórico de Produção ────────────────────────────────────────────────────

type FiltroTipo = "dia" | "mes" | "ano";

function HistoricoSheet({ maquina, open, onClose }: {
  maquina: Maquina | null;
  open: boolean;
  onClose: () => void;
}) {
  const hoje = new Date();
  const [filtro, setFiltro] = useState<FiltroTipo>("mes");
  const [dia, setDia] = useState(String(hoje.getDate()).padStart(2, "0"));
  const [mes, setMes] = useState(String(hoje.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const [registros, setRegistros] = useState<RegistroProducao[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const buscarHistorico = useCallback(async () => {
    if (!maquina?.nome) return;
    setLoadingHist(true);

    let dataInicio = "";
    let dataFim = "";

    if (filtro === "dia") {
      dataInicio = `${ano}-${mes}-${dia}`;
      dataFim = dataInicio;
    } else if (filtro === "mes") {
      const d = new Date(Number(ano), Number(mes) - 1, 1);
      dataInicio = format(startOfMonth(d), "yyyy-MM-dd");
      dataFim = format(endOfMonth(d), "yyyy-MM-dd");
    } else {
      dataInicio = `${ano}-01-01`;
      dataFim = `${ano}-12-31`;
    }

    const nomeMaquina = (maquina.nome as string).trim();
    const { data, error } = await supabase
      .from("registros_producao")
      .select("data, maquina, qtd_conforme, qtd_nao_conforme_1, produto, linha, nucleo, padrao")
      .ilike("maquina", nomeMaquina)
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar histórico: " + error.message);
    } else {
      setRegistros(data ?? []);
    }
    setLoadingHist(false);
  }, [maquina, filtro, dia, mes, ano]);

  useEffect(() => {
    if (open && maquina) buscarHistorico();
  }, [open, maquina, buscarHistorico]);

  // Dados para o gráfico
  const dadosGrafico = (() => {
    if (filtro === "dia") {
      // Agrupa por produto no dia
      const mapa: Record<string, number> = {};
      for (const r of registros) {
        const key = r.produto || "Sem produto";
        mapa[key] = (mapa[key] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa).map(([label, producao]) => ({ label, producao }));
    }
    if (filtro === "mes") {
      const diasNoMes = getDaysInMonth(new Date(Number(ano), Number(mes) - 1, 1));
      const mapa: Record<string, number> = {};
      for (let d = 1; d <= diasNoMes; d++) {
        mapa[String(d).padStart(2, "0")] = 0;
      }
      for (const r of registros) {
        const d = r.data.slice(8, 10);
        mapa[d] = (mapa[d] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa).map(([label, producao]) => ({ label, producao }));
    }
    // ano: agrupa por mês
    const mapa: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      mapa[String(m).padStart(2, "0")] = 0;
    }
    for (const r of registros) {
      const m = r.data.slice(5, 7);
      mapa[m] = (mapa[m] ?? 0) + (Number(r.qtd_conforme) || 0);
    }
    return Object.entries(mapa).map(([m, producao]) => ({
      label: MESES[Number(m) - 1].slice(0, 3),
      producao,
    }));
  })();

  const total = registros.reduce((s, r) => s + (Number(r.qtd_conforme) || 0), 0);

  const anos = Array.from({ length: 5 }, (_, i) => String(hoje.getFullYear() - i));
  const diasDoMes = getDaysInMonth(new Date(Number(ano), Number(mes) - 1, 1));

  function gerarPDF() {
    const doc = new jsPDF();
    const nomeMaquina = (maquina?.nome as string) ?? "Máquina";

    let periodoLabel = "";
    if (filtro === "dia") {
      periodoLabel = `${dia}/${mes}/${ano}`;
    } else if (filtro === "mes") {
      periodoLabel = `${MESES[Number(mes) - 1]} / ${ano}`;
    } else {
      periodoLabel = ano;
    }

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Produção", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Máquina: ${nomeMaquina}`, 14, 30);
    doc.text(`Período: ${periodoLabel}`, 14, 37);
    doc.text(`Total de registros: ${registros.length}`, 14, 44);
    doc.text(`Total produzido: ${total.toLocaleString("pt-BR")} pç`, 14, 51);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 58);

    // Tabela de resumo (gráfico agrupado)
    const temDadosGrafico = dadosGrafico.some((d) => d.producao > 0);
    let yPos = 68;

    if (temDadosGrafico) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por período", 14, yPos);

      autoTable(doc, {
        startY: yPos + 4,
        head: [["Período", "Produção (pç)"]],
        body: dadosGrafico.map((d) => [
          d.label,
          d.producao.toLocaleString("pt-BR"),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 1: { halign: "right" } },
      });

      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // Tabela de registros detalhados
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Registros detalhados", 14, yPos);

    const colunasPDF = getColunasParaMaquina(nomeMaquina);
    autoTable(doc, {
      startY: yPos + 4,
      head: [["Data", ...colunasPDF.map((c) => c.label)]],
      body: registros.map((r) => [
        format(parseISO(r.data), "dd/MM/yyyy"),
        ...colunasPDF.map((c) => {
          const val = r[c.key];
          if (val === null || val === undefined || val === "") return "—";
          if (c.numeric) return Number(val).toLocaleString("pt-BR");
          return String(val);
        }),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const nomeArquivo = `relatorio-${norm(nomeMaquina).replace(/\s+/g, "-")}-${periodoLabel.replace(/[\s/]+/g, "-")}.pdf`;
    doc.save(nomeArquivo);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico — {(maquina?.nome as string) ?? ""}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="grid gap-1">
              <Label className="text-xs">Filtrar por</Label>
              <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroTipo)}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="ano">Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtro === "dia" && (
              <div className="grid gap-1">
                <Label className="text-xs">Dia</Label>
                <Select value={dia} onValueChange={setDia}>
                  <SelectTrigger className="h-8 text-xs w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: diasDoMes }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(filtro === "dia" || filtro === "mes") && (
              <div className="grid gap-1">
                <Label className="text-xs">Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1">
              <Label className="text-xs">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="h-8 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={buscarHistorico} disabled={loadingHist} className="h-8 gap-1.5">
              {loadingHist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Buscar
            </Button>

            {registros.length > 0 && (
              <Button size="sm" variant="outline" onClick={gerarPDF} className="h-8 gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Gerar PDF
              </Button>
            )}
          </div>

          {/* Resumo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{registros.length} registro(s)</span>
            <span className="font-semibold">{total.toLocaleString("pt-BR")} pç no total</span>
          </div>

          {/* Gráfico */}
          {dadosGrafico.some((d) => d.producao > 0) && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosGrafico} barSize={filtro === "ano" ? 20 : 10}>
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

          {/* Tabela */}
          {loadingHist ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : registros.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Nenhum registro encontrado para o período.
            </div>
          ) : (() => {
            const colunas = getColunasParaMaquina(maquina?.nome as string ?? "");
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    {colunas.map((c) => (
                      <TableHead key={c.key} className={`text-xs ${c.numeric ? "text-right" : ""}`}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{format(parseISO(r.data), "dd/MM/yyyy")}</TableCell>
                      {colunas.map((c) => {
                        const val = r[c.key];
                        const display = val === null || val === undefined || val === ""
                          ? "—"
                          : c.numeric
                          ? Number(val).toLocaleString("pt-BR")
                          : String(val);
                        return (
                          <TableCell key={c.key} className={`text-xs ${c.numeric ? "text-right font-medium" : ""}`}>
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Card de Máquina ──────────────────────────────────────────────────────────

function MaquinaCard({
  maquina,
  producaoPorSemana,
  totalMes,
  onClick,
  onEdit,
}: {
  maquina: Maquina;
  producaoPorSemana: { label: string; producao: number }[];
  totalMes: number;
  onClick: () => void;
  onEdit: (m: Maquina) => void;
}) {
  const nome = (maquina.nome as string) || `Máquina ${maquina.id}`;
  const status = (maquina.status as string) || null;
  const isAtiva =
    !status ||
    status.toLowerCase() === "ativa" ||
    status.toLowerCase() === "ativo" ||
    status.toLowerCase() === "active";

  return (
    <Card
      className={`flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 ${
        isAtiva ? "border-l-primary" : "border-l-muted-foreground/30"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAtiva ? "bg-primary/10" : "bg-muted"
            }`}>
              <Cog className={`h-5 w-5 ${isAtiva ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold leading-tight truncate">{nome}</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  isAtiva ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                }`} />
                <span className="text-xs text-muted-foreground">
                  {status ?? "Ativa"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(maquina); }}
            title="Editar nome"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1 pt-1">
        {/* Produção do mês em destaque */}
        <div className={`rounded-lg px-3 py-2 ${isAtiva ? "bg-primary/5" : "bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground mb-0.5">
            {format(new Date(), "MMMM yyyy", { locale: ptBR })}
          </p>
          <p className={`text-2xl font-bold leading-tight ${isAtiva ? "text-primary" : "text-muted-foreground"}`}>
            {totalMes.toLocaleString("pt-BR")}
            <span className="text-sm font-normal ml-1 text-muted-foreground">pç</span>
          </p>
        </div>

        {/* Mini gráfico */}
        {totalMes > 0 ? (
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={producaoPorSemana} barSize={14}>
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
        ) : (
          <div className="h-[72px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Sem registros no mês
          </div>
        )}

        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60 mt-auto pt-1">
          <History className="h-3 w-3" />
          Ver histórico completo
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

const EMPTY_MAQUINA = { nome: "" };

export default function MaquinasPage() {
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
  const [busca, setBusca] = useState("");

  const semanas = getSemanasMes();

  const fetchDados = useCallback(async (setSpin: (v: boolean) => void) => {
    setSpin(true);
    setErro(null);

    const dataInicio = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const dataFim    = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const { data: maquinasData, error: err1 } = await supabase.from("maquinas").select("*").order("nome");
    if (err1) { setErro(err1.message); setSpin(false); return; }
    setMaquinas(maquinasData ?? []);

    type Registro = { maquina: string | null; data: string | null; qtd_conforme: number | null };
    const registros: Registro[] = [];
    const TAM_PAG = 1000;
    let pagina = 0;
    while (true) {
      const { data: lote, error: err2 } = await supabase
        .from("registros_producao")
        .select("maquina, data, qtd_conforme")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .range(pagina * TAM_PAG, (pagina + 1) * TAM_PAG - 1);
      if (err2) { setErro(err2.message); setSpin(false); return; }
      if (!lote || lote.length === 0) break;
      registros.push(...lote);
      if (lote.length < TAM_PAG) break;
      pagina++;
    }

    const mapa: Record<string, Record<string, number>> = {};
    for (const r of registros ?? []) {
      if (!r.maquina || !r.data) continue;
      const chave = norm(r.maquina);
      const qtd = Number(r.qtd_conforme) || 0;
      const semana = semanas.find((s) => r.data >= s.inicio && r.data <= s.fim);
      if (!semana) continue;
      if (!mapa[chave]) mapa[chave] = {};
      mapa[chave][semana.label] = (mapa[chave][semana.label] ?? 0) + qtd;
    }

    setProducao(mapa);
    setSpin(false);
  }, []);

  useEffect(() => { fetchDados(setLoading); }, [fetchDados]);

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
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando máquinas...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>Erro ao carregar: {erro}</span>
      </div>
    );
  }

  if (maquinas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma máquina encontrada.
      </div>
    );
  }

  const totalGeralMes = Object.values(producao).reduce((acc, mapa) => {
    return acc + Object.values(mapa).reduce((s, v) => s + v, 0);
  }, 0);
  const totalAtivas = maquinas.filter((m) => {
    const s = (m.status as string)?.toLowerCase();
    return !s || s === "ativa" || s === "ativo" || s === "active";
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Cabeçalho resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Total de Máquinas</p>
          <p className="text-2xl font-bold text-foreground">{maquinas.length}</p>
          <p className="text-xs text-muted-foreground">{totalAtivas} ativas</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Produção no Mês</p>
          <p className="text-2xl font-bold text-primary">{totalGeralMes.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">peças conformes</p>
        </Card>
        <Card className="px-4 py-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Período</p>
          <p className="text-sm font-semibold text-foreground capitalize">
            {format(new Date(), "MMMM yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground">{semanas.length} semanas</p>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar máquina..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 h-8 w-48 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchDados(setSyncing)}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
        <Button
          size="sm"
          onClick={() => { setForm(EMPTY_MAQUINA); setDialogOpen(true); }}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Máquina
        </Button>
      </div>

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
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {maquinas.filter((m) => norm(m.nome ?? "").includes(norm(busca))).map((m) => {
          const chave = norm(m.nome ?? "");
          const dadosMaquina = producao[chave] ?? {};
          const producaoPorSemana = semanas.map((s) => ({
            label: s.label,
            producao: dadosMaquina[s.label] ?? 0,
          }));
          const totalMes = producaoPorSemana.reduce((acc, s) => acc + s.producao, 0);

          return (
            <MaquinaCard
              key={m.id}
              maquina={m}
              producaoPorSemana={producaoPorSemana}
              totalMes={totalMes}
              onClick={() => setMaquinaSelecionada(m)}
              onEdit={abrirEdicao}
            />
          );
        })}
      </div>
    </div>
  );
}
