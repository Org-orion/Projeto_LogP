import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Banco de origem (logística externa)
const origem = createClient(
  process.env.LOGISTICA_SUPABASE_URL!,
  process.env.LOGISTICA_SUPABASE_KEY!
);

const destino = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAGE = 1000;

async function fetchTudo(tabela: string, select = "*") {
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

async function syncProgramacoes(): Promise<number> {
  const rows = await fetchTudo("concrem_programacoes_embarque");
  if (rows.length === 0) return 0;

  const now = new Date().toISOString();
  const payload = rows.map((r) => ({ ...r, synced_at: now }));

  const { error } = await destino
    .from("ext_programacoes_embarque")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(`programacoes upsert: ${error.message}`);
  return rows.length;
}

async function syncEntregas(): Promise<number> {
  const rows = await fetchTudo("concrem_entregas");
  if (rows.length === 0) return 0;

  const now = new Date().toISOString();
  const payload = rows.map((r) => ({ ...r, synced_at: now }));

  const { error } = await destino
    .from("ext_entregas")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(`entregas upsert: ${error.message}`);
  return rows.length;
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

  try {
    const [totalProg, totalEntr] = await Promise.all([
      syncProgramacoes(),
      syncEntregas(),
    ]);

    const now = new Date().toISOString();
    await destino.from("ext_sync_state").upsert(
      [
        { tabela: "programacoes_embarque", ultimo_sync: now, total_registros: totalProg, atualizado_em: now },
        { tabela: "entregas",              ultimo_sync: now, total_registros: totalEntr, atualizado_em: now },
      ],
      { onConflict: "tabela" }
    );

    return NextResponse.json({
      ok: true,
      programacoes: totalProg,
      entregas: totalEntr,
      synced_at: now,
    });
  } catch (err) {
    console.error("[sync-logistica]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
