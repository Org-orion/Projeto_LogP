import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Autenticação via Supabase Auth (auth.users) — a sessão em si (token,
// refresh, expiração) é gerida pela Supabase; aqui só resolvemos o usuário
// autenticado da requisição atual pro perfil de negócio em `usuarios`.
// `usuarios.id` continua sendo o mesmo de sempre (RBAC e auditoria não
// mudam) — o vínculo com auth.users é feito por `usuarios.auth_user_id`.

export interface SessionPayload {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
  deve_trocar_senha?: boolean;
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, perfil, paginas, status, deve_trocar_senha")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario) return null;
  if (usuario.status === "bloqueado" || usuario.status === "inativo") return null;

  const { status: _status, ...payload } = usuario;
  return payload as SessionPayload;
}
