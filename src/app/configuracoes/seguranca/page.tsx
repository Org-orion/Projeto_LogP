"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Laptop, Smartphone, Monitor } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

interface Sessao {
  id: number;
  dispositivo: string;
  navegador: string;
  ip: string;
  atual: boolean;
  ultimoAcesso: string;
}

const SESSOES_MOCK: Sessao[] = [
  { id: 1, dispositivo: "Este dispositivo (Windows)", navegador: "Chrome 126", ip: "192.168.0.14", atual: true, ultimoAcesso: "agora" },
  { id: 2, dispositivo: "iPhone", navegador: "Safari Mobile", ip: "187.45.12.90", atual: false, ultimoAcesso: "há 2 dias" },
  { id: 3, dispositivo: "Notebook (Linux)", navegador: "Firefox 128", ip: "201.10.55.3", atual: false, ultimoAcesso: "há 6 dias" },
];

function SegurancaPageInner() {
  const [duasEtapas, setDuasEtapas] = useState(false);
  const [duracaoSessao, setDuracaoSessao] = useState("8");
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(true);
  const [bloqueioAutomatico, setBloqueioAutomatico] = useState(true);

  const [tamanhoMinimo, setTamanhoMinimo] = useState(8);
  const [exigeLetras, setExigeLetras] = useState(true);
  const [exigeNumeros, setExigeNumeros] = useState(true);
  const [exigeSimbolos, setExigeSimbolos] = useState(false);
  const [expiracaoDias, setExpiracaoDias] = useState(90);
  const [bloqueiaReutilizacao, setBloqueiaReutilizacao] = useState(true);

  const [maxTentativas, setMaxTentativas] = useState(5);
  const [tempoBloqueio, setTempoBloqueio] = useState(15);

  const [retencaoLogs, setRetencaoLogs] = useState(180);

  const [sessoes, setSessoes] = useState(SESSOES_MOCK);
  const [encerrar, setEncerrar] = useState<Sessao | null>(null);

  function salvarPoliticaSenha() {
    toast.success("Política de senha salva com sucesso.");
  }

  function confirmarEncerramento() {
    if (!encerrar) return;
    setSessoes((prev) => prev.filter((s) => s.id !== encerrar.id));
    toast.success("Sessão encerrada.");
    setEncerrar(null);
  }

  return (
    <RequirePerfil perfis={["Administrador"]}>
    <div className="space-y-6">
      <SettingsPageHeader title="Segurança" description="Políticas de autenticação, senha e auditoria — visível só para Administradores." />

      <MockDataBanner />

      <SettingsSection title="Autenticação">
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Autenticação em dois fatores</Label>
                <p className="text-xs text-muted-foreground">Exige um segundo código no login, além da senha.</p>
              </div>
              <Switch checked={duasEtapas} onCheckedChange={(v) => { setDuasEtapas(v); toast.success(v ? "2FA ativado." : "2FA desativado."); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Bloqueio automático por inatividade</Label>
                <p className="text-xs text-muted-foreground">Encerra a sessão sozinho depois de um período sem uso.</p>
              </div>
              <Switch checked={bloqueioAutomatico} onCheckedChange={setBloqueioAutomatico} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Renovação automática de sessão</Label>
                <p className="text-xs text-muted-foreground">Estende a sessão automaticamente enquanto o usuário está ativo.</p>
              </div>
              <Switch checked={renovacaoAutomatica} onCheckedChange={setRenovacaoAutomatica} />
            </div>
            <div className="grid gap-1.5 max-w-xs">
              <Label className="text-sm font-medium">Duração da sessão</Label>
              <Select value={duracaoSessao} onValueChange={setDuracaoSessao}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="8">8 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="168">7 dias</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Hoje o servidor usa 8 horas fixas (cookie de sessão) — este seletor ainda não altera o valor real.</p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Política de senha">
        <SettingsCard actions={<Button size="sm" onClick={salvarPoliticaSenha}>Salvar</Button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Tamanho mínimo</Label>
              <Input type="number" min={6} max={32} value={tamanhoMinimo} onChange={(e) => setTamanhoMinimo(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Expiração (dias)</Label>
              <Input type="number" min={0} value={expiracaoDias} onChange={(e) => setExpiracaoDias(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">0 = nunca expira.</p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Exige letras</Label>
              <Switch checked={exigeLetras} onCheckedChange={setExigeLetras} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Exige números</Label>
              <Switch checked={exigeNumeros} onCheckedChange={setExigeNumeros} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Exige símbolos</Label>
              <Switch checked={exigeSimbolos} onCheckedChange={setExigeSimbolos} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Bloquear reutilização de senha</Label>
              <Switch checked={bloqueiaReutilizacao} onCheckedChange={setBloqueiaReutilizacao} />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Tentativas de acesso">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Máximo de tentativas</Label>
              <Input type="number" min={1} value={maxTentativas} onChange={(e) => setMaxTentativas(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tempo de bloqueio (minutos)</Label>
              <Input type="number" min={1} value={tempoBloqueio} onChange={(e) => setTempoBloqueio(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Um Administrador sempre pode desbloquear manualmente uma conta na tela de Usuários.</p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Auditoria">
        <SettingsCard>
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-sm">Retenção de logs (dias)</Label>
            <Input type="number" min={30} value={retencaoLogs} onChange={(e) => setRetencaoLogs(Number(e.target.value))} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Eventos monitorados: login, logout, criação/edição/remoção de registros, alterações de permissão. Cada evento guarda IP, navegador e dispositivo
            de origem (ver <span className="font-medium text-foreground">Logs do Sistema</span>).
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Sessões ativas">
        <div className="space-y-2">
          {sessoes.map((s) => (
            <SettingsCard key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {s.dispositivo.includes("iPhone") ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : s.dispositivo.includes("Notebook") ? <Laptop className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{s.dispositivo} {s.atual && <span className="text-status-success text-xs font-normal">(sessão atual)</span>}</p>
                    <p className="text-xs text-muted-foreground">{s.navegador} · {s.ip} · último acesso {s.ultimoAcesso}</p>
                  </div>
                </div>
                {!s.atual && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setEncerrar(s)}>
                    Encerrar
                  </Button>
                )}
              </div>
            </SettingsCard>
          ))}
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={encerrar !== null}
        onOpenChange={(open) => !open && setEncerrar(null)}
        title="Encerrar sessão"
        description={`Encerrar o acesso de "${encerrar?.dispositivo}"? O usuário precisará entrar novamente nesse dispositivo.`}
        confirmLabel="Encerrar sessão"
        destructive
        onConfirm={confirmarEncerramento}
      />
    </div>
    </RequirePerfil>
  );
}

export default function SegurancaPage() {
  return (
    <RequirePagina pagina="configuracoes:seguranca">
      <SegurancaPageInner />
    </RequirePagina>
  );
}
