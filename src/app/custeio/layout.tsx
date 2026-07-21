import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllowedSections, hasAnyGroupAccess } from "@/lib/nav-items";
import { RouteShell } from "@/components/RouteShell";

// Mesma guarda de sessão usada em /rastreabilidade/layout.tsx. hasAnyGroupAccess
// deixa entrar quem tem só permissão granular de alguma sub-página de Custeio,
// sem precisar do id "custeio" cru.
export default async function CusteioLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  const allowedSections = getAllowedSections(session);
  if (!hasAnyGroupAccess(session, "custeio")) redirect("/");

  return (
    <RouteShell user={session} allowedSections={allowedSections}>
      {children}
    </RouteShell>
  );
}
