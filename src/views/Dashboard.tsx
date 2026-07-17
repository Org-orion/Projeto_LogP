"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NavigationProvider, useNavigation } from "@/context/navigation-context";
import { WorkspaceProvider } from "@/context/workspace-context";
import { getAllowedSections } from "@/lib/nav-items";

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

function DashboardShell({ user, isAdmin, onLogout }: { user: UsuarioLogado; isAdmin: boolean; onLogout: () => void }) {
  const { setSection } = useNavigation();
  const allowedSections = getAllowedSections(user);

  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <AppSidebar user={user} allowedSections={allowedSections} onLogout={onLogout} />
      <SidebarInset className="flex flex-col overflow-hidden">
        <WorkspaceTabs
          onNavigateNC={() => setSection("qualidade", "nao-conformidades")}
          onNavigateNF={() => setSection("material-fsc")}
        />
        <main className="flex-1 overflow-auto">
          <DashboardContent user={user} isAdmin={isAdmin} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const isAdmin = user.perfil?.toLowerCase() === "administrador";
  const allowedSections = getAllowedSections(user);

  const initialSection = (() => {
    if (typeof window === "undefined") return "home";
    const stored = localStorage.getItem("logp_section") || "home";
    return allowedSections.includes(stored) ? stored : allowedSections[0] || "home";
  })();

  return (
    <NavigationProvider initialSection={initialSection}>
      <WorkspaceProvider>
        <DashboardShell user={user} isAdmin={isAdmin} onLogout={onLogout} />
      </WorkspaceProvider>
    </NavigationProvider>
  );
};

export default Dashboard;
