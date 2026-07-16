import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { registrarAuditoria, extrairIp, extrairUserAgent } from "@/lib/audit";

// POST /api/auth/trocar-senha — troca a própria senha (fluxo de primeiro
// acesso pós-migração ou depois de "forçar logout" administrativo). Como
// trocar a senha via Admin API já derruba a sessão atual, o front-end deve
// mandar o usuário pro login de novo depois de um 200 aqui.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const novaSenha: string = body?.novaSenha ?? "";
  if (novaSenha.trim().length < 8) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, auth_user_id")
    .eq("id", session.id)
    .single();
  if (!usuario?.auth_user_id) return NextResponse.json({ error: "Usuário sem conta Supabase Auth vinculada." }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.auth_user_id, { password: novaSenha.trim() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("usuarios").update({ deve_trocar_senha: false }).eq("id", usuario.id);

  await registrarAuditoria({
    usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "redefinir_senha", modulo: "autenticacao",
    descricao: `${usuario.nome} definiu uma nova senha.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
