"use client";

import { useState, lazy, Suspense } from "react";
import { TopNav } from "@/components/TopNav";
import { SpinnerCustom } from "@/components/ui/spinner";

const HomePage              = lazy(() => import("@/components/HomePage"));
const MaquinasPage          = lazy(() => import("@/components/MaquinasPage"));
const RastreabilidadePage   = lazy(() => import("@/components/RastreabilidadePage"));
const PedidosPage           = lazy(() => import("@/components/PedidosPage"));
const MetasPage             = lazy(() => import("@/components/MetasPage"));
const QualidadePage         = lazy(() => import("@/components/QualidadePage"));
const MaterialCertificadoPage = lazy(() => import("@/components/MaterialCertificadoPage"));
const AuditoriasPage        = lazy(() => import("@/components/AuditoriasPage"));
const UsuariosPage          = lazy(() => import("@/components/UsuariosPage"));
const ConfiguracoesPage     = lazy(() => import("@/components/ConfiguracoesPage"));
const RelatoriosPage        = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.RelatoriosPage })));
const RegistrosPage         = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.RegistrosPage })));
const AjudaPage             = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.AjudaPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
  );
}

const ALL_SECTIONS = [
  "home", "machines", "rastreabilidade", "pedidos", "metas", "qualidade",
  "material-fsc", "auditorias", "relatorios", "registros", "usuarios",
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

  function handleNavigateNC() {
    handleSectionSelect("qualidade");
    setQualidadeSubSection("nao-conformidades");
  }

  function handleNavigateNF() {
    handleSectionSelect("material-fsc");
  }

  function renderContent() {
    switch (activeSection) {
      case "home":          return <HomePage userName={user.nome} />;
      case "machines":      return <MaquinasPage user={user} />;
      case "rastreabilidade": return <RastreabilidadePage />;
      case "pedidos":         return <PedidosPage />;
      case "metas":           return <MetasPage />;
      case "qualidade":     return <QualidadePage subSection={qualidadeSubSection} />;
      case "material-fsc":  return <MaterialCertificadoPage />;
      case "auditorias":    return <AuditoriasPage isAdmin={isAdmin} />;
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
        onNavigateNC={handleNavigateNC}
        onNavigateNF={handleNavigateNF}
      />
      <main key={activeSection} className="flex-1 overflow-auto page-fade">
        <Suspense fallback={<PageLoader />}>
          {activeSection === "home" ? (
            renderContent()
          ) : (
            <div className="p-6">
              {renderContent()}
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default Dashboard;
