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

// GET /api/usuarios/[id]/permissoes — exceções individuais (só o que difere
// do perfil do usuário — nunca a lista inteira de permissões).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("usuario_permissoes_excecao")
    .select("id, tipo, permissoes(id, modulo, acao, label)")
    .eq("usuario_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PUT /api/usuarios/[id]/permissoes — substitui as exceções individuais do usuário
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const excecoes: { permissaoId: number; tipo: "conceder" | "revogar" }[] = Array.isArray(body?.excecoes) ? body.excecoes : [];

  const { data: usuario } = await supabaseAdmin.from("usuarios").select("nome").eq("id", id).single();
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { error: delError } = await supabaseAdmin.from("usuario_permissoes_excecao").delete().eq("usuario_id", id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  if (excecoes.length > 0) {
    const { error: insError } = await supabaseAdmin.from("usuario_permissoes_excecao").insert(
      excecoes.map((e) => ({ usuario_id: id, permissao_id: e.permissaoId, tipo: e.tipo })),
    );
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
  }

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "alterar_permissoes", modulo: "administracao",
    entidade: `usuario:${id}`, descricao: `Exceções de permissão de "${usuario.nome}" atualizadas (${excecoes.length} exceções).`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
