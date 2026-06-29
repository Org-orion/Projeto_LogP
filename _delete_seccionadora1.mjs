import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wxfuzdwqjwjfxsetegmx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MDMwOCwiZXhwIjoyMDg5ODY2MzA4fQ.rQDoa52nQzER87sUPVZkDgAxmmqIxELHUbhfmOphEb4"
);

// Confirma contagem antes de apagar
const { count: preview } = await supabase
  .from("registros_producao")
  .select("*", { count: "exact", head: true })
  .ilike("maquina", "%SECCIONADORA 1%")
  .lte("data", "2026-03-31");

console.log(`Preview: ${preview} registros encontrados`);

const { error, count } = await supabase
  .from("registros_producao")
  .delete({ count: "exact" })
  .ilike("maquina", "%SECCIONADORA 1%")
  .lte("data", "2026-03-31");

if (error) {
  console.error("ERRO:", error.message, error.details);
  process.exit(1);
} else {
  console.log(`✅ Apagados com sucesso: ${count} registros`);
}
