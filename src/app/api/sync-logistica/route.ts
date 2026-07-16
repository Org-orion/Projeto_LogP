import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Banco de origem (logística externa)
const ORIGEM_URL = "https://ctntlgvoefdbjxvfkahp.supabase.co";
const ORIGEM_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bnRsZ3ZvZWZkYmp4dmZrYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTk0MzEsImV4cCI6MjA4OTgzNTQzMX0.e9iq0VH2Z2HEN4vw7QASSOTEcpB_x7Ovqeo6R7CDfdA";

const origem = createClient(ORIGEM_URL, ORIGEM_KEY);

// Preguiçoso — mesma razão do src/lib/supabase-admin.ts: criar o client na
// avaliação do módulo derruba o build inteiro na Vercel se SUPABASE_SERVICE_ROLE_KEY
// não estiver disponível nesse ambiente/fase, mesmo essa rota nunca sendo chamada.
let _destino: SupabaseClient | null = null;
function getDestino(): SupabaseClient {
  if (_destino) return _destino;
  _destino = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return _destino;
}
const destino = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDestino(), prop, receiver);
  },
});

const PAGE = 1000;

async function fetchTudo(tabela: string, select = "*") {
  const rows: Record<string, unknown>[] = [];
  let pagina = 0;
  while (true) {
    const { data, error } = await origem
      .from(tabela)
      .select(select)
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
  // Vercel Cron envia automaticamente CRON_SECRET no header authorization
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
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
