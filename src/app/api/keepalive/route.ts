import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_AUDIT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_AUDIT_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "env vars missing" }, { status: 500 });
  }

  const client = createClient(url, key);
  const { error } = await client.from("auditorias").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
