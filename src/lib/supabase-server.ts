import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase "consciente de cookies" pra Server Components/Route
// Handlers — usa a chave anônima (respeita a sessão de quem chamou, não o
// service role). Padrão oficial do pacote @supabase/ssr pro Next.js App
// Router. Ver src/middleware.ts pro refresh automático de token.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de dentro de um Server Component (não pode escrever
            // cookie) — sem problema, o middleware cuida do refresh.
          }
        },
      },
    },
  );
}
