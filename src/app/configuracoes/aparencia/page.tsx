"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, PanelLeft } from "lucide-react";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { SettingsCard } from "@/components/configuracoes/SettingsCard";
import { SettingsSection } from "@/components/configuracoes/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { RequirePagina } from "@/components/RequirePagina";

type Densidade = "compacta" | "confortavel" | "espacosa";
type FormatoData = "dd/mm/aaaa" | "mm/dd/aaaa";
type FormatoNumero = "1.234,56" | "1,234.56";

const PREFS_KEY = "logp_aparencia_prefs";

interface Prefs {
  densidade: Densidade;
  animacoes: boolean;
  formatoData: FormatoData;
  formatoNumero: FormatoNumero;
}

const PREFS_PADRAO: Prefs = { densidade: "confortavel", animacoes: true, formatoData: "dd/mm/aaaa", formatoNumero: "1.234,56" };

function AparenciaPageInner() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const [prefs, setPrefs] = useState<Prefs>(PREFS_PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(PREFS_KEY);
    if (salvo) {
      try { setPrefs({ ...PREFS_PADRAO, ...JSON.parse(salvo) }); } catch { /* ignora prefs corrompidas */ }
    }
    setCarregado(true);
  }, []);

  function atualizarPrefs(patch: Partial<Prefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
    toast.success("Preferência salva neste navegador.");
  }

  if (!carregado) return null;

  const agora = new Date(2026, 6, 15);
  const previewData = prefs.formatoData === "dd/mm/aaaa"
    ? `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`
    : `${String(agora.getMonth() + 1).padStart(2, "0")}/${String(agora.getDate()).padStart(2, "0")}/${agora.getFullYear()}`;
  const previewNumero = prefs.formatoNumero;

  const densidadePadding: Record<Densidade, string> = { compacta: "py-1.5", confortavel: "py-2.5", espacosa: "py-4" };

  return (
    <div className="space-y-6">
      <SettingsPageHeader title="Aparência" description="Preferências visuais do sistema — tema, densidade e formatos de exibição." />

      <SettingsSection title="Tema" description="Aplicado imediatamente, usando o Theme Provider já existente no app.">
        <div className="flex flex-wrap gap-2">
          {([
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Escuro", icon: Moon },
            { value: "system", label: "Automático", icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={theme === value ? "default" : "outline"}
              className="gap-2"
              onClick={() => setTheme(value)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        {theme === "system" && (
          <p className="text-xs text-muted-foreground mt-2">Sistema operacional detectado: modo {resolvedTheme === "dark" ? "escuro" : "claro"}.</p>
        )}
      </SettingsSection>

      <SettingsSection title="Menu" description="Controla o mesmo recolher/expandir do sidebar já usado no atalho do cabeçalho.">
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Menu compacto</Label>
                <p className="text-xs text-muted-foreground">Mostra só os ícones, sem os rótulos.</p>
              </div>
            </div>
            <Switch checked={sidebarState === "collapsed"} onCheckedChange={() => toggleSidebar()} />
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Densidade e animações" description="Preferências salvas neste navegador (não sincronizam entre dispositivos ainda).">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Densidade da interface</Label>
              <Select value={prefs.densidade} onValueChange={(v) => atualizarPrefs({ densidade: v as Densidade })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compacta">Compacta</SelectItem>
                  <SelectItem value="confortavel">Confortável</SelectItem>
                  <SelectItem value="espacosa">Espaçosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3">
              <Label className="text-sm font-medium">Animações</Label>
              <Switch checked={prefs.animacoes} onCheckedChange={(v) => atualizarPrefs({ animacoes: v })} />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
            <div className="rounded-lg border border-border overflow-hidden">
              {["Linha de exemplo 1", "Linha de exemplo 2", "Linha de exemplo 3"].map((linha, i) => (
                <div
                  key={linha}
                  className={cn(
                    "px-3 text-sm transition-all",
                    densidadePadding[prefs.densidade],
                    i % 2 === 0 ? "bg-muted/40" : "bg-transparent",
                    prefs.animacoes && "hover:bg-primary/5",
                  )}
                >
                  {linha}
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Idioma e formatos">
        <SettingsCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Idioma</Label>
              <Select value="pt-br" disabled>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Outros idiomas ainda não disponíveis.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Formato de data</Label>
              <Select value={prefs.formatoData} onValueChange={(v) => atualizarPrefs({ formatoData: v as FormatoData })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/aaaa">DD/MM/AAAA</SelectItem>
                  <SelectItem value="mm/dd/aaaa">MM/DD/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Formato numérico</Label>
              <Select value={prefs.formatoNumero} onValueChange={(v) => atualizarPrefs({ formatoNumero: v as FormatoNumero })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.234,56">1.234,56</SelectItem>
                  <SelectItem value="1,234.56">1,234.56</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pré-visualização: <span className="font-medium text-foreground">{previewData}</span> · <span className="font-medium text-foreground">{previewNumero}</span>
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Cor principal">
        <SettingsCard description="A cor de marca é fixa em todo o sistema (Design System da CONCREM) e não pode ser alterada por usuário.">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary border border-border" />
            <div>
              <p className="text-sm font-medium">Verde CONCREM</p>
              <p className="text-xs text-muted-foreground">hsl(var(--primary))</p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

export default function AparenciaPage() {
  return (
    <RequirePagina pagina="configuracoes:aparencia">
      <AparenciaPageInner />
    </RequirePagina>
  );
}
