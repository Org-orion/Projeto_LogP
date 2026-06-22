import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

const PERFIS_VALIDOS = ["Administrador", "Supervisor", "Operador", "Visualizador"];

async function requireAdmin() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil?.toLowerCase() !== "administrador")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  return null;
}

// PUT /api/usuarios/[id] — atualiza; só re-hasha senha se uma nova for enviada
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!id || id === "undefined" || id === "null" || id === "NaN") {
    return NextResponse.json({ error: `ID inválido: '${id}'` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { nome, email, senha, perfil, paginas } = body ?? {};

  if (!nome?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Nome e email são obrigatórios." }, { status: 400 });
  }
  if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    perfil,
    paginas,
  };

  if (senha?.trim()) {
    payload.senha = await bcrypt.hash(senha.trim(), 12);
  }

  const { error } = await supabaseAdmin.from("usuarios").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/usuarios/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!id || id === "undefined" || id === "null" || id === "NaN") {
    return NextResponse.json({ error: `ID inválido: '${id}'` }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("usuarios").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
