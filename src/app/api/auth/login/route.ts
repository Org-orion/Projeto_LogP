import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { registrarAuditoria, extrairUserAgent } from "@/lib/audit";

// Rate limiting simples: máx 10 tentativas por IP a cada 15 minutos
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

async function verificarTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // sem chave configurada, não bloqueia o login

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const json = await res.json().catch(() => null);
  return json?.success === true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim()?.toLowerCase() ?? "";
  const password: string = body?.password ?? "";
  const turnstileToken: string = body?.turnstileToken ?? "";
  const userAgent = extrairUserAgent(req);

  if (!email || !password) {
    return NextResponse.json({ error: "Preencha email e senha." }, { status: 400 });
  }

  if (!turnstileToken || !(await verificarTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Verificação de segurança falhou. Recarregue a página e tente novamente." }, { status: 400 });
  }

  // Autentica via Supabase Auth — o cliente abaixo já grava o cookie de
  // sessão na resposta via next/headers (ver src/lib/supabase-server.ts).
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.user) {
    await registrarAuditoria({
      usuarioId: null, usuarioNome: email, acao: "login", modulo: "autenticacao",
      descricao: `Login falhou para ${email}: ${authError?.message ?? "credenciais inválidas"}.`,
      ip, userAgent, resultado: "falha",
    });
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, perfil, paginas, status, deve_trocar_senha")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!usuario) {
    await supabase.auth.signOut();
    await registrarAuditoria({
      usuarioId: null, usuarioNome: email, acao: "login", modulo: "autenticacao",
      descricao: `Login autenticado no Supabase Auth, mas sem perfil correspondente em "usuarios" (${email}).`,
      ip, userAgent, resultado: "falha",
    });
    return NextResponse.json({ error: "Usuário sem perfil cadastrado. Fale com um administrador." }, { status: 403 });
  }

  if (usuario.status === "bloqueado" || usuario.status === "inativo") {
    await supabase.auth.signOut();
    await registrarAuditoria({
      usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "login", modulo: "autenticacao",
      descricao: `Login negado — usuário com status "${usuario.status}".`,
      ip, userAgent, resultado: "falha",
    });
    return NextResponse.json({ error: "Sua conta está bloqueada. Fale com um administrador." }, { status: 403 });
  }

  await supabaseAdmin.from("usuarios").update({
    ultimo_login: new Date().toISOString(), ultimo_ip: ip, ultimo_user_agent: userAgent,
  }).eq("id", usuario.id);

  await registrarAuditoria({
    usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "login", modulo: "autenticacao",
    descricao: `${usuario.nome} entrou no sistema.`,
    ip, userAgent, resultado: "sucesso",
  });

  const { status: _status, ...user } = usuario;
  return NextResponse.json({ user });
}
