import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Log de auditoria real — alimentado por login/logout e pelas mutações do
// módulo Administração (não é um mock/placeholder).

export type AcaoAuditoria =
  | "login" | "logout"
  | "criar_usuario" | "editar_usuario" | "excluir_usuario"
  | "bloquear_usuario" | "desbloquear_usuario" | "redefinir_senha"
  | "alterar_perfil" | "alterar_permissoes"
  | "criar_perfil" | "editar_perfil" | "excluir_perfil"
  | "revogar_sessao";

interface RegistrarAuditoriaInput {
  usuarioId: string | number | null;
  usuarioNome: string | null;
  acao: AcaoAuditoria;
  modulo: string;
  entidade?: string;
  descricao: string;
  ip?: string | null;
  userAgent?: string | null;
  resultado: "sucesso" | "falha";
}

export async function registrarAuditoria(input: RegistrarAuditoriaInput) {
  await supabaseAdmin.from("audit_log").insert({
    usuario_id: input.usuarioId,
    usuario_nome: input.usuarioNome,
    acao: input.acao,
    modulo: input.modulo,
    entidade: input.entidade ?? null,
    descricao: input.descricao,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
    resultado: input.resultado,
  });
}

export function extrairIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
}

export function extrairUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") ?? "desconhecido";
}
