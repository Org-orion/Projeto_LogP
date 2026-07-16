"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { StatusPill } from "@/components/configuracoes/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

type EntidadeTipo = "maquina" | "linha" | "setor" | "centro";
type Periodicidade = "diaria" | "semanal" | "mensal" | "anual";

const ENTIDADE_LABEL: Record<EntidadeTipo, string> = { maquina: "Máquina", linha: "Linha", setor: "Setor", centro: "Centro de Trabalho" };
const PERIODO_LABEL: Record<Periodicidade, string> = { diaria: "Diária", semanal: "Semanal", mensal: "Mensal", anual: "Anual" };

interface MetaConfig {
  id: number;
  entidadeTipo: EntidadeTipo;
  entidadeNome: string;
  tipo: string;
  valor: number;
  unidade: string;
  periodicidade: Periodicidade;
  validadeInicio: string;
  validadeFim: string;
  ativo: boolean;
}

const METAS_MOCK: MetaConfig[] = [
  { id: 1, entidadeTipo: "linha", entidadeNome: "Linha Portas A", tipo: "Produção", valor: 1200, unidade: "un./dia", periodicidade: "diaria", validadeInicio: "2026-01-01", validadeFim: "2026-12-31", ativo: true },
  { id: 2, entidadeTipo: "maquina", entidadeNome: "Prensa Fria 1", tipo: "Produção", valor: 600, unidade: "un./dia", periodicidade: "diaria", validadeInicio: "2026-01-01", validadeFim: "2026-12-31", ativo: true },
  { id: 3, entidadeTipo: "setor", entidadeNome: "Portas", tipo: "Produção", valor: 30000, unidade: "un./mês", periodicidade: "mensal", validadeInicio: "2026-01-01", validadeFim: "2026-12-31", ativo: true },
  { id: 4, entidadeTipo: "centro", entidadeNome: "Centro Prensagem", tipo: "Disponibilidade", valor: 92, unidade: "%", periodicidade: "mensal", validadeInicio: "2026-01-01", validadeFim: "2026-06-30", ativo: false },
];

const FORM_VAZIO: Omit<MetaConfig, "id"> = {
  entidadeTipo: "linha", entidadeNome: "", tipo: "Produção", valor: 0, unidade: "un./dia",
  periodicidade: "diaria", validadeInicio: "", validadeFim: "", ativo: true,
};

function MetasConfigPageInner() {
  const [metas, setMetas] = useState(METAS_MOCK);
  const [filtroTipo, setFiltroTipo] = useState<EntidadeTipo | "todas">("todas");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<MetaConfig | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  }

  function abrirEdicao(m: MetaConfig) {
    setEditando(m);
    setForm(m);
    setDialogAberto(true);
  }

  function salvar() {
    if (!form.entidadeNome.trim()) { toast.error("Informe a entidade (máquina/linha/setor/centro)."); return; }
    if (form.valor <= 0) { toast.error("Informe um valor de meta maior que zero."); return; }
    if (!form.validadeInicio || !form.validadeFim) { toast.error("Informe a validade inicial e final."); return; }
    if (form.validadeFim < form.validadeInicio) { toast.error("A validade final não pode ser antes da inicial."); return; }

    const duplicado = metas.some((m) =>
      m.id !== editando?.id &&
      m.entidadeTipo === form.entidadeTipo &&
      m.entidadeNome.toLowerCase() === form.entidadeNome.trim().toLowerCase() &&
      m.periodicidade === form.periodicidade &&
      m.validadeInicio <= form.validadeFim && form.validadeInicio <= m.validadeFim, // sobreposição de período
    );
    if (duplicado) {
      toast.error("Já existe uma meta para essa entidade nesse período — evite duplicidade.");
      return;
    }

    if (editando) {
      setMetas((prev) => prev.map((m) => (m.id === editando.id ? { ...form, id: editando.id } : m)));
      toast.success("Meta atualizada (só nesta sessão).");
    } else {
      setMetas((prev) => [...prev, { ...form, id: Math.max(0, ...prev.map((m) => m.id)) + 1 }]);
      toast.success("Meta criada (só nesta sessão).");
    }
    setDialogAberto(false);
  }

  const filtradas = metas.filter((m) => {
    if (filtroTipo !== "todas" && m.entidadeTipo !== filtroTipo) return false;
    if (filtroStatus === "ativo" && !m.ativo) return false;
    if (filtroStatus === "inativo" && m.ativo) return false;
    return true;
  });

  const columns: SettingsTableColumn<MetaConfig>[] = [
    { key: "entidade", header: "Entidade", render: (r) => <span className="font-medium">{r.entidadeNome}</span> },
    { key: "tipoEntidade", header: "Tipo", render: (r) => ENTIDADE_LABEL[r.entidadeTipo] },
    { key: "tipoMeta", header: "Meta", render: (r) => r.tipo, hideOnMobile: true },
    { key: "valor", header: "Valor", render: (r) => <span className="font-semibold">{r.valor.toLocaleString("pt-BR")} {r.unidade}</span> },
    { key: "periodo", header: "Período", render: (r) => PERIODO_LABEL[r.periodicidade] },
    {
      key: "validade", header: "Validade", hideOnMobile: true,
      render: (r) => <span className="text-xs">{r.validadeInicio.split("-").reverse().join("/")} – {r.validadeFim.split("-").reverse().join("/")}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusPill label={r.ativo ? "Ativa" : "Inativa"} tone={r.ativo ? "success" : "neutral"} /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicao(r)}><Pencil className="h-3.5 w-3.5" /></Button>,
    },
  ];

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader
        title="Metas"
        description="Defina metas operacionais por máquina, linha, setor ou centro de trabalho."
        actions={<Button size="sm" className="gap-1.5" onClick={abrirNovo}><Plus className="h-3.5 w-3.5" />Nova Meta</Button>}
      />

      <MockDataBanner />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Entidade</Label>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as EntidadeTipo | "todas")}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {(Object.keys(ENTIDADE_LABEL) as EntidadeTipo[]).map((t) => <SelectItem key={t} value={t}>{ENTIDADE_LABEL[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as "todos" | "ativo" | "inativo")}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativas</SelectItem>
              <SelectItem value="inativo">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SettingsTable
        columns={columns}
        rows={filtradas}
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar por entidade..."
        searchFn={(r, t) => r.entidadeNome.toLowerCase().includes(t)}
        emptyTitle="Nenhuma meta encontrada"
        emptyDescription="Ajuste os filtros ou cadastre uma nova meta."
      />

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editando ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de entidade</Label>
                <Select value={form.entidadeTipo} onValueChange={(v) => setForm({ ...form, entidadeTipo: v as EntidadeTipo })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ENTIDADE_LABEL) as EntidadeTipo[]).map((t) => <SelectItem key={t} value={t}>{ENTIDADE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome da entidade</Label>
                <Input value={form.entidadeNome} onChange={(e) => setForm({ ...form, entidadeNome: e.target.value })} placeholder="Ex: Linha Portas A" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de meta</Label>
                <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Produção" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un./dia" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Periodicidade</Label>
              <Select value={form.periodicidade} onValueChange={(v) => setForm({ ...form, periodicidade: v as Periodicidade })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIODO_LABEL) as Periodicidade[]).map((p) => <SelectItem key={p} value={p}>{PERIODO_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Validade inicial</Label>
                <Input type="date" value={form.validadeInicio} onChange={(e) => setForm({ ...form, validadeInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Validade final</Label>
                <Input type="date" value={form.validadeFim} onChange={(e) => setForm({ ...form, validadeFim: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePerfil>
  );
}

export default function MetasConfigPage() {
  return (
    <RequirePagina pagina="configuracoes:metas">
      <MetasConfigPageInner />
    </RequirePagina>
  );
}
