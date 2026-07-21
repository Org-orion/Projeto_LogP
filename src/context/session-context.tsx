"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";

// A sessão já foi resolvida no servidor (layout.tsx chamou getSession(), que
// valida o token contra a Supabase e busca o perfil em `usuarios`) e passada
// pra RouteShell como prop — aqui só a deixamos disponível via contexto pra
// componentes client (RequirePagina, RequirePerfil etc.) não precisarem
// refazer essa mesma checagem batendo em /api/auth/me a cada montagem.
const SessionContext = createContext<SessionPayload | null>(null);

export function SessionProvider({ user, children }: { user: SessionPayload; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** Usuário da sessão atual — null só se chamado fora de um RouteShell. */
export function useSessionUser(): SessionPayload | null {
  return useContext(SessionContext);
}
