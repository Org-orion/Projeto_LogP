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

const PRODUTOS_RQ40 = [
  "Colmeia", "Revestimento", "Bondoor", "Embalagem", "Borda", "Borracha",
];

// Padrões de cor — compartilhado com Gramatura
const PADROES_CORES = PRODUTOS_GRAMATURA;

const OPCOES_QUALIDADE = [
  { value: "conforme",     label: "Conforme" },
  { value: "nao_conforme", label: "Não Conforme" },
];

function abreviarMaquina(nome: string): string {
  return nome
    .replace("Recobridora de Perfil - ", "Recob. ")
    .replace("Coladeira de Alizar", "Col. Alizar");
}

function badgeResultado(v: string) {
  if (v === "conforme")
    return <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>;
  if (v === "nao_conforme")
    return <Badge variant="destructive" className="text-xs">Não Conforme</Badge>;
  return <Badge variant="secondary" className="text-xs">—</Badge>;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface GramaturaEntry {
  id: number;
  data: string;
  maquina: string;
  produto: string;
  gramatura: number;
  observacao: string;
}

interface RQ40Entry {
  id: number;
  data_recebimento: string;
  produto: string;
  material_fsc: boolean;
  padrao: string;
  nota_fiscal: string;
  fornecedor: string;
  aparencia: string;
  espessura_mm: number | null;
  perfil_borracha: string;
  gramatura_papel: number | null;
  aderencia_papel: string;
  tonalidade_papel: string;
  quantidade: number;
  resultado: string;
}

// Mock para o quadrado verde (KPIs / calendário / não conformes)
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

// ─── Dados estáticos ──────────────────────────────────────────────────────────

const INITIAL_MATERIALS: MaterialEntry[] = [
  { id: "1", date: new Date(2026, 2, 26), material: "MDF 15mm",       lote: "L-2026-0341", quantidade: 120, unidade: "chapas", fornecedor: "Eucatex",   verificado: true,  conforme: true  },
  { id: "2", date: new Date(2026, 2, 26), material: "Cola PVA",        lote: "L-2026-0342", quantidade: 50,  unidade: "kg",     fornecedor: "Henkel",    verificado: true,  conforme: false },
  { id: "3", date: new Date(2026, 2, 25), material: "Fita de Borda",   lote: "L-2026-0338", quantidade: 300, unidade: "m",      fornecedor: "Rehau",     verificado: true,  conforme: true  },
  { id: "4", date: new Date(2026, 2, 25), material: "Dobradiça 35mm",  lote: "L-2026-0339", quantidade: 500, unidade: "pcs",    fornecedor: "Blum",      verificado: false, conforme: null  },
  { id: "5", date: new Date(2026, 2, 24), material: "Painel MDP 18mm", lote: "L-2026-0335", quantidade: 80,  unidade: "chapas", fornecedor: "Duratex",   verificado: true,  conforme: true  },
  { id: "6", date: new Date(2026, 2, 24), material: "Verniz PU",       lote: "L-2026-0336", quantidade: 25,  unidade: "L",      fornecedor: "Sayerlack", verificado: true,  conforme: false },
  { id: "7", date: new Date(2026, 2, 23), material: "Puxador Inox",    lote: "L-2026-0330", quantidade: 200, unidade: "pcs",    fornecedor: "Hafele",    verificado: false, conforme: null  },
  { id: "8", date: new Date(2026, 2, 20), material: "MDF 6mm",         lote: "L-2026-0325", quantidade: 60,  unidade: "chapas", fornecedor: "Eucatex",   verificado: true,  conforme: true  },
];

// ─── Formulários vazios ───────────────────────────────────────────────────────

const EMPTY_GRAM_FORM = {
  data: new Date(), maquina: "", produto: "", gramatura: "", observacao: "",
};

const EMPTY_RQ40_FORM = {
  data_recebimento: new Date(),
  produto:          "",
  material_fsc:     "" as "" | "sim" | "nao",
  padrao:           "",
  nota_fiscal:      "",
  fornecedor:       "",
  aparencia:        "" as "" | "conforme" | "nao_conforme",
  espessura_mm:     "",
  perfil_borracha:  "",
  gramatura_papel:  "",
  aderencia_papel:  "" as "" | "conforme" | "nao_conforme",
  tonalidade_papel: "" as "" | "conforme" | "nao_conforme",
  quantidade:       "",
  resultado:        "" as "" | "conforme" | "nao_conforme",
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface QualidadePageProps { subSection?: string; }

export default function QualidadePage({ subSection = "gramatura" }: QualidadePageProps) {
  const aba = subSection;

  // ── Gramatura ──
  const [gramaturas,     setGramaturas]     = useState<GramaturaEntry[]>([]);
  const [loadingGram,    setLoadingGram]    = useState(false);
  const [gramDialogOpen, setGramDialogOpen] = useState(false);
  const [gramEditingId,  setGramEditingId]  = useState<number | null>(null);
  const [gramForm,       setGramForm]       = useState(EMPTY_GRAM_FORM);
  const [gramDateOpen,   setGramDateOpen]   = useState(false);
  const [savingGram,     setSavingGram]     = useState(false);

  // ── Recebimento de Insumos ──
  const [tipoRecebimento, setTipoRecebimento] = useState<"rq40" | "rq41">("rq40");
  const materials    = INITIAL_MATERIALS;           // read-only mock para o quadrado verde
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // ── RQ40 ──
  const [rq40s,        setRq40s]        = useState<RQ40Entry[]>([]);
  const [loadingRQ40,  setLoadingRQ40]  = useState(false);
  const [rq40Dialog,   setRq40Dialog]   = useState(false);
  const [rq40EditId,   setRq40EditId]   = useState<number | null>(null);
  const [rq40Form,     setRq40Form]     = useState(EMPTY_RQ40_FORM);
  const [rq40DateOpen, setRq40DateOpen] = useState(false);
  const [savingRQ40,   setSavingRQ40]   = useState(false);

  // ─── Fetch Gramatura ─────────────────────────────────────────────────────

  const fetchGramaturas = useCallback(async () => {
    setLoadingGram(true);
    const { data, error } = await supabase
      .from("qualidade_gramatura")
      .select("*")
      .order("data", { ascending: false })
      .order("id",   { ascending: false });
    if (error) toast.error("Erro ao carregar medições: " + error.message);
    else setGramaturas(data ?? []);
    setLoadingGram(false);
  }, []);

  useEffect(() => { if (aba === "gramatura") fetchGramaturas(); }, [aba, fetchGramaturas]);

  // ─── Fetch RQ40 ──────────────────────────────────────────────────────────

  const fetchRQ40 = useCallback(async () => {
    setLoadingRQ40(true);
    const { data, error } = await supabase
      .from("qualidade_rq40")
      .select("*")
      .order("data_recebimento", { ascending: false })
      .order("id",               { ascending: false });
    if (error) toast.error("Erro ao carregar RQ40: " + error.message);
    else setRq40s(data ?? []);
    setLoadingRQ40(false);
  }, []);

  useEffect(() => {
    if (aba === "recebimento" && tipoRecebimento === "rq40") fetchRQ40();
  }, [aba, tipoRecebimento, fetchRQ40]);

  // ─── Derivações Gramatura ─────────────────────────────────────────────────

  const totalMedicoes = gramaturas.length;
  const mediaGeral    = totalMedicoes > 0
    ? gramaturas.reduce((s, g) => s + Number(g.gramatura), 0) / totalMedicoes : 0;

  const mediaPorMaquina = Object.entries(
    gramaturas.reduce((acc, g) => {
      if (!acc[g.maquina]) acc[g.maquina] = { soma: 0, n: 0 };
      acc[g.maquina].soma += Number(g.gramatura);
      acc[g.maquina].n   += 1;
      return acc;
    }, {} as Record<string, { soma: number; n: number }>)
  ).map(([maquina, { soma, n }]) => ({
    label:   abreviarMaquina(maquina),
    maquina,
    media:   Math.round((soma / n) * 100) / 100,
  })).sort((a, b) => b.media - a.media);

  // ─── Derivações Materiais (mock, quadrado verde) ──────────────────────────

  const naoConformes   = materials.filter((m) => m.conforme === false);
  const pendentes      = materials.filter((m) => !m.verificado);
  const entriesForDate = selectedDate
    ? materials.filter((m) => format(m.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"))
    : [];
  const modifiers       = { hasEntries: materials.map((m) => m.date) };
  const modifiersStyles = {
    hasEntries: {
      fontWeight: 700 as const,
      textDecoration: "underline" as const,
      textDecorationColor: "hsl(var(--primary))" as const,
      textUnderlineOffset: "4px" as const,
    },
  };

  // ─── Handlers Gramatura ───────────────────────────────────────────────────

  function openGramAdd() { setGramEditingId(null); setGramForm(EMPTY_GRAM_FORM); setGramDialogOpen(true); }

  function openGramEdit(g: GramaturaEntry) {
    setGramEditingId(g.id);
    setGramForm({ data: new Date(g.data + "T00:00:00"), maquina: g.maquina, produto: g.produto, gramatura: String(g.gramatura), observacao: g.observacao });
    setGramDialogOpen(true);
  }

  async function handleGramDelete(id: number) {
    const { error } = await supabase.from("qualidade_gramatura").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido."); fetchGramaturas();
  }

  async function handleGramSave() {
    const gramValue = Number(gramForm.gramatura);
    if (!gramForm.maquina || !gramForm.produto) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (isNaN(gramValue) || gramValue <= 0)      { toast.error("Gramatura inválida."); return; }
    setSavingGram(true);
    const payload = { data: format(gramForm.data, "yyyy-MM-dd"), maquina: gramForm.maquina, produto: gramForm.produto, gramatura: gramValue, observacao: gramForm.observacao.trim() };
    const { error } = gramEditingId !== null
      ? await supabase.from("qualidade_gramatura").update(payload).eq("id", gramEditingId)
      : await supabase.from("qualidade_gramatura").insert(payload);
    setSavingGram(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(gramEditingId !== null ? "Registro atualizado." : "Medição registrada.");
    setGramDialogOpen(false); setGramForm(EMPTY_GRAM_FORM); setGramEditingId(null); fetchGramaturas();
  }

  // ─── Handlers RQ40 ───────────────────────────────────────────────────────

  function openRQ40Add() { setRq40EditId(null); setRq40Form(EMPTY_RQ40_FORM); setRq40Dialog(true); }

  function openRQ40Edit(r: RQ40Entry) {
    setRq40EditId(r.id);
    setRq40Form({
      data_recebimento: new Date(r.data_recebimento + "T00:00:00"),
      produto:          r.produto,
      material_fsc:     r.material_fsc ? "sim" : "nao",
      padrao:           r.padrao,
      nota_fiscal:      r.nota_fiscal,
      fornecedor:       r.fornecedor,
      aparencia:        r.aparencia as "" | "conforme" | "nao_conforme",
      espessura_mm:     r.espessura_mm !== null ? String(r.espessura_mm) : "",
      perfil_borracha:  r.perfil_borracha,
      gramatura_papel:  r.gramatura_papel !== null ? String(r.gramatura_papel) : "",
      aderencia_papel:  r.aderencia_papel  as "" | "conforme" | "nao_conforme",
      tonalidade_papel: r.tonalidade_papel as "" | "conforme" | "nao_conforme",
      quantidade:       String(r.quantidade),
      resultado:        r.resultado as "" | "conforme" | "nao_conforme",
    });
    setRq40Dialog(true);
  }

  async function handleRQ40Delete(id: number) {
    const { error } = await supabase.from("qualidade_rq40").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido."); fetchRQ40();
  }

  async function handleRQ40Save() {
    if (!rq40Form.produto || !rq40Form.fornecedor.trim() || !rq40Form.quantidade || !rq40Form.resultado) {
      toast.error("Preencha: Produto, Fornecedor, Quantidade e Resultado."); return;
    }
    const qty = Number(rq40Form.quantidade);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantidade inválida."); return; }
    setSavingRQ40(true);
    const payload = {
      data_recebimento: format(rq40Form.data_recebimento, "yyyy-MM-dd"),
      produto:          rq40Form.produto,
      material_fsc:     rq40Form.material_fsc === "sim",
      padrao:           rq40Form.padrao,
      nota_fiscal:      rq40Form.nota_fiscal.trim(),
      fornecedor:       rq40Form.fornecedor.trim(),
      aparencia:        rq40Form.aparencia,
      espessura_mm:     rq40Form.espessura_mm !== "" ? Number(rq40Form.espessura_mm) : null,
      perfil_borracha:  rq40Form.perfil_borracha.trim(),
      gramatura_papel:  rq40Form.gramatura_papel !== "" ? Number(rq40Form.gramatura_papel) : null,
      aderencia_papel:  rq40Form.aderencia_papel,
      tonalidade_papel: rq40Form.tonalidade_papel,
      quantidade:       qty,
      resultado:        rq40Form.resultado,
    };
    const { error } = rq40EditId !== null
      ? await supabase.from("qualidade_rq40").update(payload).eq("id", rq40EditId)
      : await supabase.from("qualidade_rq40").insert(payload);
    setSavingRQ40(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(rq40EditId !== null ? "Registro atualizado." : "Recebimento registrado.");
    setRq40Dialog(false); setRq40Form(EMPTY_RQ40_FORM); setRq40EditId(null); fetchRQ40();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Título */}
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Controle de Qualidade</p>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>
          {aba === "gramatura" ? "Gramatura" : "Recebimento de Insumos"}
        </h1>
      </div>

      {/* ════ ABA GRAMATURA ════ */}
      {aba === "gramatura" && (
        <>
          {loadingGram ? (
            <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando medições...
            </div>
          ) : (
            <>
              {/* KPIs */}
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

              {/* Gráfico médias */}
              {mediaPorMaquina.length > 0 && (
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">Gramatura Média por Máquina (g/m²)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={Math.max(160, mediaPorMaquina.length * 42)}>
                      <BarChart data={mediaPorMaquina} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}g`} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={160} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => [`${v.toFixed(1)} g/m²`, "Média"]} />
                        <Bar dataKey="media" radius={[0, 3, 3, 0]} barSize={20}
                          label={{ position: "right", fontSize: 10, fill: COR_VERDE, formatter: (v: number) => `${v.toFixed(1)}g` }}>
                          {mediaPorMaquina.map((e) => <Cell key={e.maquina} fill={COR_VERDE} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tabela */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Scale className="h-4 w-4" style={{ color: COR_VERDE }} /> Registros de Gramatura
                    </CardTitle>
                    <Button size="sm" onClick={openGramAdd} className="gap-1.5">
                      <Plus className="h-4 w-4" /> Nova Medição
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {gramaturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma medição registrada.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Máquina</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Gramatura (g/m²)</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gramaturas.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell className="text-xs">{format(new Date(g.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-xs">{g.maquina}</TableCell>
                            <TableCell className="text-xs font-medium">{g.produto}</TableCell>
                            <TableCell className="text-right font-medium" style={{ color: COR_VERDE }}>{Number(g.gramatura).toFixed(1)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{g.observacao || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openGramEdit(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleGramDelete(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* ════ ABA RECEBIMENTO DE INSUMOS ════ */}
      {aba === "recebimento" && (
        <>
          {/* ── Quadrado VERDE: KPIs + Calendário + Não Conformes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div><p className="text-2xl font-bold">{materials.length}</p><p className="text-xs text-muted-foreground">Materiais Recebidos</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div><p className="text-2xl font-bold">{naoConformes.length}</p><p className="text-xs text-muted-foreground">Não Conformes</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div><p className="text-2xl font-bold">{pendentes.length}</p><p className="text-xs text-muted-foreground">Pendentes de Verificação</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Calendário de Recebimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ptBR} modifiers={modifiers} modifiersStyles={modifiersStyles} className="pointer-events-auto" />
                {selectedDate && entriesForDate.length > 0 && (
                  <div className="w-full mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                    {entriesForDate.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.material}</p>
                          <p className="text-xs text-muted-foreground">Lote: {entry.lote} · {entry.quantidade} {entry.unidade}</p>
                        </div>
                        {entry.verificado
                          ? entry.conforme
                            ? <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Conforme</Badge>
                            : <Badge variant="destructive" className="shrink-0"><XCircle className="h-3 w-3 mr-1" />Não Conforme</Badge>
                          : <Badge variant="secondary" className="shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>}
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && entriesForDate.length === 0 && <p className="text-xs text-muted-foreground mt-4">Nenhum recebimento nesta data.</p>}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Materiais Não Conformes</CardTitle>
              </CardHeader>
              <CardContent>
                {naoConformes.length === 0
                  ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum material não conforme registrado.</p>
                  : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead><TableHead>Material</TableHead><TableHead>Lote</TableHead>
                          <TableHead>Qtd</TableHead><TableHead>Fornecedor</TableHead><TableHead>Status</TableHead>
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

          {/* ── Quadrado VERMELHO: Selector RQ40/RQ41 + tabela ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setTipoRecebimento("rq40")}
                    className={cn("px-4 py-1.5 text-xs font-medium transition-colors", tipoRecebimento === "rq40" ? "text-white" : "text-muted-foreground hover:bg-muted")}
                    style={tipoRecebimento === "rq40" ? { backgroundColor: COR_VERDE } : {}}
                  >
                    Recebimento de Materiais — RQ40
                  </button>
                  <button
                    onClick={() => setTipoRecebimento("rq41")}
                    className={cn("px-4 py-1.5 text-xs font-medium transition-colors", tipoRecebimento === "rq41" ? "text-white" : "text-muted-foreground hover:bg-muted")}
                    style={tipoRecebimento === "rq41" ? { backgroundColor: COR_VERDE } : {}}
                  >
                    Recebimento de Insumos — RQ41
                  </button>
                </div>
                {tipoRecebimento === "rq40" && (
                  <Button size="sm" onClick={openRQ40Add} className="gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>

              {/* RQ40 */}
              {tipoRecebimento === "rq40" && (
                loadingRQ40 ? (
                  <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : rq40s.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro RQ40. Clique em "Adicionar" para começar.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Padrão</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Nota Fiscal</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rq40s.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{format(new Date(r.data_recebimento + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-xs font-medium">{r.produto}</TableCell>
                            <TableCell className="text-xs">{r.padrao || "—"}</TableCell>
                            <TableCell className="text-xs">{r.fornecedor}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.nota_fiscal || "—"}</TableCell>
                            <TableCell className="text-xs text-right">{r.quantidade}</TableCell>
                            <TableCell>{badgeResultado(r.resultado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRQ40Edit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRQ40Delete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}

              {/* RQ41 — campos a definir */}
              {tipoRecebimento === "rq41" && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Formulário RQ41 em configuração — aguardando definição dos campos.
                </p>
              )}

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
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Popover open={gramDateOpen} onOpenChange={setGramDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />{format(gramForm.data, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={gramForm.data} locale={ptBR} initialFocus className="pointer-events-auto"
                    onSelect={(d) => { if (d) { setGramForm({ ...gramForm, data: d }); setGramDateOpen(false); } }} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <Select value={gramForm.maquina} onValueChange={(v) => setGramForm({ ...gramForm, maquina: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a máquina..." /></SelectTrigger>
                <SelectContent>{MAQUINAS_GRAMATURA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={gramForm.produto} onValueChange={(v) => setGramForm({ ...gramForm, produto: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                <SelectContent className="max-h-60">{PRODUTOS_GRAMATURA.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gram-val">Gramatura (g/m²) *</Label>
              <Input id="gram-val" type="number" min="0" step="0.1" placeholder="Ex: 80.0" value={gramForm.gramatura} onChange={(e) => setGramForm({ ...gramForm, gramatura: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gram-obs">Observação</Label>
              <textarea id="gram-obs" rows={2} placeholder="Observações adicionais..." value={gramForm.observacao} onChange={(e) => setGramForm({ ...gramForm, observacao: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleGramSave} disabled={savingGram}>
              {savingGram && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {gramEditingId !== null ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog RQ40 */}
      <Dialog open={rq40Dialog} onOpenChange={setRq40Dialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{rq40EditId !== null ? "Editar Registro RQ40" : "Novo Recebimento de Materiais — RQ40"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">

            {/* Linha 1: Data + Produto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data de Recebimento *</Label>
                <Popover open={rq40DateOpen} onOpenChange={setRq40DateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />{format(rq40Form.data_recebimento, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={rq40Form.data_recebimento} locale={ptBR} initialFocus className="pointer-events-auto"
                      onSelect={(d) => { if (d) { setRq40Form({ ...rq40Form, data_recebimento: d }); setRq40DateOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Produto *</Label>
                <Select value={rq40Form.produto} onValueChange={(v) => setRq40Form({ ...rq40Form, produto: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{PRODUTOS_RQ40.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Padrão + Material Certificado FSC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Padrão (Cor)</Label>
                <Select value={rq40Form.padrao} onValueChange={(v) => setRq40Form({ ...rq40Form, padrao: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">{PADROES_CORES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Material Certificado (FSC)</Label>
                <Select value={rq40Form.material_fsc} onValueChange={(v: "" | "sim" | "nao") => setRq40Form({ ...rq40Form, material_fsc: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 3: Nota Fiscal + Fornecedor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq40-nf">Nota Fiscal</Label>
                <Input id="rq40-nf" placeholder="Nº da nota fiscal" value={rq40Form.nota_fiscal} onChange={(e) => setRq40Form({ ...rq40Form, nota_fiscal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq40-forn">Fornecedor *</Label>
                <Input id="rq40-forn" placeholder="Nome do fornecedor" value={rq40Form.fornecedor} onChange={(e) => setRq40Form({ ...rq40Form, fornecedor: e.target.value })} />
              </div>
            </div>

            {/* Linha 4: Aparência + Espessura */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Aparência</Label>
                <Select value={rq40Form.aparencia} onValueChange={(v: "" | "conforme" | "nao_conforme") => setRq40Form({ ...rq40Form, aparencia: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq40-esp">Espessura (mm)</Label>
                <Input id="rq40-esp" type="number" min="0" step="0.01" placeholder="Ex: 15.00" value={rq40Form.espessura_mm} onChange={(e) => setRq40Form({ ...rq40Form, espessura_mm: e.target.value })} />
              </div>
            </div>

            {/* Linha 5: Perfil da borracha + Gramatura do papel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq40-perf">Perfil da Borracha</Label>
                <Input id="rq40-perf" placeholder="Descreva o perfil" value={rq40Form.perfil_borracha} onChange={(e) => setRq40Form({ ...rq40Form, perfil_borracha: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq40-gram">Gramatura do Papel (g/m²)</Label>
                <Input id="rq40-gram" type="number" min="0" step="0.1" placeholder="Ex: 80.0" value={rq40Form.gramatura_papel} onChange={(e) => setRq40Form({ ...rq40Form, gramatura_papel: e.target.value })} />
              </div>
            </div>

            {/* Linha 6: Aderência + Tonalidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Aderência do Papel</Label>
                <Select value={rq40Form.aderencia_papel} onValueChange={(v: "" | "conforme" | "nao_conforme") => setRq40Form({ ...rq40Form, aderencia_papel: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tonalidade do Papel</Label>
                <Select value={rq40Form.tonalidade_papel} onValueChange={(v: "" | "conforme" | "nao_conforme") => setRq40Form({ ...rq40Form, tonalidade_papel: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 7: Quantidade + Resultado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq40-qtd">Quantidade *</Label>
                <Input id="rq40-qtd" type="number" min="1" placeholder="0" value={rq40Form.quantidade} onChange={(e) => setRq40Form({ ...rq40Form, quantidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Resultado *</Label>
                <Select value={rq40Form.resultado} onValueChange={(v: "" | "conforme" | "nao_conforme") => setRq40Form({ ...rq40Form, resultado: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleRQ40Save} disabled={savingRQ40}>
              {savingRQ40 && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {rq40EditId !== null ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
