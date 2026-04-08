"use client";

import { useState } from "react";
import ConnectionBadge from "@/components/ConnectionBadge";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelatoriosPage, RegistrosPage, ConfiguracoesPage, AjudaPage } from "@/components/PlaceholderPages";
import QualidadePage from "@/components/QualidadePage";
import HomePage from "@/components/HomePage";
import MaquinasPage from "@/components/MaquinasPage";
import UsuariosPage from "@/components/UsuariosPage";

const SECTION_TITLES: Record<string, string> = {
  home: "Home",
  machines: "Máquinas",
  qualidade: "Controle de Qualidade",
  relatorios: "Relatórios",
  registros: "Registros",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  ajuda: "Ajuda",
};

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [activeSection, setActiveSection] = useState(
    () => typeof window !== "undefined" ? localStorage.getItem("logp_section") || "home" : "home"
  );

  const handleSectionSelect = (section: string) => {
    localStorage.setItem("logp_section", section);
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomePage />;
      case "machines":
        return <MaquinasPage />;
      case "qualidade":
        return <QualidadePage />;
      case "usuarios":
        return <UsuariosPage />;
      case "relatorios":
        return <RelatoriosPage />;
      case "registros":
        return <RegistrosPage />;
      case "configuracoes":
        return <ConfiguracoesPage />;
      case "ajuda":
        return <AjudaPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeSection={activeSection}
          onSectionSelect={handleSectionSelect}
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
