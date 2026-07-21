"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/context/workspace-context";
import { SessionProvider } from "@/context/session-context";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { goToSpaSection } from "@/lib/spa-bridge";
import type { SessionPayload } from "@/lib/session";

interface RouteShellProps {
  user: SessionPayload;
  allowedSections: string[];
  children: ReactNode;
}

// Shell compartilhado por toda área com rota real do Next.js dentro da SPA
// (hoje: /configuracoes/* e /qualidade/*) — mesmo header/sidebar da SPA, sem
// depender do NavigationProvider (que só existe dentro de "/"). Generalizado
// a partir do antigo ConfigShell.tsx pra não duplicar entre as duas áreas.
// A localização/breadcrumb já é dada pela aba ativa na barra de Workspace.
export function RouteShell({ user, allowedSections, children }: RouteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const scrollRef = useScrollRestoration(pathname ?? "/");

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("logp_user");
      localStorage.removeItem("logp_section");
      localStorage.removeItem("logp_workspace_tabs_v1");
      window.location.href = "/";
    }
  }

  return (
    <SessionProvider user={user}>
      <WorkspaceProvider>
        <SidebarProvider className="h-screen overflow-hidden">
          <AppSidebar user={user} allowedSections={allowedSections} onLogout={handleLogout} />
          <SidebarInset className="flex flex-col overflow-hidden">
            <WorkspaceTabs
              onNavigateNC={() => router.push("/qualidade/nao-conformidades")}
              onNavigateNF={() => goToSpaSection(router, "material-fsc")}
            />
            <main ref={scrollRef} className="flex-1 overflow-auto p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceProvider>
    </SessionProvider>
  );
}
