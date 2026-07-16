"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { EmptyState } from "@/components/production/EmptyState";

interface RequirePerfilProps {
  perfis: string[];
  children: ReactNode;
}

// Gate de permissão por perfil pras páginas mais sensíveis de Configurações —
// reaproveita /api/auth/me (mesma checagem de sessão já usada em src/app/page.tsx),
// já que as páginas de /configuracoes/* são client components e não recebem o
// usuário via prop como o resto da SPA.
export function RequirePerfil({ perfis, children }: RequirePerfilProps) {
  const [status, setStatus] = useState<"carregando" | "autorizado" | "negado">("carregando");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) { setStatus("negado"); return; }
        const json = await res.json();
        const perfilUsuario = (json.user?.perfil ?? "").toLowerCase();
        setStatus(perfis.some((p) => p.toLowerCase() === perfilUsuario) ? "autorizado" : "negado");
      })
      .catch(() => !cancelado && setStatus("negado"));
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "carregando") {
    return <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>;
  }
  if (status === "negado") {
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
