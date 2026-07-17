import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// RBAC real (perfis → permissoes → usuário), aplicado só dentro do módulo
// Administração — o resto do app continua com suas checagens de perfil de
// sempre, intocadas. Ver plano em
// C:\Users\PC101\.claude\plans\snuggly-sleeping-pelican.md

function chave(modulo: string, acao: string) {
  return `${modulo}:${acao}`;
}

// Resolve o conjunto efetivo de permissões de um usuário: as do perfil dele,
// mais exceções individuais concedidas, menos as revogadas.
export async function getPermissoesDoUsuario(usuarioId: string): Promise<Set<string>> {
  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("perfil")
    .eq("id", usuarioId)
    .single();

  const permissoes = new Set<string>();
  if (!usuario?.perfil) return permissoes;

  const { data: perfil } = await supabaseAdmin
    .from("perfis")
    .select("id")
    .eq("nome", usuario.perfil)
    .maybeSingle();

  if (perfil) {
    const { data: perfilPermissoes } = await supabaseAdmin
      .from("perfil_permissoes")
      .select("permissoes(modulo, acao)")
      .eq("perfil_id", perfil.id);

    for (const row of perfilPermissoes ?? []) {
      const p = row.permissoes as unknown as { modulo: string; acao: string } | null;
      if (p) permissoes.add(chave(p.modulo, p.acao));
    }
  }

  const { data: excecoes } = await supabaseAdmin
    .from("usuario_permissoes_excecao")
    .select("tipo, permissoes(modulo, acao)")
    .eq("usuario_id", usuarioId);

  for (const row of excecoes ?? []) {
    const p = row.permissoes as unknown as { modulo: string; acao: string } | null;
    if (!p) continue;
    if (row.tipo === "conceder") permissoes.add(chave(p.modulo, p.acao));
    else if (row.tipo === "revogar") permissoes.delete(chave(p.modulo, p.acao));
  }

  return permissoes;
}

// Guard server-side pras rotas do módulo Administração. Administrador sempre
// passa (bypass), igual ao requireAdmin() já usado em /api/usuarios — garante
// que quem já é admin hoje não perde acesso independente do que os seeds de
// perfil_permissoes tiverem.
export async function requirePermissao(modulo: string, acao: string) {
  const session = await getSession();
  if (!session) return { denied: NextResponse.json({ error: "Não autenticado." }, { status: 401 }), session: null };

  if (session.perfil?.toLowerCase() === "administrador") {
    return { denied: null, session };
  }

  const permissoes = await getPermissoesDoUsuario(String(session.id));
  if (!permissoes.has(chave(modulo, acao))) {
    return { denied: NextResponse.json({ error: "Você não tem permissão para esta ação." }, { status: 403 }), session };
  }
  return { denied: null, session };
}
