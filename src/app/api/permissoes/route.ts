import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/permissoes — catálogo completo de módulo×ação (somente leitura;
// gerenciar o catálogo em si é fora de escopo desta fase, ver plano).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("permissoes")
    .select("*")
    .order("modulo")
    .order("acao");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
