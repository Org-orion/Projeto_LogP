"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Workflow, Building2, Cog, Factory } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { StatusPill } from "@/components/configuracoes/StatusPill";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Maquina } from "@/components/production/types";

// ── Linhas de produção (mock — sem tabela própria hoje) ──
interface LinhaProducao { id: number; nome: string; codigo: string; descricao: string; setor: string; qtdMaquinas: number; ativa: boolean }
const LINHAS_MOCK: LinhaProducao[] = [
  { id: 1, nome: "Linha Portas A", codigo: "LP-A", descricao: "Linha principal de montagem de portas", setor: "Portas", qtdMaquinas: 8, ativa: true },
  { id: 2, nome: "Linha Portas B", codigo: "LP-B", descricao: "Linha secundária de portas", setor: "Portas", qtdMaquinas: 5, ativa: true },
  { id: 3, nome: "Linha Guarnição", codigo: "LG-01", descricao: "Linha de alizares e batentes", setor: "Guarnição", qtdMaquinas: 6, ativa: true },
  { id: 4, nome: "Linha Embalagem", codigo: "LE-01", descricao: "Linha de embalagem final", setor: "Expedição", qtdMaquinas: 3, ativa: false },
];

// ── Setores (mock) ──
interface SetorEstrutura { id: number; nome: string; codigo: string; descricao: string; responsavel: string; qtdLinhas: number; ativo: boolean }
const SETORES_MOCK: SetorEstrutura[] = [
  { id: 1, nome: "Portas", codigo: "SET-PT", descricao: "Produção de portas de madeira", responsavel: "João Silva", qtdLinhas: 2, ativo: true },
  { id: 2, nome: "Guarnição", codigo: "SET-GU", descricao: "Alizares, batentes e rodapés", responsavel: "Maria Souza", qtdLinhas: 1, ativo: true },
  { id: 3, nome: "Expedição", codigo: "SET-EX", descricao: "Embalagem e envio", responsavel: "Carlos Lima", qtdLinhas: 1, ativo: true },
];

// ── Centros de trabalho (mock) ──
interface CentroTrabalho { id: number; nome: string; codigo: string; setor: string; linhas: string; maquinas: string; capacidade: string; ativo: boolean }
const CENTROS_MOCK: CentroTrabalho[] = [
  { id: 1, nome: "Centro Prensagem", codigo: "CT-01", setor: "Portas", linhas: "Linha Portas A, Linha Portas B", maquinas: "Prensa Fria 1, Prensa Fria 2", capacidade: "1.200 un./dia", ativo: true },
  { id: 2, nome: "Centro Moldureira", codigo: "CT-02", setor: "Guarnição", linhas: "Linha Guarnição", maquinas: "Moldureira de Alizar 1, 2", capacidade: "800 un./dia", ativo: true },
];

function EstruturaIndustrialPageInner() {
  const [linhas, setLinhas] = useState(LINHAS_MOCK);
  const [setores, setSetores] = useState(SETORES_MOCK);
  const [centros, setCentros] = useState(CENTROS_MOCK);
  const [confirmar, setConfirmar] = useState<{ tipo: "linha" | "setor" | "centro"; id: number; ativar: boolean } | null>(null);

  function alternarStatus() {
    if (!confirmar) return;
    const { tipo, id, ativar } = confirmar;
    if (tipo === "linha") setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ativa: ativar } : l)));
    if (tipo === "setor") setSetores((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: ativar } : s)));
    if (tipo === "centro") setCentros((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: ativar } : c)));
    toast.success(`${ativar ? "Ativado" : "Desativado"} com sucesso (só nesta sessão).`);
    setConfirmar(null);
  }

  const colunasLinhas: SettingsTableColumn<LinhaProducao>[] = [
    { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
    { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: "descricao", header: "Descrição", render: (r) => r.descricao, hideOnMobile: true },
    { key: "setor", header: "Setor", render: (r) => r.setor, hideOnMobile: true },
    { key: "qtd", header: "Máquinas", render: (r) => r.qtdMaquinas, className: "text-center" },
    { key: "status", header: "Status", render: (r) => <StatusPill label={r.ativa ? "Ativa" : "Inativa"} tone={r.ativa ? "success" : "neutral"} /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmar({ tipo: "linha", id: r.id, ativar: !r.ativa })}>
          {r.ativa ? "Desativar" : "Ativar"}
        </Button>
      ),
    },
  ];

  const colunasSetores: SettingsTableColumn<SetorEstrutura>[] = [
    { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
    { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: "descricao", header: "Descrição", render: (r) => r.descricao, hideOnMobile: true },
    { key: "responsavel", header: "Responsável", render: (r) => r.responsavel, hideOnMobile: true },
    { key: "qtd", header: "Linhas", render: (r) => r.qtdLinhas, className: "text-center" },
    { key: "status", header: "Status", render: (r) => <StatusPill label={r.ativo ? "Ativo" : "Inativo"} tone={r.ativo ? "success" : "neutral"} /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmar({ tipo: "setor", id: r.id, ativar: !r.ativo })}>
          {r.ativo ? "Desativar" : "Ativar"}
        </Button>
      ),
    },
  ];

  const colunasCentros: SettingsTableColumn<CentroTrabalho>[] = [
    { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
    { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: "setor", header: "Setor", render: (r) => r.setor },
    { key: "linhas", header: "Linhas associadas", render: (r) => r.linhas, hideOnMobile: true },
    { key: "maquinas", header: "Máquinas associadas", render: (r) => r.maquinas, hideOnMobile: true },
    { key: "capacidade", header: "Capacidade", render: (r) => r.capacidade },
    { key: "status", header: "Status", render: (r) => <StatusPill label={r.ativo ? "Ativo" : "Inativo"} tone={r.ativo ? "success" : "neutral"} /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmar({ tipo: "centro", id: r.id, ativar: !r.ativo })}>
          {r.ativo ? "Desativar" : "Ativar"}
        </Button>
      ),
    },
  ];

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader title="Estrutura Industrial" description="Configuração da estrutura operacional da fábrica: linhas, setores, máquinas e centros de trabalho." />

      <Tabs defaultValue="linhas">
        <TabsList>
          <TabsTrigger value="linhas" className="gap-1.5"><Workflow className="h-3.5 w-3.5" />Linhas de Produção</TabsTrigger>
          <TabsTrigger value="setores" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Setores</TabsTrigger>
          <TabsTrigger value="maquinas" className="gap-1.5"><Cog className="h-3.5 w-3.5" />Máquinas</TabsTrigger>
          <TabsTrigger value="centros" className="gap-1.5"><Factory className="h-3.5 w-3.5" />Centros de Trabalho</TabsTrigger>
        </TabsList>

        <TabsContent value="linhas" className="space-y-4 mt-4">
          <MockDataBanner />
          <SettingsTable
            columns={colunasLinhas}
            rows={linhas}
            getRowId={(r) => r.id}
            searchPlaceholder="Buscar linha..."
            searchFn={(r, t) => r.nome.toLowerCase().includes(t) || r.codigo.toLowerCase().includes(t)}
            emptyTitle="Nenhuma linha cadastrada"
            toolbarExtra={<Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Nova Linha</Button>}
          />
        </TabsContent>

        <TabsContent value="setores" className="space-y-4 mt-4">
          <MockDataBanner />
          <SettingsTable
            columns={colunasSetores}
            rows={setores}
            getRowId={(r) => r.id}
            searchPlaceholder="Buscar setor..."
            searchFn={(r, t) => r.nome.toLowerCase().includes(t) || r.codigo.toLowerCase().includes(t)}
            emptyTitle="Nenhum setor cadastrado"
            toolbarExtra={<Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Novo Setor</Button>}
          />
        </TabsContent>

        <TabsContent value="maquinas" className="space-y-4 mt-4">
          <MaquinasTab />
        </TabsContent>

        <TabsContent value="centros" className="space-y-4 mt-4">
          <MockDataBanner />
          <SettingsTable
            columns={colunasCentros}
            rows={centros}
            getRowId={(r) => r.id}
            searchPlaceholder="Buscar centro de trabalho..."
            searchFn={(r, t) => r.nome.toLowerCase().includes(t) || r.codigo.toLowerCase().includes(t)}
            emptyTitle="Nenhum centro de trabalho cadastrado"
            toolbarExtra={<Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Novo Centro</Button>}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmar !== null}
        onOpenChange={(open) => !open && setConfirmar(null)}
        title={confirmar?.ativar ? "Ativar item" : "Desativar item"}
        description={
          confirmar?.ativar
            ? "Isso vai marcar o item como ativo novamente."
            : "Itens desativados deixam de aparecer nos filtros de produção. Você pode reverter a qualquer momento."
        }
        confirmLabel={confirmar?.ativar ? "Ativar" : "Desativar"}
        destructive={!confirmar?.ativar}
        onConfirm={alternarStatus}
      />
    </div>
    </RequirePerfil>
  );
}

// ── Aba Máquinas: única com dado real, reaproveita a tabela `maquinas` já
// usada em MaquinasPage.tsx (mesmo client Supabase, mesma regra de negócio). ──
function MaquinasTab() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Maquina | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from("maquinas").select("*").order("nome");
    if (error) toast.error("Erro ao carregar máquinas: " + error.message);
    else setMaquinas(data ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirEdicao(m: Maquina) {
    setEditando(m);
    setNomeEdit((m.nome as string) ?? "");
  }

  async function salvar() {
    if (!editando || !nomeEdit.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("maquinas").update({ nome: nomeEdit.trim() }).eq("id", editando.id);
    setSalvando(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Máquina atualizada.");
    setEditando(null);
    carregar();
  }

  const columns: SettingsTableColumn<Maquina>[] = [
    { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{(r.nome as string) ?? `Máquina ${r.id}`}</span> },
    { key: "codigo", header: "Código", render: () => <span className="text-muted-foreground">—</span>, hideOnMobile: true },
    { key: "linha", header: "Linha", render: () => <span className="text-muted-foreground">—</span>, hideOnMobile: true },
    { key: "setor", header: "Setor", render: () => <span className="text-muted-foreground">—</span>, hideOnMobile: true },
    { key: "fabricante", header: "Fabricante", render: () => <span className="text-muted-foreground">—</span>, hideOnMobile: true },
    { key: "status", header: "Status", render: () => <StatusPill label="Ativa" tone="success" /> },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar nome" onClick={() => abrirEdicao(r)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-status-info/30 bg-status-info/10 px-3.5 py-2.5 text-xs text-foreground">
        <span className="font-semibold">Dado real.</span> Reaproveita a tabela <code className="font-mono">maquinas</code> já usada em Produção → Máquinas.
        Código, Linha, Setor, Fabricante, Modelo e Capacidade ainda não existem como colunas nessa tabela — por isso aparecem como "—". Status também não é
        editável hoje (a tabela não tem essa coluna ainda), então toda máquina aparece como "Ativa".
      </div>
      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <SettingsTable
          columns={columns}
          rows={maquinas}
          getRowId={(r) => r.id}
          searchPlaceholder="Buscar máquina..."
          searchFn={(r, t) => ((r.nome as string) ?? "").toLowerCase().includes(t)}
          emptyTitle="Nenhuma máquina cadastrada"
        />
      )}

      <Dialog open={editando !== null} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar máquina</DialogTitle></DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="nome-maquina">Nome</Label>
            <Input id="nome-maquina" value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EstruturaIndustrialPage() {
  return (
    <RequirePagina pagina="configuracoes:estrutura-industrial">
      <EstruturaIndustrialPageInner />
    </RequirePagina>
  );
}
