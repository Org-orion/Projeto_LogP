import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Busca valores únicos de maquina em registros_producao
const { data: registros, error: e1 } = await supabase
  .from("registros_producao")
  .select("maquina");

if (e1) { console.error("Erro:", e1.message); process.exit(1); }

// Busca nomes da tabela maquinas
const { data: maquinas, error: e2 } = await supabase
  .from("maquinas")
  .select("nome");

if (e2) { console.error("Erro:", e2.message); process.exit(1); }

const nomesMaquinas = new Set(
  maquinas.map((m) => m.nome?.trim().toLowerCase()).filter(Boolean)
);

const valoresRegistros = [...new Set(
  registros.map((r) => r.maquina?.trim()).filter(Boolean)
)].sort();

// Encontra os que não existem na tabela maquinas
const faltando = valoresRegistros.filter(
  (v) => !nomesMaquinas.has(v.toLowerCase())
);

if (faltando.length === 0) {
  console.log("✓ Todas as máquinas dos registros já estão cadastradas em 'maquinas'.");
  process.exit(0);
}

console.log(`=== ${faltando.length} máquina(s) encontrada(s) nos registros mas ausentes em 'maquinas' ===`);
faltando.forEach((v) => console.log(" +", v));

// Insere as máquinas faltantes
const { error: e3 } = await supabase
  .from("maquinas")
  .insert(faltando.map((nome) => ({ nome })));

if (e3) {
  console.error("\nErro ao inserir:", e3.message);
} else {
  console.log(`\n✓ ${faltando.length} máquina(s) adicionada(s) à tabela 'maquinas'.`);
}
