import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil?.toLowerCase() !== "administrador")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  return null;
}

// GET /api/audit?usuario=&modulo=&acao=&resultado=&de=&ate= — somente leitura
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  let query = supabaseAdmin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);

  const usuario = params.get("usuario");
  const usuarioId = params.get("usuarioId");
  const modulo = params.get("modulo");
  const acao = params.get("acao");
  const resultado = params.get("resultado");
  const de = params.get("de");
  const ate = params.get("ate");

  if (usuarioId) query = query.eq("usuario_id", usuarioId);
  else if (usuario) query = query.ilike("usuario_nome", `%${usuario}%`);
  if (modulo) query = query.eq("modulo", modulo);
  if (acao) query = query.eq("acao", acao);
  if (resultado) query = query.eq("resultado", resultado);
  if (de) query = query.gte("created_at", de);
  if (ate) query = query.lte("created_at", ate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
