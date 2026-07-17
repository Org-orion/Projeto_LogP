import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { registrarAuditoria, extrairIp, extrairUserAgent } from "@/lib/audit";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { denied: NextResponse.json({ error: "Não autenticado." }, { status: 401 }), session: null };
  if (session.perfil?.toLowerCase() !== "administrador")
    return { denied: NextResponse.json({ error: "Acesso negado." }, { status: 403 }), session };
  return { denied: null, session };
}

// POST /api/usuarios/[id]/forcar-logout — derruba todas as sessões do
// usuário em qualquer dispositivo. Não existe API pública da Supabase pra
// revogar uma sessão específica de outro usuário, mas trocar a senha via
// Admin API já invalida todas as sessões ativas dele (comportamento oficial
// desde a v2.149 do supabase/auth) — é o caminho suportado.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (String(session!.id) === id) {
    return NextResponse.json({ error: "Você não pode forçar logout na própria conta por aqui." }, { status: 403 });
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("nome, auth_user_id")
    .eq("id", id)
    .single();
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (!usuario.auth_user_id) return NextResponse.json({ error: "Usuário ainda não migrado pro Supabase Auth." }, { status: 400 });

  const senhaTemporaria = crypto.randomUUID();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.auth_user_id, { password: senhaTemporaria });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("usuarios").update({ deve_trocar_senha: true }).eq("id", id);

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "revogar_sessao", modulo: "administracao",
    entidade: `usuario:${id}`, descricao: `Logout forçado em todos os dispositivos de "${usuario.nome}" (senha redefinida, troca obrigatória no próximo acesso).`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
