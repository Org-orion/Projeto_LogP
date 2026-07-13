"use client";

import { useState, lazy, Suspense } from "react";
import { X } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SpinnerCustom } from "@/components/ui/spinner";

const HomePage                = lazy(() => import("@/components/HomePage"));
const MaquinasPage            = lazy(() => import("@/components/MaquinasPage"));
const RastreabilidadePage     = lazy(() => import("@/components/RastreabilidadePage"));
const PedidosPage             = lazy(() => import("@/components/PedidosPage"));
const MetasPage               = lazy(() => import("@/components/MetasPage"));
const QualidadePage           = lazy(() => import("@/components/QualidadePage"));
const MaterialCertificadoPage = lazy(() => import("@/components/MaterialCertificadoPage"));
const AuditoriasPage          = lazy(() => import("@/components/AuditoriasPage"));
const UsuariosPage            = lazy(() => import("@/components/UsuariosPage"));
const ConfiguracoesPage       = lazy(() => import("@/components/ConfiguracoesPage"));
const RelatoriosPage          = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.RelatoriosPage })));
const RegistrosPage           = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.RegistrosPage })));
const AjudaPage               = lazy(() => import("@/components/PlaceholderPages").then(m => ({ default: m.AjudaPage })));
const UsoeConsumoPage         = lazy(() => import("@/components/UsoeConsumoPage"));
const LeituraProducaoPage     = lazy(() => import("@/components/LeituraProducaoPage"));

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>;
}

const ALL_SECTIONS = [
  "home", "machines", "rastreabilidade", "consumo", "pedidos", "metas", "leituras", "qualidade",
  "material-fsc", "auditorias", "relatorios", "registros", "usuarios", "configuracoes", "ajuda",
];

const SECTION_LABELS: Record<string, string> = {
  home: "Home",
  machines: "Produção",
  rastreabilidade: "Rastreabilidade",
  consumo: "Uso e Consumo",
  pedidos: "Pedidos",
  metas: "Metas",
  leituras: "Monitoramento",
  qualidade: "Controle de Qualidade",
  "material-fsc": "Material FSC",
  auditorias: "Auditorias",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  relatorios: "Relatórios",
  registros: "Registros",
  ajuda: "Ajuda",
};

interface Tab { id: string; label: string; }

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

// ── TabBar ────────────────────────────────────────────────────────────────────
function TabBar({
  tabs, activeTabId, onActivate, onClose,
}: {
  tabs: Tab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", gap: 2,
      padding: "0 16px",
      background: "linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, color-mix(in srgb, hsl(var(--sidebar-background)) 85%, black) 100%)",
      borderBottom: "1px solid hsl(var(--border))",
      overflowX: "auto", scrollbarWidth: "none",
      minHeight: 36, flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onActivate(tab.id)}
            className="tab-strip-item"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px 5px 13px",
              borderRadius: "6px 6px 0 0",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? "hsl(var(--foreground))" : "rgba(255,255,255,0.5)",
              background: active ? "hsl(var(--background))" : "transparent",
              borderTop: `2px solid ${active ? "#5dc287" : "transparent"}`,
              borderLeft: `1px solid ${active ? "hsl(var(--border))" : "transparent"}`,
              borderRight: `1px solid ${active ? "hsl(var(--border))" : "transparent"}`,
              borderBottom: active ? "1px solid hsl(var(--background))" : "1px solid transparent",
              flexShrink: 0,
              userSelect: "none",
              transition: "background .15s, color .15s",
              position: "relative", top: 1,
              maxWidth: 180,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {tab.label}
            </span>
            {tabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                className="tab-close-btn"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: 3,
                  border: "none", background: "none",
                  cursor: "pointer", color: "inherit",
                  opacity: 0.45, padding: 0, flexShrink: 0,
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
      <style>{`
        .tab-strip-item:hover { background: rgba(255,255,255,0.09) !important; color: rgba(255,255,255,0.85) !important; }
        .tab-close-btn:hover  { opacity: 1 !important; background: rgba(255,255,255,0.18) !important; }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = ({ user, onLogout }: { user: UsuarioLogado; onLogout: () => void }) => {
  const isAdmin = user.perfil?.toLowerCase() === "administrador";
  const allowedSections = isAdmin ? ALL_SECTIONS : (user.paginas ?? ["home"]);

  const initialId = (() => {
    if (typeof window === "undefined") return "home";
    const stored = localStorage.getItem("logp_section") || "home";
    return allowedSections.includes(stored) ? stored : "home";
  })();

  const [tabs, setTabs] = useState<Tab[]>([
    { id: initialId, label: SECTION_LABELS[initialId] || "Home" },
  ]);
  const [activeTabId, setActiveTabId] = useState(initialId);
  const [qualidadeSubSection, setQualidadeSubSection] = useState("gramatura");

  function openTab(id: string) {
    localStorage.setItem("logp_section", id);
    setTabs(prev => {
      if (prev.find(t => t.id === id)) return prev;
      return [...prev, { id, label: SECTION_LABELS[id] || id }];
    });
    setActiveTabId(id);
  }

  function closeTab(id: string) {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveTabId(newActive.id);
        localStorage.setItem("logp_section", newActive.id);
      }
      return next;
    });
  }

  function handleQualidadeSubSelect(sub: string) {
    setQualidadeSubSection(sub);
  }

  function handleNavigateNC() {
    openTab("qualidade");
    setQualidadeSubSection("nao-conformidades");
  }

  function handleNavigateNF() {
    openTab("material-fsc");
  }

  function renderSection(id: string) {
    switch (id) {
      case "home":             return <HomePage userName={user.nome} />;
      case "machines":         return <MaquinasPage user={user} />;
      case "rastreabilidade":  return <RastreabilidadePage />;
      case "pedidos":          return <PedidosPage />;
      case "consumo":          return <UsoeConsumoPage />;
      case "metas":            return <MetasPage />;
      case "leituras":         return <LeituraProducaoPage />;
      case "qualidade":        return <QualidadePage subSection={qualidadeSubSection} />;
      case "material-fsc":     return <MaterialCertificadoPage />;
      case "auditorias":       return <AuditoriasPage isAdmin={isAdmin} />;
      case "usuarios":         return <UsuariosPage isAdmin={isAdmin} />;
      case "relatorios":       return <RelatoriosPage />;
      case "registros":        return <RegistrosPage />;
      case "configuracoes":    return <ConfiguracoesPage />;
      case "ajuda":            return <AjudaPage />;
      default:                 return <HomePage userName={user.nome} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <TopNav
        activeSection={activeTabId}
        onSectionSelect={openTab}
        allowedSections={allowedSections}
        qualidadeSubSection={qualidadeSubSection}
        onQualidadeSubSelect={handleQualidadeSubSelect}
        user={user}
        onLogout={onLogout}
        onNavigateNC={handleNavigateNC}
        onNavigateNF={handleNavigateNF}
      />

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onActivate={id => { setActiveTabId(id); localStorage.setItem("logp_section", id); }}
        onClose={closeTab}
      />

      <main className="flex-1 overflow-auto">
        {tabs.map(tab => (
          <div key={tab.id} className={tab.id === activeTabId ? "" : "hidden"}>
            <Suspense fallback={<PageLoader />}>
              {tab.id === "home" ? (
                renderSection(tab.id)
              ) : (
                <div className="p-6">{renderSection(tab.id)}</div>
              )}
            </Suspense>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Dashboard;
