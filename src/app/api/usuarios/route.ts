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

// GET /api/usuarios — lista sem campo senha (somente admins)
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, perfil, paginas")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/usuarios — cria usuário com senha hasheada (somente admins)
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const { nome, email, senha, perfil, paginas } = body ?? {};

  if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios." }, { status: 400 });
  }
  if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const hash = await bcrypt.hash(senha.trim(), 12);

  const { error } = await supabaseAdmin.from("usuarios").insert({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    senha: hash,
    perfil,
    paginas,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
