import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllowedSections, hasAnyGroupAccess } from "@/lib/nav-items";
import { RouteShell } from "@/components/RouteShell";

// Mesma guarda de sessão usada em /configuracoes e /qualidade — reaproveita o
// mesmo id de seção "usuarios" já existente em paginas/allowedSections, então
// nenhum usuário cadastrado perde ou ganha acesso por causa desta migração.
// hasAnyGroupAccess deixa entrar quem tem só permissão granular de alguma
// sub-página de Administração, sem precisar do id "usuarios" cru.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  const allowedSections = getAllowedSections(session);
  if (!hasAnyGroupAccess(session, "usuarios")) redirect("/");

  return (
    <RouteShell user={session} allowedSections={allowedSections}>
      {children}
    </RouteShell>
  );
}
