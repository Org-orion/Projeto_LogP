"use client";

import { type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/production/EmptyState";
import { useSessionUser } from "@/context/session-context";

interface RequirePerfilProps {
  perfis: string[];
  children: ReactNode;
}

// Gate de permissão por perfil pras páginas mais sensíveis de Configurações —
// lê do SessionProvider (sessão já validada no servidor pelo layout.tsx) em
// vez de rebater em /api/auth/me a cada montagem.
export function RequirePerfil({ perfis, children }: RequirePerfilProps) {
  const user = useSessionUser();
  const perfilUsuario = (user?.perfil ?? "").toLowerCase();
  const autorizado = perfis.some((p) => p.toLowerCase() === perfilUsuario);

  if (!user || !autorizado) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sem permissão"
        description="Você não tem permissão para acessar esta página. Fale com um administrador se acha que isso é um engano."
      />
    );
  }
  return <>{children}</>;
}
