"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { RelatoriosPage, RegistrosPage, AjudaPage } from "@/components/PlaceholderPages";
import ConfiguracoesPage from "@/components/ConfiguracoesPage";
import QualidadePage from "@/components/QualidadePage";
import HomePage from "@/components/HomePage";
import MaquinasPage from "@/components/MaquinasPage";
import UsuariosPage from "@/components/UsuariosPage";
import RastreabilidadePage from "@/components/RastreabilidadePage";
import MaterialCertificadoPage from "@/components/MaterialCertificadoPage";

const ALL_SECTIONS = [
  "home", "machines", "rastreabilidade", "qualidade",
  "material-fsc", "relatorios", "registros", "usuarios",
  "configuracoes", "ajuda",
];

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

interface DashboardProps {
  user: UsuarioLogado;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const isAdmin = user.perfil?.toLowerCase() === "administrador";
  const allowedSections = isAdmin ? ALL_SECTIONS : (user.paginas ?? ["home"]);

  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === "undefined") return "home";
    const stored = localStorage.getItem("logp_section") || "home";
    return allowedSections.includes(stored) ? stored : allowedSections[0] || "home";
  });

  const [qualidadeSubSection, setQualidadeSubSection] = useState("gramatura");

  function handleSectionSelect(section: string) {
    localStorage.setItem("logp_section", section);
    setActiveSection(section);
  }

  function handleQualidadeSubSelect(sub: string) {
    setQualidadeSubSection(sub);
  }

  function renderContent() {
    switch (activeSection) {
      case "home":          return <HomePage userName={user.nome} />;
      case "machines":      return <MaquinasPage />;
      case "rastreabilidade": return <RastreabilidadePage />;
      case "qualidade":     return <QualidadePage subSection={qualidadeSubSection} />;
      case "material-fsc":  return <MaterialCertificadoPage />;
      case "usuarios":      return <UsuariosPage isAdmin={isAdmin} />;
      case "relatorios":    return <RelatoriosPage />;
      case "registros":     return <RegistrosPage />;
      case "configuracoes": return <ConfiguracoesPage />;
      case "ajuda":         return <AjudaPage />;
      default:              return <HomePage userName={user.nome} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <TopNav
        activeSection={activeSection}
        onSectionSelect={handleSectionSelect}
        allowedSections={allowedSections}
        qualidadeSubSection={qualidadeSubSection}
        onQualidadeSubSelect={handleQualidadeSubSelect}
        user={user}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-auto">
        {activeSection === "home" ? (
          renderContent()
        ) : (
          <div className="p-6">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
