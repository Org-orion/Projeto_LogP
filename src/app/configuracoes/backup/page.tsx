"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { BackupHistoryTable, type BackupEntry } from "@/components/configuracoes/BackupHistoryTable";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

const HISTORICO_MOCK: BackupEntry[] = [
  { id: 1, data: "14/07/2026 03:00", tamanho: "1.4 GB", destino: "Armazenamento em nuvem", duracao: "4m 12s", status: "sucesso", responsavel: "Automático" },
  { id: 2, data: "13/07/2026 03:00", tamanho: "1.4 GB", destino: "Armazenamento em nuvem", duracao: "4m 05s", status: "sucesso", responsavel: "Automático" },
  { id: 3, data: "12/07/2026 03:00", tamanho: "—", destino: "Armazenamento em nuvem", duracao: "0m 42s", status: "falha", responsavel: "Automático" },
  { id: 4, data: "11/07/2026 14:22", tamanho: "1.3 GB", destino: "Armazenamento local", duracao: "3m 51s", status: "sucesso", responsavel: "Luís Gabriel (manual)" },
];

function BackupPageInner() {
  const [automatico, setAutomatico] = useState(true);
  const [frequencia, setFrequencia] = useState("diario");
  const [horario, setHorario] = useState("03:00");
  const [retencaoDias, setRetencaoDias] = useState(30);
  const [destino, setDestino] = useState("nuvem");
  const [criptografado, setCriptografado] = useState(true);
  const [notificarFalha, setNotificarFalha] = useState(true);
  const [notificarSucesso, setNotificarSucesso] = useState(false);

  const [historico, setHistorico] = useState(HISTORICO_MOCK);
  const [executando, setExecutando] = useState(false);
  const [detalhes, setDetalhes] = useState<BackupEntry | null>(null);
  const [restaurar, setRestaurar] = useState<BackupEntry | null>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");

  function salvarConfiguracao() {
    toast.success("Configuração de backup salva com sucesso.");
  }

  async function executarBackupAgora() {
    setExecutando(true);
    await new Promise((r) => setTimeout(r, 1400));
    setHistorico((prev) => [
      { id: `manual-${prev.length}`, data: "Agora", tamanho: "1.4 GB", destino: destino === "nuvem" ? "Armazenamento em nuvem" : "Armazenamento local", duracao: "0m 58s", status: "sucesso", responsavel: "Manual" },
      ...prev,
    ]);
    setExecutando(false);
    toast.success("Backup executado com sucesso (simulado).");
  }

  function baixar(entry: BackupEntry) {
    toast.info(`Download de "${entry.data}" ainda não está conectado a um destino real.`);
  }

  function confirmarRestauracao() {
    if (confirmacaoTexto !== "RESTAURAR") {
      toast.error('Digite "RESTAURAR" para confirmar.');
      return;
    }
    toast.success(`Restauração do backup de ${restaurar?.data} iniciada (simulado).`);
    setRestaurar(null);
    setConfirmacaoTexto("");
  }

  return (
    <RequirePerfil perfis={["Administrador"]}>
    <div className="space-y-6">
      <SettingsPageHeader title="Backup" description="Backup automático e histórico de execuções." />

      <MockDataBanner />

      <SettingsSection title="Configuração" actions={<Button size="sm" onClick={salvarConfiguracao}>Salvar</Button>}>
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:col-span-2 lg:col-span-3">
              <div>
                <Label className="text-sm font-medium">Backup automático</Label>
                <p className="text-xs text-muted-foreground">Executa backups periodicamente, sem intervenção manual.</p>
              </div>
              <Switch checked={automatico} onCheckedChange={setAutomatico} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Frequência</Label>
              <Select value={frequencia} onValueChange={setFrequencia} disabled={!automatico}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Horário</Label>
              <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} disabled={!automatico} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Retenção (dias)</Label>
              <Input type="number" min={1} value={retencaoDias} onChange={(e) => setRetencaoDias(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuvem">Armazenamento em nuvem</SelectItem>
                  <SelectItem value="local">Armazenamento local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Criptografado</Label>
              <Switch checked={criptografado} onCheckedChange={setCriptografado} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Notificar em falha</Label>
              <Switch checked={notificarFalha} onCheckedChange={setNotificarFalha} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-sm">Notificar em sucesso</Label>
              <Switch checked={notificarSucesso} onCheckedChange={setNotificarSucesso} />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Histórico"
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={executarBackupAgora} disabled={executando}>
            <PlayCircle className="h-3.5 w-3.5" />
            {executando ? "Executando..." : "Executar backup agora"}
          </Button>
        }
      >
        <BackupHistoryTable
          rows={historico}
          canDownload
          canRestore
          onVisualizar={setDetalhes}
          onBaixar={baixar}
          onRestaurar={setRestaurar}
        />
      </SettingsSection>

      <Dialog open={detalhes !== null} onOpenChange={(open) => !open && setDetalhes(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Detalhes do backup</DialogTitle></DialogHeader>
          {detalhes && (
            <div className="space-y-2 text-sm">
              {[["Data", detalhes.data], ["Tamanho", detalhes.tamanho], ["Destino", detalhes.destino], ["Duração", detalhes.duracao], ["Responsável", detalhes.responsavel]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground">{l}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={restaurar !== null} onOpenChange={(open) => { if (!open) { setRestaurar(null); setConfirmacaoTexto(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Restaurar backup</DialogTitle>
            <DialogDescription>
              Isso vai substituir os dados atuais pelos do backup de <span className="font-medium text-foreground">{restaurar?.data}</span>. Essa ação não pode
              ser desfeita. Digite <span className="font-mono font-semibold text-foreground">RESTAURAR</span> abaixo para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirmacaoTexto} onChange={(e) => setConfirmacaoTexto(e.target.value)} placeholder="RESTAURAR" />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={confirmarRestauracao} disabled={confirmacaoTexto !== "RESTAURAR"}>Restaurar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePerfil>
  );
}

export default function BackupPage() {
  return (
    <RequirePagina pagina="configuracoes:backup">
      <BackupPageInner />
    </RequirePagina>
  );
}
