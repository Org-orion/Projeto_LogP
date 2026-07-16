// Script de migração única: cria um usuário no Supabase Auth pra cada linha
// de `usuarios` que ainda não tem `auth_user_id`, com senha temporária, e
// marca `deve_trocar_senha = true` (a pessoa troca no primeiro login).
//
// Rodar UMA VEZ, depois de aplicar o SQL (coluna `usuarios.auth_user_id`):
//   node --env-file=.env.local scripts/migrar-usuarios-supabase-auth.mjs
//
// Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.
// As senhas temporárias só aparecem no terminal — anote e repasse manualmente
// pra cada pessoa (WhatsApp, presencial etc.).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  console.error("Rode com: node --env-file=.env.local scripts/migrar-usuarios-supabase-auth.mjs");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function gerarSenhaTemporaria() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function main() {
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("id, nome, email")
    .is("auth_user_id", null);

  if (error) {
    console.error("Erro ao buscar usuários:", error.message);
    process.exit(1);
  }

  if (!usuarios || usuarios.length === 0) {
    console.log("Nenhum usuário pendente de migração — todos já têm auth_user_id.");
    return;
  }

  console.log(`Migrando ${usuarios.length} usuário(s)...\n`);

  const senhasGeradas = [];
  const falhas = [];

  for (const usuario of usuarios) {
    const senhaTemporaria = gerarSenhaTemporaria();

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: usuario.email,
      password: senhaTemporaria,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      falhas.push({ usuario, motivo: authError?.message ?? "erro desconhecido" });
      continue;
    }

    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ auth_user_id: authUser.user.id, deve_trocar_senha: true })
      .eq("id", usuario.id);

    if (updateError) {
      falhas.push({ usuario, motivo: updateError.message });
      await supabase.auth.admin.deleteUser(authUser.user.id);
      continue;
    }

    senhasGeradas.push({ nome: usuario.nome, email: usuario.email, senhaTemporaria });
  }

  if (senhasGeradas.length > 0) {
    console.log("Migrados com sucesso — repasse a senha temporária pra cada pessoa:\n");
    console.table(senhasGeradas);
  }

  if (falhas.length > 0) {
    console.log("\nFalharam (não migrados):");
    for (const f of falhas) {
      console.log(`  - ${f.usuario.nome} (${f.usuario.email}): ${f.motivo}`);
    }
  }

  console.log(`\nConcluído: ${senhasGeradas.length} migrado(s), ${falhas.length} falha(s).`);
}

main();
