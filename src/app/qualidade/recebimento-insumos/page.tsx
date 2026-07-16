"use client";

import { RequirePagina } from "@/components/RequirePagina";
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
import { XCircle, Package, ClipboardCheck, Plus, Pencil, Trash2, CalendarIcon, Loader2 } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Extraído de QualidadePage.tsx (aba "recebimento") — mesma lógica/tabela de
// antes (controle_qualidade, tipo=rq40/rq41), sem nenhuma mudança de regra. ──

const COR_VERDE = "hsl(var(--primary))";

const PRODUTOS_RQ40 = [
  "Colmeia", "Revestimento", "Bondoor", "Embalagem", "Borda", "Borracha", "Chapa de MDF",
];

const PRODUTOS_RQ41 = ["Cola", "Tinta", "Resina", "Catalisador", "Extensor"];

const PADROES_RQ41 = [
  "PUR 607.51", "PUR CQ-654", "PVA C-518", "PUR 605.62", "PUR 605.78",
  "PUR 605.65", "Hotmelt 288.71", "Hotmelt 288.62", "UF-108",
];

// Mesma lista de padrões (cores) usada em Gramatura — duplicada aqui de
// propósito (cada rota agora é um arquivo próprio, sem import cruzado entre
// páginas de negócio distintas).
const PADROES_CORES = [
  "Bianco", "Blue", "Capuccino", "Carvalho", "Elo Curupixá", "Elo Branco",
  "ML Curupixá", "Fendi", "Velar", "Freijó Natural", "FL 100", "FL 120",
  "FL 140", "FL 180", "ML Freijó", "Grafite", "Green", "ML Imbuia", "Italy",
  "Marfin", "Mocaccino", "MTX", "Nero", "Lacca Pet Blanco", "Urban",
  "Marrone", "Curupixa Terra", "Outro",
];

const OPCOES_QUALIDADE = [
  { value: "conforme",     label: "Conforme" },
  { value: "nao_conforme", label: "Não Conforme" },
];

function badgeResultado(v: string) {
  if (v === "conforme")
    return <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>;
  if (v === "nao_conforme")
    return <Badge variant="destructive" className="text-xs">Não Conforme</Badge>;
  return <Badge variant="secondary" className="text-xs">—</Badge>;
}

interface RQ40Entry {
  id: number;
  tipo: string;
  data: string;
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
  umidade: string | null;
  quantidade: number;
  resultado: string;
  observacao: string | null;
}

interface RecebimentoSummary {
  id: number;
  tipo: string;
  data: string;
  produto: string;
  fornecedor: string | null;
  nota_fiscal: string | null;
  quantidade: number;
  resultado: string;
}

interface RQ41Entry {
  id: number;
  tipo: string;
  data: string;
  produto: string;
  padrao: string;
  nota_fiscal: string;
  fornecedor: string;
  viscosidade: string | null;
  teor_solidos: string | null;
  ph: number | null;
  densidade: number | null;
  gel_time: string | null;
  absorcao_agua: string | null;
  quantidade: number;
  resultado: string;
}

const EMPTY_RQ40_FORM = {
  data: new Date(),
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
  umidade:          "",
  quantidade:       "",
  resultado:        "" as "" | "conforme" | "nao_conforme",
  observacao:       "",
};

const EMPTY_RQ41_FORM = {
  data:          new Date(),
  produto:       "",
  padrao:        "",
  nota_fiscal:   "",
  fornecedor:    "",
  viscosidade:   "",
  teor_solidos:  "",
  ph:            "",
  densidade:     "",
  gel_time:      "",
  absorcao_agua: "",
  quantidade:    "",
  resultado:     "" as "" | "conforme" | "nao_conforme",
};

function RecebimentoInsumosPageInner() {
  const [tipoRecebimento,   setTipoRecebimento]   = useState<"rq40" | "rq41">("rq40");
  const [selectedDate,      setSelectedDate]      = useState<Date | undefined>(undefined);
  const [allRecebimentos,   setAllRecebimentos]   = useState<RecebimentoSummary[]>([]);
  const [loadingReceb,      setLoadingReceb]      = useState(false);

  const [rq40s,        setRq40s]        = useState<RQ40Entry[]>([]);
  const [loadingRQ40,  setLoadingRQ40]  = useState(false);
  const [rq40Dialog,   setRq40Dialog]   = useState(false);
  const [rq40EditId,   setRq40EditId]   = useState<number | null>(null);
  const [rq40Form,     setRq40Form]     = useState(EMPTY_RQ40_FORM);
  const [rq40DateOpen, setRq40DateOpen] = useState(false);
  const [savingRQ40,   setSavingRQ40]   = useState(false);

  const [rq41s,        setRq41s]        = useState<RQ41Entry[]>([]);
  const [loadingRQ41,  setLoadingRQ41]  = useState(false);
  const [rq41Dialog,   setRq41Dialog]   = useState(false);
  const [rq41EditId,   setRq41EditId]   = useState<number | null>(null);
  const [rq41Form,     setRq41Form]     = useState(EMPTY_RQ41_FORM);
  const [rq41DateOpen, setRq41DateOpen] = useState(false);
  const [savingRQ41,   setSavingRQ41]   = useState(false);

  const fetchRQ40 = useCallback(async () => {
    setLoadingRQ40(true);
    const { data, error } = await supabase
      .from("controle_qualidade")
      .select("*")
      .eq("tipo", "rq40")
      .order("data", { ascending: false })
      .order("id",   { ascending: false });
    if (error) toast.error("Erro ao carregar RQ40: " + error.message);
    else setRq40s(data ?? []);
    setLoadingRQ40(false);
  }, []);

  useEffect(() => { if (tipoRecebimento === "rq40") fetchRQ40(); }, [tipoRecebimento, fetchRQ40]);

  const fetchRQ41 = useCallback(async () => {
    setLoadingRQ41(true);
    const { data, error } = await supabase
      .from("controle_qualidade")
      .select("*")
      .eq("tipo", "rq41")
      .order("data", { ascending: false })
      .order("id",   { ascending: false });
    if (error) toast.error("Erro ao carregar RQ41: " + error.message);
    else setRq41s(data ?? []);
    setLoadingRQ41(false);
  }, []);

  useEffect(() => { if (tipoRecebimento === "rq41") fetchRQ41(); }, [tipoRecebimento, fetchRQ41]);

  const fetchAllRecebimentos = useCallback(async () => {
    setLoadingReceb(true);
    const { data, error } = await supabase
      .from("controle_qualidade")
      .select("id, tipo, data, produto, fornecedor, nota_fiscal, quantidade, resultado")
      .in("tipo", ["rq40", "rq41"])
      .order("data", { ascending: false });
    if (!error) setAllRecebimentos(data ?? []);
    setLoadingReceb(false);
  }, []);

  useEffect(() => { fetchAllRecebimentos(); }, [fetchAllRecebimentos]);

  const totalRecebidos    = allRecebimentos.length;
  const totalNaoConformes = allRecebimentos.filter((r) => r.resultado === "nao_conforme").length;
  const entriesForDate    = selectedDate
    ? allRecebimentos.filter((r) => r.data === format(selectedDate, "yyyy-MM-dd"))
    : [];
  const datesWithEntries  = allRecebimentos.map((r) => new Date(r.data + "T00:00:00"));
  const modifiers         = { hasEntries: datesWithEntries };
  const modifiersStyles   = {
    hasEntries: {
      fontWeight: 700 as const,
      textDecoration: "underline" as const,
      textDecorationColor: "hsl(var(--primary))" as const,
      textUnderlineOffset: "4px" as const,
    },
  };

  function openRQ40Add() { setRq40EditId(null); setRq40Form(EMPTY_RQ40_FORM); setRq40Dialog(true); }

  function openRQ40Edit(r: RQ40Entry) {
    setRq40EditId(r.id);
    setRq40Form({
      data: new Date(r.data + "T00:00:00"),
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
      umidade:          r.umidade ?? "",
      quantidade:       String(r.quantidade),
      resultado:        r.resultado as "" | "conforme" | "nao_conforme",
      observacao:       r.observacao ?? "",
    });
    setRq40Dialog(true);
  }

  async function handleRQ40Delete(id: number) {
    const { error } = await supabase.from("controle_qualidade").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido."); fetchRQ40(); fetchAllRecebimentos();
  }

  async function handleRQ40Save() {
    if (!rq40Form.produto || !rq40Form.fornecedor.trim() || !rq40Form.quantidade || !rq40Form.resultado) {
      toast.error("Preencha: Produto, Fornecedor, Quantidade e Resultado."); return;
    }
    const qty = Number(rq40Form.quantidade);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantidade inválida."); return; }
    setSavingRQ40(true);
    const payload = {
      tipo:    "rq40",
      data:    format(rq40Form.data, "yyyy-MM-dd"),
      produto: rq40Form.produto,
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
      umidade:          rq40Form.umidade.trim() || null,
      quantidade:       qty,
      resultado:        rq40Form.resultado,
      observacao:       rq40Form.observacao.trim() || null,
    };
    const { error } = rq40EditId !== null
      ? await supabase.from("controle_qualidade").update(payload).eq("id", rq40EditId)
      : await supabase.from("controle_qualidade").insert(payload);
    setSavingRQ40(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(rq40EditId !== null ? "Registro atualizado." : "Recebimento registrado.");
    setRq40Dialog(false); setRq40Form(EMPTY_RQ40_FORM); setRq40EditId(null); fetchRQ40(); fetchAllRecebimentos();
  }

  function openRQ41Add() { setRq41EditId(null); setRq41Form(EMPTY_RQ41_FORM); setRq41Dialog(true); }

  function openRQ41Edit(r: RQ41Entry) {
    setRq41EditId(r.id);
    setRq41Form({
      data:          new Date(r.data + "T00:00:00"),
      produto:       r.produto,
      padrao:        r.padrao ?? "",
      nota_fiscal:   r.nota_fiscal ?? "",
      fornecedor:    r.fornecedor ?? "",
      viscosidade:   r.viscosidade ?? "",
      teor_solidos:  r.teor_solidos ?? "",
      ph:            r.ph !== null ? String(r.ph) : "",
      densidade:     r.densidade !== null ? String(r.densidade) : "",
      gel_time:      r.gel_time ?? "",
      absorcao_agua: r.absorcao_agua ?? "",
      quantidade:    String(r.quantidade),
      resultado:     r.resultado as "" | "conforme" | "nao_conforme",
    });
    setRq41Dialog(true);
  }

  async function handleRQ41Delete(id: number) {
    const { error } = await supabase.from("controle_qualidade").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido."); fetchRQ41(); fetchAllRecebimentos();
  }

  async function handleRQ41Save() {
    if (!rq41Form.produto || !rq41Form.fornecedor.trim() || !rq41Form.quantidade || !rq41Form.resultado) {
      toast.error("Preencha: Produto, Fornecedor, Quantidade e Resultado."); return;
    }
    const qty = Number(rq41Form.quantidade);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantidade inválida."); return; }
    setSavingRQ41(true);
    const payload = {
      tipo:          "rq41",
      data:          format(rq41Form.data, "yyyy-MM-dd"),
      produto:       rq41Form.produto,
      padrao:        rq41Form.padrao,
      nota_fiscal:   rq41Form.nota_fiscal.trim(),
      fornecedor:    rq41Form.fornecedor.trim(),
      viscosidade:   rq41Form.viscosidade.trim() || null,
      teor_solidos:  rq41Form.teor_solidos.trim() || null,
      ph:            rq41Form.ph !== "" ? Number(rq41Form.ph) : null,
      densidade:     rq41Form.densidade !== "" ? Number(rq41Form.densidade) : null,
      gel_time:      rq41Form.gel_time.trim() || null,
      absorcao_agua: rq41Form.absorcao_agua.trim() || null,
      quantidade:    qty,
      resultado:     rq41Form.resultado,
    };
    const { error } = rq41EditId !== null
      ? await supabase.from("controle_qualidade").update(payload).eq("id", rq41EditId)
      : await supabase.from("controle_qualidade").insert(payload);
    setSavingRQ41(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(rq41EditId !== null ? "Registro atualizado." : "Recebimento registrado.");
    setRq41Dialog(false); setRq41Form(EMPTY_RQ41_FORM); setRq41EditId(null); fetchRQ41(); fetchAllRecebimentos();
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Controle de Qualidade</p>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Recebimento de Insumos</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loadingReceb ? "…" : totalRecebidos}</p>
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
              <p className="text-2xl font-bold">{loadingReceb ? "…" : totalNaoConformes}</p>
              <p className="text-xs text-muted-foreground">Não Conformes</p>
            </div>
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
                      <p className="text-sm font-medium truncate">{entry.produto}</p>
                      <p className="text-xs text-muted-foreground">{entry.tipo.toUpperCase()} · {entry.fornecedor || "—"} · Qtd: {entry.quantidade}</p>
                    </div>
                    {badgeResultado(entry.resultado)}
                  </div>
                ))}
              </div>
            )}
            {selectedDate && entriesForDate.length === 0 && (
              <p className="text-xs text-muted-foreground mt-4">Nenhum recebimento nesta data.</p>
            )}
            {!selectedDate && (
              <p className="text-xs text-muted-foreground mt-4 text-center">Clique em uma data para ver os recebimentos.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              {selectedDate
                ? `Materiais Verificados — ${format(selectedDate, "dd/MM/yyyy")}`
                : "Materiais Verificados"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReceb ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : entriesForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {selectedDate ? "Nenhum recebimento nesta data." : "Selecione uma data no calendário."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Nota Fiscal</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesForDate.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{r.produto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">{r.tipo}</TableCell>
                      <TableCell className="text-xs">{r.fornecedor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.nota_fiscal || "—"}</TableCell>
                      <TableCell className="text-xs text-right">{r.quantidade}</TableCell>
                      <TableCell>{badgeResultado(r.resultado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

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

          {tipoRecebimento === "rq40" && (
            loadingRQ40 ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : rq40s.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro RQ40. Clique em &quot;Adicionar&quot; para começar.</p>
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
                        <TableCell className="text-xs">{format(new Date(r.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
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

          {tipoRecebimento === "rq41" && (
            loadingRQ41 ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : (
              <div>
                <div className="flex justify-end mb-3">
                  <Button size="sm" onClick={openRQ41Add} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Novo Registro RQ41
                  </Button>
                </div>
                {rq41s.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
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
                        {rq41s.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{format(new Date(r.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-xs font-medium">{r.produto}</TableCell>
                            <TableCell className="text-xs">{r.padrao || "—"}</TableCell>
                            <TableCell className="text-xs">{r.fornecedor || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.nota_fiscal || "—"}</TableCell>
                            <TableCell className="text-xs text-right">{r.quantidade}</TableCell>
                            <TableCell>{badgeResultado(r.resultado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRQ41Edit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRQ41Delete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )
          )}

        </CardContent>
      </Card>

      <Dialog open={rq40Dialog} onOpenChange={setRq40Dialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{rq40EditId !== null ? "Editar Registro RQ40" : "Novo Recebimento de Materiais — RQ40"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data de Recebimento *</Label>
                <Popover open={rq40DateOpen} onOpenChange={setRq40DateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />{format(rq40Form.data, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={rq40Form.data} locale={ptBR} initialFocus className="pointer-events-auto"
                      onSelect={(d) => { if (d) { setRq40Form({ ...rq40Form, data: d }); setRq40DateOpen(false); } }} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq40-umid">Umidade</Label>
                <Input id="rq40-umid" placeholder="Ex: 8%" value={rq40Form.umidade} onChange={(e) => setRq40Form({ ...rq40Form, umidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq40-qtd">Quantidade *</Label>
                <Input id="rq40-qtd" type="number" min="1" placeholder="0" value={rq40Form.quantidade} onChange={(e) => setRq40Form({ ...rq40Form, quantidade: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Resultado *</Label>
              <Select value={rq40Form.resultado} onValueChange={(v: "" | "conforme" | "nao_conforme") => setRq40Form({ ...rq40Form, resultado: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rq40-obs">Observação</Label>
              <textarea id="rq40-obs" rows={2} placeholder="Observações adicionais..." value={rq40Form.observacao}
                onChange={(e) => setRq40Form({ ...rq40Form, observacao: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
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

      <Dialog open={rq41Dialog} onOpenChange={setRq41Dialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{rq41EditId !== null ? "Editar Registro RQ41" : "Novo Registro RQ41"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data de Recebimento *</Label>
                <Popover open={rq41DateOpen} onOpenChange={setRq41DateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />{format(rq41Form.data, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={rq41Form.data} locale={ptBR} initialFocus className="pointer-events-auto"
                      onSelect={(d) => { if (d) { setRq41Form({ ...rq41Form, data: d }); setRq41DateOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Produto *</Label>
                <Select value={rq41Form.produto} onValueChange={(v) => setRq41Form({ ...rq41Form, produto: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{PRODUTOS_RQ41.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Padrão Aplicável</Label>
                <Select value={rq41Form.padrao} onValueChange={(v) => setRq41Form({ ...rq41Form, padrao: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{PADROES_RQ41.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq41-nf">Nota Fiscal</Label>
                <Input id="rq41-nf" placeholder="Nº da nota fiscal" value={rq41Form.nota_fiscal} onChange={(e) => setRq41Form({ ...rq41Form, nota_fiscal: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq41-forn">Fornecedor *</Label>
                <Input id="rq41-forn" placeholder="Nome do fornecedor" value={rq41Form.fornecedor} onChange={(e) => setRq41Form({ ...rq41Form, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq41-visc">Viscosidade</Label>
                <Input id="rq41-visc" placeholder="Ex: 4500 cP" value={rq41Form.viscosidade} onChange={(e) => setRq41Form({ ...rq41Form, viscosidade: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq41-ts">Teor de Sólidos (cola e resina)</Label>
                <Input id="rq41-ts" placeholder="Ex: 52%" value={rq41Form.teor_solidos} onChange={(e) => setRq41Form({ ...rq41Form, teor_solidos: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq41-ph">pH (cola e resina)</Label>
                <Input id="rq41-ph" type="number" step="0.1" placeholder="Ex: 7.2" value={rq41Form.ph} onChange={(e) => setRq41Form({ ...rq41Form, ph: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq41-den">Densidade (resina)</Label>
                <Input id="rq41-den" type="number" step="0.001" placeholder="Ex: 1.235 g/cm³" value={rq41Form.densidade} onChange={(e) => setRq41Form({ ...rq41Form, densidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq41-gel">Gel Time (resina)</Label>
                <Input id="rq41-gel" placeholder="Ex: 45 s" value={rq41Form.gel_time} onChange={(e) => setRq41Form({ ...rq41Form, gel_time: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rq41-abs">Absorção de Água (extensor)</Label>
                <Input id="rq41-abs" placeholder="Ex: 12%" value={rq41Form.absorcao_agua} onChange={(e) => setRq41Form({ ...rq41Form, absorcao_agua: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rq41-qtd">Quantidade *</Label>
                <Input id="rq41-qtd" type="number" min="1" placeholder="Ex: 100" value={rq41Form.quantidade} onChange={(e) => setRq41Form({ ...rq41Form, quantidade: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Resultado *</Label>
              <Select value={rq41Form.resultado} onValueChange={(v) => setRq41Form({ ...rq41Form, resultado: v as typeof rq41Form.resultado })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{OPCOES_QUALIDADE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleRQ41Save} disabled={savingRQ41}>
              {savingRQ41 && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {rq41EditId !== null ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RecebimentoInsumosPage() {
  return (
    <RequirePagina pagina="qualidade:recebimento">
      <RecebimentoInsumosPageInner />
    </RequirePagina>
  );
}
