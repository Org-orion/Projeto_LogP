import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasPageAccess } from "@/lib/nav-items";
import { carregarDadosReferencia } from "@/lib/custeio-motor/repositorio";
import { calcularKitCompleto } from "@/lib/custeio-motor/motor";
import type { ConfiguracaoCusteio } from "@/lib/custeio-motor/types";

// POST /api/custeio/calcular — motor de custeio roda aqui (server-side), não
// no browser, pra não expor a lógica de negócio (fórmulas/coeficientes) no
// bundle JS do cliente.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!hasPageAccess(session, "custeio:dashboard")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const config = await req.json().catch(() => null) as ConfiguracaoCusteio | null;
  if (!config) return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });

  try {
    const dados = await carregarDadosReferencia();
    const resultado = calcularKitCompleto(config, dados);
    return NextResponse.json({ data: resultado });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido ao calcular custeio.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
