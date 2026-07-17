"use client";

import { RequirePagina } from "@/components/RequirePagina";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
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
import { Plus, Pencil, Trash2, CalendarIcon, Scale, Loader2, FileWarning } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { gerarNaoConformidade } from "@/lib/qualidade-integracao";

// ── Extraído de QualidadePage.tsx (aba "gramatura") — mesma lógica/tabela de
// antes (controle_qualidade, tipo=gramatura), sem nenhuma mudança de regra. ──

const COR_VERDE = "hsl(var(--primary))";

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

function abreviarMaquina(nome: string): string {
  return nome
    .replace("Recobridora de Perfil - ", "Recob. ")
    .replace("Coladeira de Alizar", "Col. Alizar");
}

interface GramaturaEntry {
  id: number;
  data: string;
  maquina: string;
  produto: string;
  gramatura: number;
  observacao: string;
}

const EMPTY_GRAM_FORM = {
  data: new Date(), maquina: "", produto: "", gramatura: "", observacao: "",
};

function GramaturaPageInner() {
  const router = useRouter();
  const [gramaturas,     setGramaturas]     = useState<GramaturaEntry[]>([]);
  const [loadingGram,    setLoadingGram]    = useState(false);
  const [gramDialogOpen, setGramDialogOpen] = useState(false);
  const [gramEditingId,  setGramEditingId]  = useState<number | null>(null);
  const [gramForm,       setGramForm]       = useState(EMPTY_GRAM_FORM);
  const [gramDateOpen,   setGramDateOpen]   = useState(false);
  const [savingGram,     setSavingGram]     = useState(false);

  const fetchGramaturas = useCallback(async () => {
    setLoadingGram(true);
    const { data, error } = await supabase
      .from("controle_qualidade")
      .select("*")
      .eq("tipo", "gramatura")
      .order("data", { ascending: false })
      .order("id",   { ascending: false })
      .limit(2000);
    if (error) toast.error("Erro ao carregar medições: " + error.message);
    else setGramaturas(data ?? []);
    setLoadingGram(false);
  }, []);

  useEffect(() => { fetchGramaturas(); }, [fetchGramaturas]);

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

  function openGramAdd() { setGramEditingId(null); setGramForm(EMPTY_GRAM_FORM); setGramDialogOpen(true); }

  function openGramEdit(g: GramaturaEntry) {
    setGramEditingId(g.id);
    setGramForm({ data: new Date(g.data + "T00:00:00"), maquina: g.maquina, produto: g.produto, gramatura: String(g.gramatura), observacao: g.observacao });
    setGramDialogOpen(true);
  }

  async function handleGramDelete(id: number) {
    const { error } = await supabase.from("controle_qualidade").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Registro removido."); fetchGramaturas();
  }

  // Não existe faixa de tolerância cadastrada pra gramatura hoje — em vez de
  // inventar um limite, a decisão de "está fora do esperado" fica com quem
  // registrou a medição, que aciona manualmente a geração da NC.
  function handleGerarNC(g: GramaturaEntry) {
    gerarNaoConformidade(router, {
      processo_cliente: g.produto,
      reclamacao_descricao: `Medição de gramatura fora do esperado.\nMáquina: ${g.maquina}\nProduto: ${g.produto}\nGramatura registrada: ${Number(g.gramatura).toFixed(1)} g/m²\nData: ${format(new Date(g.data + "T00:00:00"), "dd/MM/yyyy")}`,
      criticidade: "media",
    });
  }

  async function handleGramSave() {
    const gramValue = Number(gramForm.gramatura);
    if (!gramForm.maquina || !gramForm.produto) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (isNaN(gramValue) || gramValue <= 0)      { toast.error("Gramatura inválida."); return; }
    setSavingGram(true);
    const payload = { tipo: "gramatura", data: format(gramForm.data, "yyyy-MM-dd"), maquina: gramForm.maquina, produto: gramForm.produto, gramatura: gramValue, observacao: gramForm.observacao.trim() };
    const { error } = gramEditingId !== null
      ? await supabase.from("controle_qualidade").update(payload).eq("id", gramEditingId)
      : await supabase.from("controle_qualidade").insert(payload);
    setSavingGram(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(gramEditingId !== null ? "Registro atualizado." : "Medição registrada.");
    setGramDialogOpen(false); setGramForm(EMPTY_GRAM_FORM); setGramEditingId(null); fetchGramaturas();
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Controle de Qualidade</p>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Gramatura</h1>
      </div>

      {loadingGram ? (
        <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
      ) : (
        <>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600" title="Gerar Não Conformidade" onClick={() => handleGerarNC(g)}><FileWarning className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}

export default function GramaturaPage() {
  return (
    <RequirePagina pagina="qualidade:gramatura">
      <GramaturaPageInner />
    </RequirePagina>
  );
}
