"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

type TipoEvento = "feriado" | "manutencao" | "parada" | "operacao_especial" | "dia_produtivo";

const TIPO_CONFIG: Record<TipoEvento, { label: string; badge: string; dot: string }> = {
  feriado:            { label: "Feriado",                    badge: "bg-destructive/15 text-destructive",   dot: "bg-destructive" },
  manutencao:         { label: "Manutenção programada",       badge: "bg-[hsl(var(--card-lime))]/15 text-[hsl(var(--card-lime))]", dot: "bg-[hsl(var(--card-lime))]" },
  parada:             { label: "Parada coletiva",             badge: "bg-[hsl(var(--card-orange))]/15 text-[hsl(var(--card-orange))]", dot: "bg-[hsl(var(--card-orange))]" },
  operacao_especial:  { label: "Operação especial",           badge: "bg-status-info/15 text-status-info",   dot: "bg-status-info" },
  dia_produtivo:      { label: "Dia produtivo adicional",     badge: "bg-status-success/15 text-status-success", dot: "bg-status-success" },
};

interface EventoCalendario {
  id: number;
  titulo: string;
  tipo: TipoEvento;
  dataInicio: string;
  dataFim: string;
  descricao: string;
  recorrencia: "nenhuma" | "anual" | "mensal" | "semanal";
  impactoProducao: "nenhum" | "parcial" | "total";
  responsavel: string;
}

const EVENTOS_MOCK: EventoCalendario[] = [
  { id: 1, titulo: "Independência do Brasil", tipo: "feriado", dataInicio: "2026-09-07", dataFim: "2026-09-07", descricao: "Feriado nacional.", recorrencia: "anual", impactoProducao: "total", responsavel: "RH" },
  { id: 2, titulo: "Manutenção preventiva — Prensa Fria", tipo: "manutencao", dataInicio: "2026-07-20", dataFim: "2026-07-21", descricao: "Manutenção preventiva anual das prensas.", recorrencia: "nenhuma", impactoProducao: "parcial", responsavel: "Manutenção" },
  { id: 3, titulo: "Parada coletiva — recesso", tipo: "parada", dataInicio: "2026-12-24", dataFim: "2026-12-31", descricao: "Recesso coletivo de final de ano.", recorrencia: "anual", impactoProducao: "total", responsavel: "Diretoria" },
  { id: 4, titulo: "Turno extra — pico de demanda", tipo: "operacao_especial", dataInicio: "2026-08-10", dataFim: "2026-08-10", descricao: "Turno adicional aos sábados.", recorrencia: "nenhuma", impactoProducao: "nenhum", responsavel: "PCP" },
];

const FORM_VAZIO: Omit<EventoCalendario, "id"> = {
  titulo: "", tipo: "feriado", dataInicio: "", dataFim: "", descricao: "", recorrencia: "nenhuma", impactoProducao: "nenhum", responsavel: "",
};

function CalendarioIndustrialPageInner() {
  const [eventos, setEventos] = useState(EVENTOS_MOCK);
  const [mesVisivel, setMesVisivel] = useState<Date>(new Date(2026, 6, 1));
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<EventoCalendario | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [excluir, setExcluir] = useState<EventoCalendario | null>(null);

  const modifiers = useMemo(() => {
    const porTipo: Record<TipoEvento, Date[]> = { feriado: [], manutencao: [], parada: [], operacao_especial: [], dia_produtivo: [] };
    for (const ev of eventos) {
      const inicio = new Date(ev.dataInicio + "T00:00:00");
      const fim = new Date(ev.dataFim + "T00:00:00");
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        porTipo[ev.tipo].push(new Date(d));
      }
    }
    return porTipo;
  }, [eventos]);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  }

  function abrirEdicao(ev: EventoCalendario) {
    setEditando(ev);
    setForm(ev);
    setDialogAberto(true);
  }

  function salvar() {
    if (!form.titulo.trim()) { toast.error("Informe o título do evento."); return; }
    if (!form.dataInicio || !form.dataFim) { toast.error("Informe data inicial e final."); return; }
    if (form.dataFim < form.dataInicio) { toast.error("A data final não pode ser antes da inicial."); return; }

    if (editando) {
      setEventos((prev) => prev.map((e) => (e.id === editando.id ? { ...form, id: editando.id } : e)));
      toast.success("Evento atualizado (só nesta sessão).");
    } else {
      setEventos((prev) => [...prev, { ...form, id: Math.max(0, ...prev.map((e) => e.id)) + 1 }]);
      toast.success("Evento criado (só nesta sessão).");
    }
    setDialogAberto(false);
  }

  function confirmarExclusao() {
    if (!excluir) return;
    setEventos((prev) => prev.filter((e) => e.id !== excluir.id));
    toast.success("Evento removido.");
    setExcluir(null);
  }

  const eventosOrdenados = [...eventos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader
        title="Calendário Industrial"
        description="Feriados, paradas programadas, manutenções e exceções de turno."
        actions={<Button size="sm" className="gap-1.5" onClick={abrirNovo}><Plus className="h-3.5 w-3.5" />Novo Evento</Button>}
      />

      <MockDataBanner />

      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(TIPO_CONFIG) as TipoEvento[]).map((t) => (
          <span key={t} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", TIPO_CONFIG[t].badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", TIPO_CONFIG[t].dot)} />
            {TIPO_CONFIG[t].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <Calendar
            mode="single"
            month={mesVisivel}
            onMonthChange={setMesVisivel}
            modifiers={modifiers}
            modifiersClassNames={{
              feriado: "!bg-destructive/15 !text-destructive rounded-md",
              manutencao: "!bg-[hsl(var(--card-lime))]/20 !text-foreground rounded-md",
              parada: "!bg-[hsl(var(--card-orange))]/20 !text-foreground rounded-md",
              operacao_especial: "!bg-status-info/15 !text-status-info rounded-md",
              dia_produtivo: "!bg-status-success/15 !text-status-success rounded-md",
            }}
            className="mx-auto"
          />
        </div>

        <div className="lg:col-span-3 space-y-3">
          {eventosOrdenados.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Nenhum evento cadastrado.
            </div>
          ) : eventosOrdenados.map((ev) => (
            <div key={ev.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium shrink-0", TIPO_CONFIG[ev.tipo].badge)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", TIPO_CONFIG[ev.tipo].dot)} />
                    {TIPO_CONFIG[ev.tipo].label}
                  </span>
                  <p className="text-sm font-semibold truncate">{ev.titulo}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{ev.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.dataInicio.split("-").reverse().join("/")}{ev.dataFim !== ev.dataInicio && ` – ${ev.dataFim.split("-").reverse().join("/")}`}
                  {" · "}Impacto: {ev.impactoProducao === "nenhum" ? "nenhum" : ev.impactoProducao === "parcial" ? "parcial" : "total"}
                  {" · "}Responsável: {ev.responsavel || "—"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicao(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setExcluir(ev)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editando ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoEvento })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_CONFIG) as TipoEvento[]).map((t) => <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v as EventoCalendario["recorrencia"] })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Nenhuma</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data inicial</Label>
                <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Data final</Label>
                <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Impacto na produção</Label>
                <Select value={form.impactoProducao} onValueChange={(v) => setForm({ ...form, impactoProducao: v as EventoCalendario["impactoProducao"] })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(open) => !open && setExcluir(null)}
        title="Remover evento"
        description={`Remover "${excluir?.titulo}" do calendário? Essa ação não pode ser desfeita.`}
        confirmLabel="Remover"
        destructive
        onConfirm={confirmarExclusao}
      />
    </div>
    </RequirePerfil>
  );
}

export default function CalendarioIndustrialPage() {
  return (
    <RequirePagina pagina="configuracoes:calendario">
      <CalendarioIndustrialPageInner />
    </RequirePagina>
  );
}
