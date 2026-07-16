import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllowedSections, hasAnyGroupAccess } from "@/lib/nav-items";
import { RouteShell } from "@/components/RouteShell";

// Checa a sessão no servidor (mesmo cookie httpOnly assinado usado pelo resto
// do app, ver src/lib/session.ts) antes de montar qualquer coisa.
// hasAnyGroupAccess deixa entrar quem tem só permissão granular de alguma
// sub-página de Configurações, sem precisar do id "configuracoes" cru.
export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  const allowedSections = getAllowedSections(session);
  if (!hasAnyGroupAccess(session, "configuracoes")) redirect("/");

  return (
    <RouteShell user={session} allowedSections={allowedSections}>
      {children}
    </RouteShell>
  );
}
