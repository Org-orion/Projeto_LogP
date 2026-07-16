import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { registrarAuditoria, extrairIp, extrairUserAgent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  if (session) {
    await registrarAuditoria({
      usuarioId: session.id, usuarioNome: session.nome, acao: "logout", modulo: "autenticacao",
      descricao: `${session.nome} saiu do sistema.`,
      ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
    });
  }

  return NextResponse.json({ ok: true });
}
