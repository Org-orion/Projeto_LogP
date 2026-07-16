import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Inicialização preguiçosa: antes, a checagem da env var rodava na avaliação
// do módulo, então só de IMPORTAR este arquivo (mesmo sem nunca usar o
// client) já derrubava o build inteiro na Vercel quando a env var não estava
// configurada lá — inclusive rotas que nem chamam supabaseAdmin de verdade.
// Com o Proxy, a checagem só acontece no primeiro uso real, em runtime.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione nas variáveis de ambiente do projeto (Vercel: Settings → Environment Variables).");
  _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  return _client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
