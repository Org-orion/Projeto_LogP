import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllowedSections, hasAnyGroupAccess } from "@/lib/nav-items";
import { RouteShell } from "@/components/RouteShell";

// Mesma guarda de sessão usada em /configuracoes/layout.tsx (getSession(),
// cookie httpOnly assinado) — ver src/lib/session.ts. hasAnyGroupAccess deixa
// entrar quem tem só permissão granular de alguma sub-página de Qualidade,
// sem precisar do id "qualidade" cru.
export default async function QualidadeLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  const allowedSections = getAllowedSections(session);
  if (!hasAnyGroupAccess(session, "qualidade")) redirect("/");

  return (
    <RouteShell user={session} allowedSections={allowedSections}>
      {children}
    </RouteShell>
  );
}
