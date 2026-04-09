"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle2, XCircle, AlertTriangle, Package,
  ClipboardCheck, Plus, Pencil, Trash2, CalendarIcon, Scale, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Constantes ───────────────────────────────────────────────────────────────

const COR_VERDE = "#216C3B";
const COR_VERDE_CLARO = "rgba(33,108,59,0.22)";

const MAQUINAS_GRAMATURA = [
  "Coladeira de Alizar 1",
  "Coladeira de Alizar 2",
  "Recobridora de Perfil - Unesa 1",
  "Recobridora de Perfil - Unesa 2",
  "Recobridora de Perfil - Gaidzinks",
  "Recobridora de Tampo",
];

const PRODUTOS_GRAMATURA = [
  "Bianco", "Blue", "Capuccino", "Carvalho", "Elo Curupixá", "Elo Branco",
  "ML Curupixá", "Fendi", "Velar", "Freijó Natural", "FL 100", "FL 120",
  "FL 140", "FL 180", "ML Freijó", "Grafite", "Green", "ML Imbuia", "Italy",
  "Marfin", "Mocaccino", "MTX", "Nero", "Lacca Pet Blanco", "Urban",
  "Marrone", "Curupixa Terra", "Outro",
];

// Abreviações para o gráfico (nomes longos ficam ilegíveis)
function abreviarMaquina(nome: string): string {
  return nome
    .replace("Recobridora de Perfil - ", "Recob. ")
    .replace("Coladeira de Alizar", "Col. Alizar");
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface GramaturaEntry {
  id: number;
  data: string;        // "yyyy-MM-dd"
  maquina: string;
  produto: string;
  gramatura: number;   // g/m²
  operador: string;
  observacao: string;
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

// ─── Dados estáticos (aba Materiais ainda usa mock) ───────────────────────────

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

// ─── Formulários vazios ───────────────────────────────────────────────────────

const EMPTY_GRAM_FORM = {
  data: new Date(),
  maquina: "",
  produto: "",
  gramatura: "",
  operador: "",
  observacao: "",
};

const EMPTY_MAT_FORM = {
  material: "", lote: "", quantidade: "", unidade: "pcs",
  fornecedor: "", verificado: "pendente" as "pendente" | "conforme" | "nao_conforme",
  date: new Date(),
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface QualidadePageProps {
  subSection?: string;
}

export default function QualidadePage({ subSection = "gramatura" }: QualidadePageProps) {
  const aba = subSection;

  // ── Gramatura (Supabase) ──
  const [gramaturas, setGramaturas] = useState<GramaturaEntry[]>([]);
  const [loadingGram, setLoadingGram] = useState(false);
  const [gramDialogOpen, setGramDialogOpen] = useState(false);
  const [gramEditingId, setGramEditingId] = useState<number | null>(null);
  const [gramForm, setGramForm] = useState(EMPTY_GRAM_FORM);
  const [gramDatePickerOpen, setGramDatePickerOpen] = useState(false);
  const [savingGram, setSavingGram] = useState(false);

  // ── Materiais (mock) ──
  const [materials, setMaterials] = useState<MaterialEntry[]>(INITIAL_MATERIALS);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [matEditingId, setMatEditingId] = useState<string | null>(null);
  const [matForm, setMatForm] = useState(EMPTY_MAT_FORM);
  const [matDatePickerOpen, setMatDatePickerOpen] = useState(false);

  // ─── Fetch Gramatura ─────────────────────────────────────────────────────

  const fetchGramaturas = useCallback(async () => {
    setLoadingGram(true);
    const { data, error } = await supabase
      .from("qualidade_gramatura")
      .select("*")
      .order("data", { ascending: false })
      .order("id", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar medições: " + error.message);
    } else {
      setGramaturas(data ?? []);
    }
    setLoadingGram(false);
  }, []);

  useEffect(() => {
    if (aba === "gramatura") fetchGramaturas();
  }, [aba, fetchGramaturas]);

  // ─── Derivações Gramatura ─────────────────────────────────────────────────

  const totalMedicoes = gramaturas.length;
  const mediaGeral = totalMedicoes > 0
    ? gramaturas.reduce((s, g) => s + Number(g.gramatura), 0) / totalMedicoes
    : 0;

  // Média por máquina para o gráfico
  const mediaPorMaquina = Object.entries(
    gramaturas.reduce((acc, g) => {
      if (!acc[g.maquina]) acc[g.maquina] = { soma: 0, n: 0 };
      acc[g.maquina].soma += Number(g.gramatura);
      acc[g.maquina].n += 1;
      return acc;
    }, {} as Record<string, { soma: number; n: number }>)
  )
    .map(([maquina, { soma, n }]) => ({
      label: abreviarMaquina(maquina),
      maquina,
      media: Math.round((soma / n) * 100) / 100,
    }))
    .sort((a, b) => b.media - a.media);

  // ─── Derivações Materiais ─────────────────────────────────────────────────

  const naoConformes = materials.filter((m) => m.conforme === false);
  const pendentes = materials.filter((m) => !m.verificado);
  const entriesForDate = selectedDate
    ? materials.filter((m) => format(m.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"))
    : [];
  const modifiers = { hasEntries: materials.map((m) => m.date) };
  const modifiersStyles = {
    hasEntries: {
      fontWeight: 700 as const,
      textDecoration: "underline" as const,
      textDecorationColor: "hsl(var(--primary))" as const,
      textUnderlineOffset: "4px" as const,
    },
  };

  // ─── Handlers Gramatura ───────────────────────────────────────────────────

  function openGramAdd() {
    setGramEditingId(null);
    setGramForm(EMPTY_GRAM_FORM);
    setGramDialogOpen(true);
  }

  function openGramEdit(g: GramaturaEntry) {
    setGramEditingId(g.id);
    setGramForm({
      data: new Date(g.data + "T00:00:00"),
      maquina: g.maquina,
      produto: g.produto,
      gramatura: String(g.gramatura),
      operador: g.operador,
      observacao: g.observacao,
    });
    setGramDialogOpen(true);
  }

  async function handleGramDelete(id: number) {
    const { error } = await supabase.from("qualidade_gramatura").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido.");
    fetchGramaturas();
  }

  async function handleGramSave() {
    const gramValue = Number(gramForm.gramatura);
    if (!gramForm.maquina || !gramForm.produto || !gramForm.operador.trim()) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    if (isNaN(gramValue) || gramValue <= 0) {
      toast.error("Gramatura inválida."); return;
    }
    setSavingGram(true);
    const payload = {
      data: format(gramForm.data, "yyyy-MM-dd"),
      maquina: gramForm.maquina,
      produto: gramForm.produto,
      gramatura: gramValue,
      operador: gramForm.operador.trim(),
      observacao: gramForm.observacao.trim(),
    };
    const { error } = gramEditingId !== null
      ? await supabase.from("qualidade_gramatura").update(payload).eq("id", gramEditingId)
      : await supabase.from("qualidade_gramatura").insert(payload);
    setSavingGram(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(gramEditingId !== null ? "Registro atualizado." : "Medição registrada.");
    setGramDialogOpen(false);
    setGramForm(EMPTY_GRAM_FORM);
    setGramEditingId(null);
    fetchGramaturas();
  }

  // ─── Handlers Materiais ───────────────────────────────────────────────────

  function openMatAdd() { setMatEditingId(null); setMatForm(EMPTY_MAT_FORM); setMatDialogOpen(true); }

  function openMatEdit(m: MaterialEntry) {
    setMatEditingId(m.id);
    setMatForm({
      material: m.material, lote: m.lote, quantidade: String(m.quantidade),
      unidade: m.unidade, fornecedor: m.fornecedor,
      verificado: m.conforme === null ? "pendente" : m.conforme ? "conforme" : "nao_conforme",
      date: m.date,
    });
    setMatDialogOpen(true);
  }

  function handleMatDelete(id: string) {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    toast.success("Material removido.");
  }

  function handleMatSave() {
    if (!matForm.material.trim() || !matForm.lote.trim() || !matForm.quantidade || !matForm.fornecedor.trim()) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    const qty = Number(matForm.quantidade);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantidade inválida."); return; }
    const verificado = matForm.verificado !== "pendente";
    const conforme = matForm.verificado === "pendente" ? null : matForm.verificado === "conforme";
    if (matEditingId) {
      setMaterials((prev) => prev.map((m) => m.id === matEditingId
        ? { ...m, material: matForm.material.trim(), lote: matForm.lote.trim(), quantidade: qty, unidade: matForm.unidade, fornecedor: matForm.fornecedor.trim(), verificado, conforme, date: matForm.date }
        : m));
      toast.success("Material atualizado.");
    } else {
      setMaterials((prev) => [{
        id: crypto.randomUUID(), date: matForm.date,
        material: matForm.material.trim(), lote: matForm.lote.trim(),
        quantidade: qty, unidade: matForm.unidade,
        fornecedor: matForm.fornecedor.trim(), verificado, conforme,
      }, ...prev]);
      toast.success("Material adicionado.");
    }
    setMatDialogOpen(false);
    setMatForm(EMPTY_MAT_FORM);
    setMatEditingId(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Título da sub-seção */}
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Controle de Qualidade</p>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>
          {aba === "gramatura" ? "Gramatura" : "Recebimento de Materiais"}
        </h1>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ABA GRAMATURA
      ════════════════════════════════════════════════════════════ */}
      {aba === "gramatura" && (
        <>
          {loadingGram ? (
            <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando medições...
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(33,108,59,0.1)" }}>
                      <Scale className="h-5 w-5" style={{ color: COR_VERDE }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalMedicoes}</p>
                      <p className="text-xs text-muted-foreground">Total de Medições</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(33,108,59,0.1)" }}>
                      <Scale className="h-5 w-5" style={{ color: COR_VERDE }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: COR_VERDE }}>
                        {mediaGeral > 0 ? mediaGeral.toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Média Geral (g/m²)</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{mediaPorMaquina.length}</p>
                      <p className="text-xs text-muted-foreground">Máquinas monitoradas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico: Média por Máquina */}
              {mediaPorMaquina.length > 0 && (
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Gramatura Média por Máquina (g/m²)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={Math.max(160, mediaPorMaquina.length * 42)}>
                      <BarChart
                        data={mediaPorMaquina}
                        layout="vertical"
                        margin={{ left: 8, right: 64, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}g`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          width={160}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v.toFixed(1)} g/m²`, "Média"]}
                          labelFormatter={(l) => l}
                        />
                        <Bar dataKey="media" radius={[0, 3, 3, 0]} barSize={20}
                          label={{ position: "right", fontSize: 10, fill: COR_VERDE, formatter: (v: number) => `${v.toFixed(1)}g` }}
                        >
                          {mediaPorMaquina.map((entry) => (
                            <Cell key={entry.maquina} fill={COR_VERDE} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tabela de medições */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Scale className="h-4 w-4" style={{ color: COR_VERDE }} />
                      Registros de Gramatura
                    </CardTitle>
                    <Button size="sm" onClick={openGramAdd} className="gap-1.5">
                      <Plus className="h-4 w-4" /> Nova Medição
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {gramaturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nenhuma medição registrada. Clique em "Nova Medição" para começar.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Máquina</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Gramatura (g/m²)</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gramaturas.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell className="text-xs">
                              {format(new Date(g.data + "T00:00:00"), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-xs">{g.maquina}</TableCell>
                            <TableCell className="text-xs font-medium">{g.produto}</TableCell>
                            <TableCell className="text-right font-medium" style={{ color: COR_VERDE }}>
                              {Number(g.gramatura).toFixed(1)}
                            </TableCell>
                            <TableCell className="text-xs">{g.operador}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {g.observacao || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openGramEdit(g)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleGramDelete(g.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          ABA MATERIAIS
      ════════════════════════════════════════════════════════════ */}
      {aba === "materiais" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{materials.length}</p>
                  <p className="text-xs text-muted-foreground">Materiais Recebidos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{naoConformes.length}</p>
                  <p className="text-xs text-muted-foreground">Não Conformes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendentes.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes de Verificação</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendário */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Calendário de Recebimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Calendar
                  mode="single" selected={selectedDate} onSelect={setSelectedDate}
                  locale={ptBR} modifiers={modifiers} modifiersStyles={modifiersStyles}
                  className="pointer-events-auto"
                />
                {selectedDate && entriesForDate.length > 0 && (
                  <div className="w-full mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    {entriesForDate.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.material}</p>
                          <p className="text-xs text-muted-foreground">Lote: {entry.lote} · {entry.quantidade} {entry.unidade}</p>
                        </div>
                        {entry.verificado ? (
                          entry.conforme
                            ? <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Conforme</Badge>
                            : <Badge variant="destructive" className="shrink-0"><XCircle className="h-3 w-3 mr-1" />Não Conforme</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && entriesForDate.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-4">Nenhum recebimento nesta data.</p>
                )}
              </CardContent>
            </Card>

            {/* Não Conformes */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" /> Materiais Não Conformes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {naoConformes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum material não conforme registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {naoConformes.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-medium">{m.material}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                          <TableCell>{m.quantidade} {m.unidade}</TableCell>
                          <TableCell>{m.fornecedor}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-xs">Não Conforme</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Todos os Recebimentos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Todos os Recebimentos
                </CardTitle>
                <Button size="sm" onClick={openMatAdd} className="gap-1.5">
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
                        {m.conforme === null
                          ? <Badge variant="secondary" className="text-xs">Pendente</Badge>
                          : m.conforme
                            ? <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>
                            : <Badge variant="destructive" className="text-xs">Não Conforme</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMatEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleMatDelete(m.id)}>
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════ */}

      {/* Dialog Gramatura */}
      <Dialog open={gramDialogOpen} onOpenChange={setGramDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{gramEditingId !== null ? "Editar Medição" : "Nova Medição de Gramatura"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Data */}
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Popover open={gramDatePickerOpen} onOpenChange={setGramDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !gramForm.data && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(gramForm.data, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single" selected={gramForm.data} locale={ptBR} initialFocus
                    className="pointer-events-auto"
                    onSelect={(d) => { if (d) { setGramForm({ ...gramForm, data: d }); setGramDatePickerOpen(false); } }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Máquina */}
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <Select value={gramForm.maquina} onValueChange={(v) => setGramForm({ ...gramForm, maquina: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a máquina..." />
                </SelectTrigger>
                <SelectContent>
                  {MAQUINAS_GRAMATURA.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={gramForm.produto} onValueChange={(v) => setGramForm({ ...gramForm, produto: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PRODUTOS_GRAMATURA.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gramatura */}
            <div className="space-y-1.5">
              <Label htmlFor="gram-val">Gramatura (g/m²) *</Label>
              <Input
                id="gram-val"
                type="number"
                min="0"
                step="0.1"
                placeholder="Ex: 80.0"
                value={gramForm.gramatura}
                onChange={(e) => setGramForm({ ...gramForm, gramatura: e.target.value })}
              />
            </div>

            {/* Operador */}
            <div className="space-y-1.5">
              <Label htmlFor="gram-op">Operador *</Label>
              <Input
                id="gram-op"
                placeholder="Nome do operador"
                value={gramForm.operador}
                onChange={(e) => setGramForm({ ...gramForm, operador: e.target.value })}
              />
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <Label htmlFor="gram-obs">Observação</Label>
              <textarea
                id="gram-obs"
                rows={2}
                placeholder="Observações adicionais..."
                value={gramForm.observacao}
                onChange={(e) => setGramForm({ ...gramForm, observacao: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleGramSave} disabled={savingGram}>
              {savingGram && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {gramEditingId !== null ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Materiais */}
      <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{matEditingId ? "Editar Material" : "Adicionar Material"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-material">Material *</Label>
                <Input id="mat-material" placeholder="Ex: MDF 15mm" maxLength={100} value={matForm.material} onChange={(e) => setMatForm({ ...matForm, material: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-lote">Lote *</Label>
                <Input id="mat-lote" placeholder="Ex: L-2026-0341" maxLength={50} value={matForm.lote} onChange={(e) => setMatForm({ ...matForm, lote: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-qtd">Quantidade *</Label>
                <Input id="mat-qtd" type="number" min="1" placeholder="0" value={matForm.quantidade} onChange={(e) => setMatForm({ ...matForm, quantidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={matForm.unidade} onValueChange={(v) => setMatForm({ ...matForm, unidade: v })}>
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
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !matForm.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(matForm.date, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single" selected={matForm.date} locale={ptBR} initialFocus
                      className="pointer-events-auto"
                      onSelect={(d) => { if (d) { setMatForm({ ...matForm, date: d }); setMatDatePickerOpen(false); } }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-forn">Fornecedor *</Label>
                <Input id="mat-forn" placeholder="Ex: Eucatex" maxLength={100} value={matForm.fornecedor} onChange={(e) => setMatForm({ ...matForm, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Verificação de Qualidade</Label>
                <Select value={matForm.verificado} onValueChange={(v: "pendente" | "conforme" | "nao_conforme") => setMatForm({ ...matForm, verificado: v })}>
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
            <Button onClick={handleMatSave}>{matEditingId ? "Salvar Alterações" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
