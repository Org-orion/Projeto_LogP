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

async function perfilValido(perfil: string | undefined): Promise<boolean> {
  if (!perfil) return true;
  const { data } = await supabaseAdmin.from("perfis").select("nome").eq("nome", perfil).maybeSingle();
  return !!data;
}

// GET /api/usuarios — lista (somente admins)
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, perfil, paginas, matricula, cargo, setor, telefone, status, ultimo_login, ultimo_ip, deve_trocar_senha")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/usuarios — cria usuário no Supabase Auth + perfil em `usuarios`
// (somente admins). `senha` vira a senha inicial no Supabase Auth, não é
// mais hasheada manualmente aqui.
export async function POST(req: NextRequest) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const { nome, email, senha, perfil, paginas, matricula, cargo, setor, telefone, status, deve_trocar_senha } = body ?? {};

  if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios." }, { status: 400 });
  }
  if (!(await perfilValido(perfil))) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const emailNormalizado = email.trim().toLowerCase();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: emailNormalizado, password: senha.trim(), email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? "Erro ao criar usuário no Supabase Auth." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin.from("usuarios").insert({
    nome: nome.trim(),
    email: emailNormalizado,
    auth_user_id: authUser.user.id,
    perfil,
    paginas,
    matricula: matricula?.trim() || null,
    cargo: cargo?.trim() || null,
    setor: setor?.trim() || null,
    telefone: telefone?.trim() || null,
    status: status ?? "ativo",
    deve_trocar_senha: !!deve_trocar_senha,
  }).select("id").single();

  if (error) {
    // Reverte o usuário do Supabase Auth pra não deixar uma conta órfã sem perfil
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "criar_usuario", modulo: "administracao",
    entidade: `usuario:${data.id}`, descricao: `Usuário "${nome.trim()}" (${emailNormalizado}) criado.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
