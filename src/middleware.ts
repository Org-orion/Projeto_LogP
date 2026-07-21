import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Padrão oficial @supabase/ssr: Server Components não conseguem escrever
// cookie, então o middleware renova o token (refresh) a cada requisição e
// devolve o cookie atualizado na resposta. Sem isso, sessões expiram cedo
// demais mesmo com atividade constante.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // Não adicionar lógica entre createServerClient e getUser() — getUser()
  // revalida o token contra o servidor da Supabase (não só lê cache local).
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // Route Handlers (api/*) escrevem o próprio cookie de sessão via
  // next/headers quando precisam (ver login/route.ts) — só Server
  // Components/páginas dependem desse refresh no middleware. Excluir api/*
  // evita revalidar o token contra a Supabase (round-trip de rede) duas
  // vezes na mesma navegação: uma vez aqui, outra dentro da própria rota.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
