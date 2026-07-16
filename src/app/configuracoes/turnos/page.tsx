"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Info } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { StatusPill } from "@/components/configuracoes/StatusPill";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Turno {
  id: number;
  nome: string;
  codigo: string;
  horaInicio: string;
  horaFim: string;
  intervaloInicio: string;
  intervaloFim: string;
  diasSemana: string[];
  viraDia: boolean;
  horasExtras: boolean;
  ativo: boolean;
}

const TURNOS_MOCK: Turno[] = [
  { id: 1, nome: "1º Turno", codigo: "T1", horaInicio: "06:00", horaFim: "14:20", intervaloInicio: "10:00", intervaloFim: "10:20", diasSemana: ["Seg", "Ter", "Qua", "Qui", "Sex"], viraDia: false, horasExtras: true, ativo: true },
  { id: 2, nome: "2º Turno", codigo: "T2", horaInicio: "14:20", horaFim: "22:40", intervaloInicio: "18:00", intervaloFim: "18:20", diasSemana: ["Seg", "Ter", "Qua", "Qui", "Sex"], viraDia: false, horasExtras: false, ativo: true },
  { id: 3, nome: "Turno Noturno", codigo: "T3", horaInicio: "22:40", horaFim: "06:00", intervaloInicio: "02:00", intervaloFim: "02:20", diasSemana: ["Seg", "Ter", "Qua", "Qui", "Sex"], viraDia: true, horasExtras: false, ativo: false },
  { id: 4, nome: "Sábado", codigo: "T-SAB", horaInicio: "07:00", horaFim: "12:00", intervaloInicio: "—", intervaloFim: "—", diasSemana: ["Sáb"], viraDia: false, horasExtras: true, ativo: true },
];

const TURNO_VAZIO: Omit<Turno, "id"> = {
  nome: "", codigo: "", horaInicio: "06:00", horaFim: "14:20", intervaloInicio: "10:00", intervaloFim: "10:20",
  diasSemana: ["Seg", "Ter", "Qua", "Qui", "Sex"], viraDia: false, horasExtras: false, ativo: true,
};

function TurnosPageInner() {
  const [turnos, setTurnos] = useState(TURNOS_MOCK);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Turno | null>(null);
  const [form, setForm] = useState(TURNO_VAZIO);
  const [confirmar, setConfirmar] = useState<Turno | null>(null);

  function abrirNovo() {
    setEditando(null);
    setForm(TURNO_VAZIO);
    setDialogAberto(true);
  }

  function abrirEdicao(t: Turno) {
    setEditando(t);
    setForm(t);
    setDialogAberto(true);
  }

  function toggleDia(dia: string) {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia) ? prev.diasSemana.filter((d) => d !== dia) : [...prev.diasSemana, dia],
    }));
  }

  function salvar() {
    if (!form.nome.trim() || !form.codigo.trim()) {
      toast.error("Informe nome e código do turno.");
      return;
    }
    if (form.diasSemana.length === 0) {
      toast.error("Selecione ao menos um dia da semana.");
      return;
    }
    const duplicado = turnos.some((t) => t.codigo.toLowerCase() === form.codigo.trim().toLowerCase() && t.id !== editando?.id);
    if (duplicado) {
      toast.error("Já existe um turno com esse código.");
      return;
    }
    if (editando) {
      setTurnos((prev) => prev.map((t) => (t.id === editando.id ? { ...form, id: editando.id } : t)));
      toast.success("Turno atualizado (só nesta sessão).");
    } else {
      setTurnos((prev) => [...prev, { ...form, id: Math.max(0, ...prev.map((t) => t.id)) + 1 }]);
      toast.success("Turno criado (só nesta sessão).");
    }
    setDialogAberto(false);
  }

  function confirmarExclusao() {
    if (!confirmar) return;
    setTurnos((prev) => prev.map((t) => (t.id === confirmar.id ? { ...t, ativo: !t.ativo } : t)));
    toast.success(`Turno ${confirmar.ativo ? "desativado" : "ativado"}.`);
    setConfirmar(null);
  }

  const columns: SettingsTableColumn<Turno>[] = [
    { key: "nome", header: "Turno", render: (r) => <span className="font-medium">{r.nome}</span> },
    { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: "inicio", header: "Início", render: (r) => r.horaInicio },
    { key: "fim", header: "Término", render: (r) => <span className="flex items-center gap-1">{r.horaFim}{r.viraDia && <span className="text-[10px] text-muted-foreground">+1d</span>}</span> },
    { key: "intervalo", header: "Intervalo", render: (r) => (r.intervaloInicio === "—" ? "—" : `${r.intervaloInicio}–${r.intervaloFim}`), hideOnMobile: true },
    {
      key: "dias", header: "Dias", hideOnMobile: true,
      render: (r) => (
        <div className="flex gap-0.5">
          {DIAS.map((d) => (
            <span key={d} className={cn("h-5 w-5 rounded text-[9px] flex items-center justify-center", r.diasSemana.includes(d) ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground/50")}>
              {d[0]}
            </span>
          ))}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusPill label={r.ativo ? "Ativo" : "Inativo"} tone={r.ativo ? "success" : "neutral"} /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicao(r)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmar(r)}>{r.ativo ? "Desativar" : "Ativar"}</Button>
        </div>
      ),
    },
  ];

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader
        title="Turnos"
        description="Gerencie os horários de funcionamento da produção."
        actions={<Button size="sm" className="gap-1.5" onClick={abrirNovo}><Plus className="h-3.5 w-3.5" />Novo Turno</Button>}
      />

      <div className="rounded-lg border border-status-info/30 bg-status-info/10 px-3.5 py-2.5 text-xs text-foreground flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-status-info mt-0.5" />
        <p>Os turnos cadastrados aqui impactam diretamente os cálculos de <span className="font-semibold">produtividade, eficiência, disponibilidade e OEE</span> em todo o sistema — revise com atenção antes de desativar um turno em uso.</p>
      </div>

      <MockDataBanner />

      <SettingsTable
        columns={columns}
        rows={turnos}
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar turno..."
        searchFn={(r, t) => r.nome.toLowerCase().includes(t) || r.codigo.toLowerCase().includes(t)}
        emptyTitle="Nenhum turno cadastrado"
      />

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editando ? "Editar turno" : "Novo turno"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: 1º Turno" />
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: T1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hora de início</Label>
                <Input type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora de término</Label>
                <Input type="time" value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intervalo (início)</Label>
                <Input type="time" value={form.intervaloInicio === "—" ? "" : form.intervaloInicio} onChange={(e) => setForm({ ...form, intervaloInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Intervalo (fim)</Label>
                <Input type="time" value={form.intervaloFim === "—" ? "" : form.intervaloFim} onChange={(e) => setForm({ ...form, intervaloFim: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dias da semana</Label>
              <div className="flex gap-1.5">
                {DIAS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className={cn(
                      "h-8 w-8 rounded-md text-xs font-medium border transition-colors",
                      form.diasSemana.includes(d) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Vira o dia</Label>
                <p className="text-xs text-muted-foreground">O turno termina no dia seguinte (ex.: turno noturno).</p>
              </div>
              <Switch checked={form.viraDia} onCheckedChange={(v) => setForm({ ...form, viraDia: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Permite horas extras</Label>
              <Switch checked={form.horasExtras} onCheckedChange={(v) => setForm({ ...form, horasExtras: v })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmar !== null}
        onOpenChange={(open) => !open && setConfirmar(null)}
        title={confirmar?.ativo ? "Desativar turno" : "Ativar turno"}
        description={
          confirmar?.ativo
            ? `Desativar "${confirmar?.nome}" pode afetar os cálculos de OEE de máquinas que operam nesse horário.`
            : `Ativar "${confirmar?.nome}" novamente.`
        }
        confirmLabel={confirmar?.ativo ? "Desativar" : "Ativar"}
        destructive={confirmar?.ativo}
        onConfirm={confirmarExclusao}
      />
    </div>
    </RequirePerfil>
  );
}

export default function TurnosPage() {
  return (
    <RequirePagina pagina="configuracoes:turnos">
      <TurnosPageInner />
    </RequirePagina>
  );
}
