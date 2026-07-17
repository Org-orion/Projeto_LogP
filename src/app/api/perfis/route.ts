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

// GET /api/perfis — lista perfis com contagem real de usuários por perfil
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const [{ data: perfis, error }, { data: usuarios }] = await Promise.all([
    supabaseAdmin.from("perfis").select("*").order("nome"),
    supabaseAdmin.from("usuarios").select("perfil"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contagem = new Map<string, number>();
  for (const u of usuarios ?? []) {
    if (!u.perfil) continue;
    contagem.set(u.perfil, (contagem.get(u.perfil) ?? 0) + 1);
  }

  const data = (perfis ?? []).map((p) => ({ ...p, qtd_usuarios: contagem.get(p.nome) ?? 0 }));
  return NextResponse.json({ data });
}

// POST /api/perfis — cria novo perfil (somente admin)
export async function POST(req: NextRequest) {
  const { denied, session } = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const { nome, descricao, status } = body ?? {};
  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome do perfil é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("perfis")
    .insert({ nome: nome.trim(), descricao: descricao ?? null, status: status ?? "ativo", responsavel: session!.nome })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await registrarAuditoria({
    usuarioId: session!.id, usuarioNome: session!.nome, acao: "criar_perfil", modulo: "administracao",
    entidade: `perfil:${data.id}`, descricao: `Perfil "${nome.trim()}" criado.`,
    ip: extrairIp(req), userAgent: extrairUserAgent(req), resultado: "sucesso",
  });

  return NextResponse.json({ data }, { status: 201 });
}
