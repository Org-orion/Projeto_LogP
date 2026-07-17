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

async function contarAdministradoresAtivos(excetoId?: string): Promise<number> {
  let query = supabaseAdmin
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("perfil", "Administrador")
    .neq("status", "bloqueado")
    .neq("status", "inativo");
  if (excetoId !== undefined) query = query.neq("id", excetoId);
  const { count } = await query;
  return count ?? 0;
}

// PUT /api/usuarios/[id] — atualiza; só re-hasha senha se uma nova for enviada.
// Guards: não editar a si mesmo pra Administrador sem já ser Administrador;
// não remover/rebaixar/bloquear o último Administrador ativo.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!id || id === "undefined" || id === "null" || id === "NaN") {
    return NextResponse.json({ error: `ID inválido: '${id}'` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { nome, email, senha, perfil, paginas, matricula, cargo, setor, telefone, status, deve_trocar_senha } = body ?? {};

  if (!nome?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Nome e email são obrigatórios." }, { status: 400 });
  }
  if (!(await perfilValido(perfil))) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const { data: atual } = await supabaseAdmin.from("usuarios").select("nome, email, perfil, status, auth_user_id").eq("id", id).single();
  if (!atual) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const ehEuMesmo = String(session!.id) === id;

  if (ehEuMesmo && perfil === "Administrador" && atual.perfil !== "Administrador") {
    return NextResponse.json({ error: "Você não pode alterar o próprio perfil para Administrador." }, { status: 403 });
  }
  if (ehEuMesmo && status && status !== "ativo" && atual.status !== status) {
    return NextResponse.json({ error: "Você não pode bloquear ou desativar a si mesmo." }, { status: 403 });
  }
  if (atual.perfil === "Administrador" && perfil && perfil !== "Administrador") {
    const restantes = await contarAdministradoresAtivos(id);
    if (restantes === 0) {
      return NextResponse.json({ error: "Não é possível remover o último Administrador ativo." }, { status: 400 });
    }
  }
  if (atual.perfil === "Administrador" && status && status !== "ativo" && atual.status === "ativo") {
    const restantes = await contarAdministradoresAtivos(id);
    if (restantes === 0) {
      return NextResponse.json({ error: "Não é possível bloquear o último Administrador ativo." }, { status: 400 });
    }
  }

  const payload: Record<string, unknown> = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    perfil,
    paginas,
    matricula: matricula?.trim() || null,
    cargo: cargo?.trim() || null,
    setor: setor?.trim() || null,
    telefone: telefone?.trim() || null,
  };

  if (status !== undefined) {
    payload.status = status;
    if (status === "bloqueado" && atual.status !== "bloqueado") {
      payload.bloqueado_em = new Date().toISOString();
      payload.bloqueado_por = session!.nome;
    }
    if (status !== "bloqueado") {
      payload.bloqueado_em = null;
      payload.bloqueado_por = null;
    }
  }
  if (deve_trocar_senha !== undefined) payload.deve_trocar_senha = !!deve_trocar_senha;

  let acaoAuditoria: "editar_usuario" | "bloquear_usuario" | "desbloquear_usuario" | "alterar_perfil" | "redefinir_senha" = "editar_usuario";
  let descricao = `Usuário "${atual.nome}" editado.`;

  // E-mail e senha vivem no Supabase Auth agora, não em `usuarios` — mantém
  // os dois sincronizados quando o admin edita qualquer um dos dois.
  if (atual.auth_user_id) {
    const authUpdates: { email?: string; password?: string } = {};
    if (email.trim().toLowerCase() !== atual.email) authUpdates.email = email.trim().toLowerCase();
    if (senha?.trim()) authUpdates.password = senha.trim();

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(atual.auth_user_id, authUpdates);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  }

  if (senha?.trim()) {
    acaoAuditoria = "redefinir_senha";
    descricao = `Senha de "${atual.nome}" redefinida.`;
  } else if (status === "bloqueado" && atual.status !== "bloqueado") {
    acaoAuditoria = "bloquear_usuario";
    descricao = `Usuário "${atual.nome}" bloqueado.`;
  } else if (status && status !== "bloqueado" && atual.status === "bloqueado") {
    acaoAuditoria = "desbloquear_usuario";
    descricao = `Usuário "${atual.nome}" desbloqueado.`;
  } else if (perfil && perfil !== atual.perfil) {
    acaoAuditoria = "alterar_perfil";
    descricao = `Perfil de "${atual.nome}" alterado de "${atual.perfil}" para "${perfil}".`;
  }

  const { error } = await supabaseAdmin.from("usuarios").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: acaoAuditoria, modulo: "administracao",
    entidade: `usuario:${id}`, descricao,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/usuarios/[id] — guards: não excluir a si mesmo; não remover o
// último Administrador ativo.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!id || id === "undefined" || id === "null" || id === "NaN") {
    return NextResponse.json({ error: `ID inválido: '${id}'` }, { status: 400 });
  }

  if (String(session!.id) === id) {
    return NextResponse.json({ error: "Você não pode excluir a si mesmo." }, { status: 403 });
  }

  const { data: alvo } = await supabaseAdmin.from("usuarios").select("nome, perfil, status, auth_user_id").eq("id", id).single();
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (alvo.perfil === "Administrador" && alvo.status !== "bloqueado" && alvo.status !== "inativo") {
    const restantes = await contarAdministradoresAtivos(id);
    if (restantes === 0) {
      return NextResponse.json({ error: "Não é possível excluir o último Administrador ativo." }, { status: 400 });
    }
  }

  const { error } = await supabaseAdmin.from("usuarios").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (alvo.auth_user_id) await supabaseAdmin.auth.admin.deleteUser(alvo.auth_user_id);

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "excluir_usuario", modulo: "administracao",
    entidade: `usuario:${id}`, descricao: `Usuário "${alvo.nome}" excluído.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
