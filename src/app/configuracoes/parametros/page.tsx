"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

interface Parametros {
  unidadePadrao: string;
  inicioDiaProdutivo: string;
  intervaloSincronizacao: number;
  frequenciaAtualizacaoDashboards: number;
  tempoMaquinaOffline: number;
  maxRegistrosConsulta: number;

  oeeVerde: number;
  oeeAmarelo: number;
  oeePeriodoMinimo: number;
  oeeTolerancia: number;
  oeeMetaPadrao: number;

  alertaBaixaProducao: number;
  alertaBaixaEficiencia: number;
  alertaTempoMaxParada: number;
  alertaToleranciaConsumo: number;

  cacheSegundos: number;
  paginacaoPadrao: number;
  retencaoTemporaria: number;
}

const PADRAO: Parametros = {
  unidadePadrao: "un.",
  inicioDiaProdutivo: "06:00",
  intervaloSincronizacao: 5,
  frequenciaAtualizacaoDashboards: 30,
  tempoMaquinaOffline: 15,
  maxRegistrosConsulta: 5000,
  oeeVerde: 85,
  oeeAmarelo: 70,
  oeePeriodoMinimo: 7,
  oeeTolerancia: 5,
  oeeMetaPadrao: 85,
  alertaBaixaProducao: 20,
  alertaBaixaEficiencia: 15,
  alertaTempoMaxParada: 30,
  alertaToleranciaConsumo: 10,
  cacheSegundos: 60,
  paginacaoPadrao: 25,
  retencaoTemporaria: 30,
};

function Campo({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ParametrosSistemaPageInner() {
  const [salvo, setSalvo] = useState<Parametros>(PADRAO);
  const [form, setForm] = useState<Parametros>(PADRAO);
  const sujo = JSON.stringify(salvo) !== JSON.stringify(form);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!sujo) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [sujo]);

  function num(v: string) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function salvar() {
    if (form.oeeAmarelo >= form.oeeVerde) {
      toast.error("O limite amarelo do OEE precisa ser menor que o limite verde.");
      return;
    }
    setSalvo(form);
    toast.success("Configurações salvas com sucesso.");
  }

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader
        title="Parâmetros do Sistema"
        description="Regras e parâmetros globais da aplicação."
        actions={<Button size="sm" onClick={salvar} disabled={!sujo}>Salvar alterações</Button>}
      />

      <MockDataBanner />

      {sujo && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-foreground">
          Você tem alterações não salvas nesta página.
        </div>
      )}

      <SettingsSection title="Produção">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo label="Unidade padrão" description="Unidade de medida usada por padrão nos relatórios de produção.">
              <Select value={form.unidadePadrao} onValueChange={(v) => setForm({ ...form, unidadePadrao: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="un.">Unidades (un.)</SelectItem>
                  <SelectItem value="m²">Metros quadrados (m²)</SelectItem>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Início do dia produtivo" description="Horário em que um novo 'dia de produção' começa a ser contabilizado.">
              <Input type="time" value={form.inicioDiaProdutivo} onChange={(e) => setForm({ ...form, inicioDiaProdutivo: e.target.value })} />
            </Campo>
            <Campo label="Intervalo de sincronização (min)" description="De quanto em quanto tempo os dados de produção são buscados automaticamente.">
              <Input type="number" min={1} value={form.intervaloSincronizacao} onChange={(e) => setForm({ ...form, intervaloSincronizacao: num(e.target.value) })} />
            </Campo>
            <Campo label="Atualização dos dashboards (s)" description="Frequência de atualização automática dos gráficos e KPIs.">
              <Input type="number" min={5} value={form.frequenciaAtualizacaoDashboards} onChange={(e) => setForm({ ...form, frequenciaAtualizacaoDashboards: num(e.target.value) })} />
            </Campo>
            <Campo label="Máquina offline após (min)" description="Tempo sem novos registros pra uma máquina ser considerada offline.">
              <Input type="number" min={1} value={form.tempoMaquinaOffline} onChange={(e) => setForm({ ...form, tempoMaquinaOffline: num(e.target.value) })} />
            </Campo>
            <Campo label="Máx. registros por consulta" description="Limite de linhas retornadas por busca, pra evitar consultas muito pesadas.">
              <Input type="number" min={100} step={100} value={form.maxRegistrosConsulta} onChange={(e) => setForm({ ...form, maxRegistrosConsulta: num(e.target.value) })} />
            </Campo>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="OEE e eficiência">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo label="Limite verde do OEE (%)" description="OEE igual ou acima disso é classificado como bom (verde).">
              <Input type="number" min={0} max={100} value={form.oeeVerde} onChange={(e) => setForm({ ...form, oeeVerde: num(e.target.value) })} />
            </Campo>
            <Campo label="Limite amarelo do OEE (%)" description="OEE igual ou acima disso (e abaixo do verde) é classificado como atenção.">
              <Input type="number" min={0} max={100} value={form.oeeAmarelo} onChange={(e) => setForm({ ...form, oeeAmarelo: num(e.target.value) })} />
            </Campo>
            <Campo label="Período mínimo (dias)" description="Quantidade mínima de dias de dado necessária pra calcular um OEE confiável.">
              <Input type="number" min={1} value={form.oeePeriodoMinimo} onChange={(e) => setForm({ ...form, oeePeriodoMinimo: num(e.target.value) })} />
            </Campo>
            <Campo label="Tolerância (%)" description="Margem de variação aceita antes de disparar um alerta de desvio.">
              <Input type="number" min={0} max={100} value={form.oeeTolerancia} onChange={(e) => setForm({ ...form, oeeTolerancia: num(e.target.value) })} />
            </Campo>
            <Campo label="Meta padrão de OEE (%)" description="Meta usada quando uma máquina/linha não tem meta específica definida.">
              <Input type="number" min={0} max={100} value={form.oeeMetaPadrao} onChange={(e) => setForm({ ...form, oeeMetaPadrao: num(e.target.value) })} />
            </Campo>
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
            <span className="font-medium text-foreground">Fórmula:</span> OEE = Disponibilidade × Performance × Qualidade. Hoje o sistema não calcula OEE de
            verdade (não há dado de paradas/tempo planejado) — estes parâmetros ficam prontos pra quando essa base de dados existir.
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Alertas">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Baixa produção (%)" description="Alerta quando a produção cair abaixo desse % da meta.">
              <Input type="number" min={0} max={100} value={form.alertaBaixaProducao} onChange={(e) => setForm({ ...form, alertaBaixaProducao: num(e.target.value) })} />
            </Campo>
            <Campo label="Baixa eficiência (%)" description="Alerta quando a eficiência cair abaixo desse %.">
              <Input type="number" min={0} max={100} value={form.alertaBaixaEficiencia} onChange={(e) => setForm({ ...form, alertaBaixaEficiencia: num(e.target.value) })} />
            </Campo>
            <Campo label="Tempo máx. de parada (min)" description="Alerta quando uma máquina ficar parada além desse tempo.">
              <Input type="number" min={1} value={form.alertaTempoMaxParada} onChange={(e) => setForm({ ...form, alertaTempoMaxParada: num(e.target.value) })} />
            </Campo>
            <Campo label="Tolerância de consumo (%)" description="Margem antes de alertar sobre consumo de insumos fora do esperado.">
              <Input type="number" min={0} max={100} value={form.alertaToleranciaConsumo} onChange={(e) => setForm({ ...form, alertaToleranciaConsumo: num(e.target.value) })} />
            </Campo>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Dados e desempenho">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Tempo de cache (s)" description="Por quanto tempo uma resposta pode ficar em cache antes de ser buscada de novo.">
              <Input type="number" min={0} value={form.cacheSegundos} onChange={(e) => setForm({ ...form, cacheSegundos: num(e.target.value) })} />
            </Campo>
            <Campo label="Paginação padrão" description="Quantidade de itens por página quando o usuário não escolhe explicitamente.">
              <Input type="number" min={5} value={form.paginacaoPadrao} onChange={(e) => setForm({ ...form, paginacaoPadrao: num(e.target.value) })} />
            </Campo>
            <Campo label="Retenção de dados temporários (dias)" description="Por quantos dias dados temporários/caches ficam guardados antes de serem limpos.">
              <Input type="number" min={1} value={form.retencaoTemporaria} onChange={(e) => setForm({ ...form, retencaoTemporaria: num(e.target.value) })} />
            </Campo>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
    </RequirePerfil>
  );
}

export default function ParametrosSistemaPage() {
  return (
    <RequirePagina pagina="configuracoes:parametros">
      <ParametrosSistemaPageInner />
    </RequirePagina>
  );
}
