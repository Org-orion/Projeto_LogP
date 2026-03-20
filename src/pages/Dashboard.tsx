import { useState } from "react";
import ConnectionBadge from "@/components/ConnectionBadge";
import ProductionForm from "@/components/ProductionForm";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RelatoriosPage, RegistrosPage, ConfiguracoesPage, AjudaPage } from "@/components/PlaceholderPages";

const MACHINES = [
  { id: "AQ017", name: "AQ017 - Prensa Fria" },
  { id: "AQ009", name: "AQ009 - Seccionadora" },
  { id: "AQ012", name: "AQ012 - Coladeira" },
  { id: "AQ005", name: "AQ005 - Esquadrejadeira" },
  { id: "AQ021", name: "AQ021 - Tupia" },
];

const SECTION_TITLES: Record<string, string> = {
  machines: "Máquinas",
  relatorios: "Relatórios",
  registros: "Registros",
  configuracoes: "Configurações",
  ajuda: "Ajuda",
};

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [activeMachine, setActiveMachine] = useState(MACHINES[0].id);
  const [activeSection, setActiveSection] = useState("machines");
  const currentMachine = MACHINES.find((m) => m.id === activeMachine)!;

  const renderContent = () => {
    switch (activeSection) {
      case "relatorios":
        return <RelatoriosPage />;
      case "registros":
        return <RegistrosPage />;
      case "configuracoes":
        return <ConfiguracoesPage />;
      case "ajuda":
        return <AjudaPage />;
      default:
        return (
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h2 className="text-lg font-bold text-foreground">Registro de Produção</h2>
                </div>
                <Select value={activeMachine} onValueChange={setActiveMachine}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Selecione a máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ProductionForm key={activeMachine} machineName={currentMachine.name} />
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeSection={activeSection}
          onSectionSelect={setActiveSection}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="h-5 w-px bg-border" />
              <h1 className="text-sm font-semibold text-foreground">{SECTION_TITLES[activeSection]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionBadge />
              <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
