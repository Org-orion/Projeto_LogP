"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

type Perfil = "administrador" | "supervisor" | "operador" | "visualizador";
const PERFIS: { value: Perfil; label: string }[] = [
  { value: "administrador", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operador", label: "Operador" },
  { value: "visualizador", label: "Visualizador" },
];

interface Widget { id: string; nome: string; visivel: boolean }
interface ConfigPerfil {
  dashboardInicial: string;
  atualizacaoAutomatica: boolean;
  intervaloAtualizacao: number;
  periodoPadrao: string;
  layout: "padrao" | "compacto" | "denso";
  widgets: Widget[];
}

function configPadrao(perfil: Perfil): ConfigPerfil {
  const base: Widget[] = [
    { id: "producao-total", nome: "Produção Total", visivel: true },
    { id: "producao-linha", nome: "Produção por Linha", visivel: true },
    { id: "producao-mensal", nome: "Produção Mensal", visivel: true },
    { id: "meta-atingida", nome: "Meta Atingida", visivel: perfil !== "operador" },
    { id: "distribuicao-padrao", nome: "Distribuição por Padrão", visivel: perfil === "administrador" || perfil === "supervisor" },
    { id: "distribuicao-largura", nome: "Distribuição por Largura", visivel: perfil === "administrador" },
  ];
  return {
    dashboardInicial: "home",
    atualizacaoAutomatica: true,
    intervaloAtualizacao: 30,
    periodoPadrao: "mes_atual",
    layout: "padrao",
    widgets: base,
  };
}

function DashboardsPageInner() {
  const [perfilAtivo, setPerfilAtivo] = useState<Perfil>("administrador");
  const [configs, setConfigs] = useState<Record<Perfil, ConfigPerfil>>({
    administrador: configPadrao("administrador"),
    supervisor: configPadrao("supervisor"),
    operador: configPadrao("operador"),
    visualizador: configPadrao("visualizador"),
  });

  const config = configs[perfilAtivo];

  function atualizar(patch: Partial<ConfigPerfil>) {
    setConfigs((prev) => ({ ...prev, [perfilAtivo]: { ...prev[perfilAtivo], ...patch } }));
  }

  function toggleWidget(id: string) {
    atualizar({ widgets: config.widgets.map((w) => (w.id === id ? { ...w, visivel: !w.visivel } : w)) });
  }

  function moverWidget(id: string, direcao: -1 | 1) {
    const idx = config.widgets.findIndex((w) => w.id === id);
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= config.widgets.length) return;
    const novos = [...config.widgets];
    [novos[idx], novos[novoIdx]] = [novos[novoIdx], novos[idx]];
    atualizar({ widgets: novos });
  }

  function salvar() {
    toast.success(`Configuração de dashboards salva para o perfil "${PERFIS.find((p) => p.value === perfilAtivo)?.label}".`);
  }

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader
        title="Dashboards"
        description="Configure a experiência analítica do sistema — por perfil de usuário."
        actions={<Button size="sm" onClick={salvar}>Salvar</Button>}
      />

      <MockDataBanner />

      <Tabs value={perfilAtivo} onValueChange={(v) => setPerfilAtivo(v as Perfil)}>
        <TabsList>
          {PERFIS.map((p) => <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={perfilAtivo} className="space-y-6 mt-4">
          <SettingsSection title="Geral">
            <SettingsCard>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Dashboard inicial</Label>
                  <Select value={config.dashboardInicial} onValueChange={(v) => atualizar({ dashboardInicial: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="producao">Produção → Visão Geral</SelectItem>
                      <SelectItem value="maquinas">Produção → Máquinas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Período padrão</Label>
                  <Select value={config.periodoPadrao} onValueChange={(v) => atualizar({ periodoPadrao: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="semana_atual">Semana atual</SelectItem>
                      <SelectItem value="mes_atual">Mês atual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Layout</Label>
                  <Select value={config.layout} onValueChange={(v) => atualizar({ layout: v as ConfigPerfil["layout"] })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="compacto">Compacto</SelectItem>
                      <SelectItem value="denso">Denso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-sm">Atualização automática</Label>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 h-9">
                      <span className="text-xs text-muted-foreground">{config.atualizacaoAutomatica ? `A cada ${config.intervaloAtualizacao}s` : "Desativada"}</span>
                      <Switch checked={config.atualizacaoAutomatica} onCheckedChange={(v) => atualizar({ atualizacaoAutomatica: v })} />
                    </div>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection title="Widgets visíveis e ordem" description="Reordene com as setas — arrastar-e-soltar não foi adicionado por não haver biblioteca de drag-and-drop no projeto.">
            <div className="space-y-2">
              {config.widgets.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{w.nome}</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moverWidget(w.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === config.widgets.length - 1} onClick={() => moverWidget(w.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Switch checked={w.visivel} onCheckedChange={() => toggleWidget(w.id)} />
                </div>
              ))}
            </div>
          </SettingsSection>
        </TabsContent>
      </Tabs>
    </div>
    </RequirePerfil>
  );
}

export default function DashboardsPage() {
  return (
    <RequirePagina pagina="configuracoes:dashboards">
      <DashboardsPageInner />
    </RequirePagina>
  );
}
