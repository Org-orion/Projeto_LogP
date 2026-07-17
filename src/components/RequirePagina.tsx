"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { EmptyState } from "@/components/production/EmptyState";
import { hasPageAccess } from "@/lib/nav-items";

interface RequirePaginaProps {
  /** Id composto "grupo:subId" (ex.: "qualidade:gramatura", "configuracoes:backup"). */
  pagina: string;
  children: ReactNode;
}

// Gate de permissão por página individual — mesmo padrão exato de
// RequirePerfil.tsx (reaproveita /api/auth/me, já que as sub-páginas de
// /qualidade, /admin e /configuracoes são client components e não recebem o
// usuário via prop como o resto da SPA). Ortogonal ao RequirePerfil: aqui é
// "esse usuário tem essa página liberada", lá é "esse usuário tem esse papel".
export function RequirePagina({ pagina, children }: RequirePaginaProps) {
  const [status, setStatus] = useState<"carregando" | "autorizado" | "negado">("carregando");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) { setStatus("negado"); return; }
        const json = await res.json();
        setStatus(hasPageAccess(json.user ?? {}, pagina) ? "autorizado" : "negado");
      })
      .catch(() => !cancelado && setStatus("negado"));
    return () => { cancelado = true; };
  }, [pagina]);

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
