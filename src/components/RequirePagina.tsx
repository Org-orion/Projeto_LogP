"use client";

import { type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/production/EmptyState";
import { hasPageAccess } from "@/lib/nav-items";
import { useSessionUser } from "@/context/session-context";

interface RequirePaginaProps {
  /** Id composto "grupo:subId" (ex.: "qualidade:gramatura", "configuracoes:backup"). */
  pagina: string;
  children: ReactNode;
}

// Gate de permissão por página individual — a sessão já foi validada no
// servidor pelo layout.tsx (RouteShell -> SessionProvider), então só lemos
// do contexto em vez de rebater em /api/auth/me a cada montagem (isso
// dobrava/triplicava a checagem de auth em cada navegação — via middleware,
// via getSession() do layout e via esse fetch client-side). Ortogonal ao
// RequirePerfil: aqui é "esse usuário tem essa página liberada", lá é "esse
// usuário tem esse papel".
export function RequirePagina({ pagina, children }: RequirePaginaProps) {
  const user = useSessionUser();

  if (!user || !hasPageAccess(user, pagina)) {
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
