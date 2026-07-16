"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { NotificationMatrix, type NotificationRow, type Criticidade } from "@/components/configuracoes/NotificationMatrix";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

const CANAIS = [
  { key: "sistema", label: "Sistema" },
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
];

const ROWS_INICIAIS: NotificationRow[] = [
  { id: "producao_baixa", label: "Produção abaixo da meta", criticidade: "alta", canais: { sistema: true, email: true, whatsapp: false, telegram: false } },
  { id: "maquina_parada", label: "Máquina parada", criticidade: "media", canais: { sistema: true, email: false, whatsapp: false, telegram: false } },
  { id: "maquina_offline", label: "Máquina offline", criticidade: "alta", canais: { sistema: true, email: true, whatsapp: true, telegram: false } },
  { id: "manutencao_programada", label: "Manutenção programada", criticidade: "baixa", canais: { sistema: true, email: false, whatsapp: false, telegram: false } },
  { id: "nao_conformidade", label: "Não conformidade", criticidade: "media", canais: { sistema: true, email: true, whatsapp: false, telegram: false } },
  { id: "falha_integracao", label: "Falha de integração", criticidade: "alta", canais: { sistema: true, email: true, whatsapp: false, telegram: true } },
  { id: "backup_concluido", label: "Backup concluído", criticidade: "baixa", canais: { sistema: true, email: false, whatsapp: false, telegram: false } },
  { id: "erro_sistema", label: "Erro do sistema", criticidade: "alta", canais: { sistema: true, email: true, whatsapp: false, telegram: false } },
];

function NotificacoesPageInner() {
  const [rows, setRows] = useState(ROWS_INICIAIS);
  const [silencioInicio, setSilencioInicio] = useState("22:00");
  const [silencioFim, setSilencioFim] = useState("06:00");
  const [escalonamento, setEscalonamento] = useState("nenhum");
  const [destinatariosEmail, setDestinatariosEmail] = useState("producao@concrem.com.br");
  const [destinatariosWhatsapp, setDestinatariosWhatsapp] = useState("");
  const [destinatariosTelegram, setDestinatariosTelegram] = useState("");

  function onToggleCanal(rowId: string, canal: string) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, canais: { ...r.canais, [canal]: !r.canais[canal] } } : r)));
  }

  function onCriticidadeChange(rowId: string, criticidade: Criticidade) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, criticidade } : r)));
  }

  function onTestar(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    toast.success(`Notificação de teste enviada para "${row?.label}" (simulado).`);
  }

  function salvarDestinatarios() {
    toast.success("Destinatários salvos com sucesso.");
  }

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-6">
      <SettingsPageHeader title="Notificações" description="Matriz de eventos e canais de disparo." />

      <MockDataBanner />

      <SettingsSection title="Matriz de notificações" description="Ative/desative canais por evento e ajuste a criticidade de cada um.">
        <NotificationMatrix canais={CANAIS} rows={rows} onToggleCanal={onToggleCanal} onCriticidadeChange={onCriticidadeChange} onTestar={onTestar} />
      </SettingsSection>

      <SettingsSection title="Horário silencioso" description="Notificações não críticas não são enviadas nesse intervalo.">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Início</Label>
              <Input type="time" value={silencioInicio} onChange={(e) => setSilencioInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fim</Label>
              <Input type="time" value={silencioFim} onChange={(e) => setSilencioFim(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Escalonamento</Label>
              <Select value={escalonamento} onValueChange={setEscalonamento}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="supervisor_15">Escalar pro Supervisor após 15 min</SelectItem>
                  <SelectItem value="admin_30">Escalar pro Administrador após 30 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Destinatários padrão" actions={<Button size="sm" onClick={salvarDestinatarios}>Salvar</Button>}>
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm">E-mails</Label>
              <Textarea rows={2} value={destinatariosEmail} onChange={(e) => setDestinatariosEmail(e.target.value)} placeholder="um por linha ou separado por vírgula" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Números de WhatsApp</Label>
              <Textarea rows={2} value={destinatariosWhatsapp} onChange={(e) => setDestinatariosWhatsapp(e.target.value)} placeholder="+55 11 91234-5678" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Chat IDs do Telegram</Label>
              <Textarea rows={2} value={destinatariosTelegram} onChange={(e) => setDestinatariosTelegram(e.target.value)} placeholder="123456789" />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
    </RequirePerfil>
  );
}

export default function NotificacoesPage() {
  return (
    <RequirePagina pagina="configuracoes:notificacoes">
      <NotificacoesPageInner />
    </RequirePagina>
  );
}
