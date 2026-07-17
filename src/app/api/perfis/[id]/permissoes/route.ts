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

// GET /api/perfis/[id]/permissoes — ids das permissões atribuídas a este perfil
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("perfil_permissoes").select("permissao_id").eq("perfil_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: (data ?? []).map((r) => r.permissao_id) });
}

// PUT /api/perfis/[id]/permissoes — substitui o conjunto de permissões do perfil
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const permissaoIds: number[] = Array.isArray(body?.permissaoIds) ? body.permissaoIds : [];

  const { data: perfil } = await supabaseAdmin.from("perfis").select("nome").eq("id", id).single();
  if (!perfil) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const { error: delError } = await supabaseAdmin.from("perfil_permissoes").delete().eq("perfil_id", id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  if (permissaoIds.length > 0) {
    const { error: insError } = await supabaseAdmin
      .from("perfil_permissoes")
      .insert(permissaoIds.map((permissaoId) => ({ perfil_id: Number(id), permissao_id: permissaoId })));
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
  }

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "alterar_permissoes", modulo: "administracao",
    entidade: `perfil:${id}`, descricao: `Permissões do perfil "${perfil.nome}" atualizadas (${permissaoIds.length} permissões).`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ ok: true });
}
