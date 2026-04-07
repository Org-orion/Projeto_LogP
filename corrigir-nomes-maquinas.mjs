import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Remove acentos, caracteres especiais corrompidos, normaliza espaços e lowercase
function normalizar(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, " ")  // remove caracteres especiais (inclui corrompidos)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Busca dados
const [{ data: maquinas, error: e1 }, { data: registros, error: e2 }] = await Promise.all([
  supabase.from("maquinas").select("nome"),
  supabase.from("registros_producao").select("maquina"),
]);

if (e1) { console.error("Erro maquinas:", e1.message); process.exit(1); }
if (e2) { console.error("Erro registros:", e2.message); process.exit(1); }

const nomesMaquinas = maquinas.map((m) => m.nome).filter(Boolean);
const valoresRegistros = [...new Set(
  registros.map((r) => r.maquina).filter(Boolean)
)].sort();

// Monta mapa: valorOriginal → nomeCorreto
const mapeamento = {};
const semMatch = [];

for (const valor of valoresRegistros) {
  const vNorm = normalizar(valor);

  const match = nomesMaquinas.find((nome) => normalizar(nome) === vNorm);

  if (match) {
    mapeamento[valor] = match;
  } else {
    // Tenta match parcial: todas as palavras do registro estão no nome da máquina
    const palavrasValor = vNorm.split(" ").filter((p) => p.length > 2);
    const matchParcial = nomesMaquinas.find((nome) => {
      const nNorm = normalizar(nome);
      return palavrasValor.every((p) => nNorm.includes(p));
    });

    if (matchParcial) {
      mapeamento[valor] = matchParcial;
    } else {
      semMatch.push(valor);
    }
  }
}

// Exibe resultado
console.log("\n=== Correções a aplicar ===");
let iguais = 0;
for (const [orig, dest] of Object.entries(mapeamento)) {
  if (orig === dest) { iguais++; }
  else { console.log(`  "${orig}"\n  → "${dest}"\n`); }
}
console.log(`  (${iguais} já estão corretos)`);

if (semMatch.length > 0) {
  console.log("\n=== Sem correspondência — serão adicionados à tabela 'maquinas' ===");
  semMatch.forEach((v) => console.log("  +", v));

  const { error } = await supabase
    .from("maquinas")
    .insert(semMatch.map((nome) => ({ nome })));

  if (error) console.error("Erro ao inserir novas máquinas:", error.message);
  else {
    console.log(`✓ ${semMatch.length} máquina(s) inserida(s).`);
    semMatch.forEach((v) => { mapeamento[v] = v; });
  }
}

// Aplica correções em registros_producao
console.log("\nAplicando correções...");
let atualizados = 0;
let erros = 0;

for (const [original, correto] of Object.entries(mapeamento)) {
  if (original === correto) continue;

  const { error } = await supabase
    .from("registros_producao")
    .update({ maquina: correto })
    .eq("maquina", original);

  if (error) {
    console.error(`✗ Erro ao atualizar "${original}":`, error.message);
    erros++;
  } else {
    atualizados++;
    process.stdout.write(`\r✓ ${atualizados} nome(s) corrigido(s)`);
  }
}

console.log(`\n\nConcluído! Corrigidos: ${atualizados} | Erros: ${erros}`);
