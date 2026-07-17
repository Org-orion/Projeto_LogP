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

// PUT /api/perfis/[id] — edita nome/descrição/status. O perfil "Administrador"
// não pode ser renomeado (é a âncora do bypass de RBAC em src/lib/rbac.ts).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { nome, descricao, status } = body ?? {};

  const { data: atual } = await supabaseAdmin.from("perfis").select("nome").eq("id", id).single();
  if (!atual) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  if (atual.nome === "Administrador" && nome && nome.trim() !== "Administrador") {
    return NextResponse.json({ error: "O perfil Administrador não pode ser renomeado." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("perfis")
    .update({ nome: nome?.trim() ?? atual.nome, descricao: descricao ?? null, status: status ?? "ativo" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "editar_perfil", modulo: "administracao",
    entidade: `perfil:${id}`, descricao: `Perfil "${atual.nome}" editado.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/perfis/[id] — bloqueado se o perfil ainda tem usuários, ou se é
// o perfil Administrador (âncora do sistema).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data: perfil } = await supabaseAdmin.from("perfis").select("nome").eq("id", id).single();
  if (!perfil) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  if (perfil.nome === "Administrador") {
    return NextResponse.json({ error: "O perfil Administrador não pode ser excluído." }, { status: 400 });
  }

  const { count } = await supabaseAdmin.from("usuarios").select("id", { count: "exact", head: true }).eq("perfil", perfil.nome);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `Este perfil ainda tem ${count} usuário(s) vinculado(s). Altere o perfil deles antes de excluir.` }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("perfis").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "excluir_perfil", modulo: "administracao",
    entidade: `perfil:${id}`, descricao: `Perfil "${perfil.nome}" excluído.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
