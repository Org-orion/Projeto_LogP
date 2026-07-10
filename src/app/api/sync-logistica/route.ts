import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PAGE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTudo(origem: any, tabela: string, select = "*") {
  const rows: Record<string, unknown>[] = [];
  let pagina = 0;
  while (true) {
    const { data, error } = await origem
      .from(tabela)
      .select(select)
      .order("id", { ascending: true })
      .range(pagina * PAGE, (pagina + 1) * PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    pagina++;
  }
  return rows;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Inicializa clientes dentro do handler — variáveis só existem em runtime
  const origem = createClient(
    process.env.LOGISTICA_SUPABASE_URL!,
    process.env.LOGISTICA_SUPABASE_KEY!
  );
  const destino = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const [rowsProg, rowsEntr] = await Promise.all([
      fetchTudo(origem, "concrem_programacoes_embarque"),
      fetchTudo(origem, "concrem_entregas"),
    ]);

    const now = new Date().toISOString();

    const erros: string[] = [];

    if (rowsProg.length > 0) {
      const { error } = await destino
        .from("ext_programacoes_embarque")
        .upsert(rowsProg.map((r) => ({ ...r, synced_at: now })), { onConflict: "id" });
      if (error) erros.push(`programacoes: ${error.message}`);
    }

    if (rowsEntr.length > 0) {
      const { error } = await destino
        .from("ext_entregas")
        .upsert(rowsEntr.map((r) => ({ ...r, synced_at: now })), { onConflict: "id" });
      if (error) erros.push(`entregas: ${error.message}`);
    }

    if (erros.length > 0) throw new Error(erros.join("; "));

    await destino.from("ext_sync_state").upsert(
      [
        { tabela: "programacoes_embarque", ultimo_sync: now, total_registros: rowsProg.length, atualizado_em: now },
        { tabela: "entregas",              ultimo_sync: now, total_registros: rowsEntr.length, atualizado_em: now },
      ],
      { onConflict: "tabela" }
    );

    return NextResponse.json({
      ok: true,
      programacoes: rowsProg.length,
      entregas: rowsEntr.length,
      synced_at: now,
    });
  } catch (err) {
    console.error("[sync-logistica]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
