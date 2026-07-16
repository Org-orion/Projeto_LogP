"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Database, Globe, Boxes, Radio, Webhook, Mail, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { IntegrationCard, type IntegrationStatus } from "@/components/configuracoes/IntegrationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

interface Integracao {
  id: string;
  nome: string;
  icon: typeof Database;
  descricao: string;
  status: IntegrationStatus;
  ultimaSincronizacao: string | null;
  ambiente: string;
  real?: boolean;
}

const INTEGRACOES_INICIAIS: Integracao[] = [
  { id: "supabase", nome: "Supabase", icon: Database, descricao: "Banco de dados e autenticação principal do sistema.", status: "conectado", ultimaSincronizacao: "agora há pouco", ambiente: "Produção", real: true },
  { id: "erp", nome: "ERP", icon: Boxes, descricao: "Integração com o sistema de gestão empresarial.", status: "desconectado", ultimaSincronizacao: null, ambiente: "Não configurado" },
  { id: "api-externa", nome: "API Externa", icon: Globe, descricao: "Endpoint HTTP genérico pra troca de dados com terceiros.", status: "incompleta", ultimaSincronizacao: null, ambiente: "Homologação" },
  { id: "banco-dados", nome: "Banco de Dados Externo", icon: Database, descricao: "Conexão com um banco de dados adicional (ex.: legado).", status: "desconectado", ultimaSincronizacao: null, ambiente: "Não configurado" },
  { id: "mqtt", nome: "MQTT", icon: Radio, descricao: "Telemetria de máquinas via broker MQTT.", status: "erro", ultimaSincronizacao: "há 3 dias", ambiente: "Produção" },
  { id: "webhooks", nome: "Webhooks", icon: Webhook, descricao: "Notifica sistemas externos quando eventos acontecem.", status: "desconectado", ultimaSincronizacao: null, ambiente: "Não configurado" },
  { id: "email", nome: "E-mail (SMTP)", icon: Mail, descricao: "Envio de e-mails transacionais e alertas.", status: "conectado", ultimaSincronizacao: "há 2 horas", ambiente: "Produção" },
  { id: "whatsapp", nome: "WhatsApp", icon: MessageCircle, descricao: "Notificações via WhatsApp Business API.", status: "incompleta", ultimaSincronizacao: null, ambiente: "Homologação" },
  { id: "telegram", nome: "Telegram", icon: Send, descricao: "Notificações via bot do Telegram.", status: "desconectado", ultimaSincronizacao: null, ambiente: "Não configurado" },
];

function IntegracoesPageInner() {
  const [integracoes, setIntegracoes] = useState(INTEGRACOES_INICIAIS);
  const [testando, setTestando] = useState<string | null>(null);
  const [configurando, setConfigurando] = useState<Integracao | null>(null);
  const [chave, setChave] = useState("");

  async function testarConexao(item: Integracao) {
    setTestando(item.id);
    if (item.real && item.id === "supabase") {
      const { error } = await supabase.from("maquinas").select("id").limit(1);
      setTestando(null);
      if (error) {
        toast.error("Falha na conexão com o Supabase: " + error.message);
        setIntegracoes((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "erro" } : i)));
      } else {
        toast.success("Conexão com o Supabase confirmada.");
        setIntegracoes((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "conectado", ultimaSincronizacao: "agora há pouco" } : i)));
      }
      return;
    }
    // Demais integrações: sem endpoint real ainda, simula o teste.
    await new Promise((r) => setTimeout(r, 900));
    setTestando(null);
    toast.info(`"${item.nome}" ainda não tem uma conexão real configurada — nada foi testado de fato.`);
  }

  function abrirConfigurar(item: Integracao) {
    setConfigurando(item);
    setChave("••••••••••••");
  }

  function salvarConfiguracao() {
    if (!configurando) return;
    toast.success(`Configuração de "${configurando.nome}" salva (só nesta sessão).`);
    setIntegracoes((prev) => prev.map((i) => (i.id === configurando.id && i.id !== "supabase" ? { ...i, status: "incompleta" } : i)));
    setConfigurando(null);
  }

  return (
    <RequirePerfil perfis={["Administrador"]}>
    <div className="space-y-6">
      <SettingsPageHeader title="Integrações" description="Conexões com sistemas externos — ERP, banco de dados, mensageria e automações." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integracoes.map((item) => (
          <IntegrationCard
            key={item.id}
            nome={item.nome}
            icon={item.icon}
            descricao={item.descricao}
            status={item.status}
            ultimaSincronizacao={item.ultimaSincronizacao}
            ambiente={item.ambiente}
            testando={testando === item.id}
            onTestarConexao={() => testarConexao(item)}
            onConfigurar={() => abrirConfigurar(item)}
          />
        ))}
      </div>

      <Dialog open={configurando !== null} onOpenChange={(open) => !open && setConfigurando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Configurar {configurando?.nome}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Ambiente</Label>
              <Input defaultValue={configurando?.ambiente} />
            </div>
            <div className="space-y-1.5">
              <Label>Chave / Token / Secret</Label>
              <Input type="password" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Cole a credencial aqui" />
              <p className="text-xs text-muted-foreground">Por segurança, credenciais nunca são exibidas em texto puro depois de salvas.</p>
            </div>
            <div className="space-y-1.5">
              <Label>URL do endpoint</Label>
              <Input placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={salvarConfiguracao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePerfil>
  );
}

export default function IntegracoesPage() {
  return (
    <RequirePagina pagina="configuracoes:integracoes">
      <IntegracoesPageInner />
    </RequirePagina>
  );
}
