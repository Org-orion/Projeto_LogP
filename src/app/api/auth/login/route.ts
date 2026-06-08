import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { encodeSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim()?.toLowerCase() ?? "";
  const password: string = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Preencha email e senha." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, senha, perfil, paginas")
    .eq("email", email)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  // Suporta senhas em texto puro (antigas) e bcrypt — migra automaticamente no login
  let senhaValida = false;
  if (data.senha?.startsWith("$2")) {
    senhaValida = await bcrypt.compare(password, data.senha);
  } else {
    senhaValida = data.senha === password;
    if (senhaValida) {
      const hash = await bcrypt.hash(password, 12);
      await supabaseAdmin.from("usuarios").update({ senha: hash }).eq("id", data.id);
    }
  }

  if (!senhaValida) {
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  const { senha: _removed, ...user } = data;
  const token = encodeSession(user);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
