import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── 1. Busca dados ──────────────────────────────────────────────────────────

const { data: registros, error: e1 } = await supabase
  .from("registros_producao")
  .select("maquina");

if (e1) { console.error("Erro ao buscar registros:", e1.message); process.exit(1); }

const { data: maquinasData, error: e2 } = await supabase
  .from("maquinas")
  .select("nome");

if (e2) { console.error("Erro ao buscar máquinas:", e2.message); process.exit(1); }

// Valores únicos de registros_producao.maquina (não nulos)
const valoresRegistros = [...new Set(
  registros.map((r) => r.maquina).filter(Boolean).map((m) => m.trim())
)].sort();

// Nomes cadastrados em maquinas
const nomesMaquinas = maquinasData.map((m) => m.nome?.trim()).filter(Boolean);

console.log("\n=== Máquinas cadastradas na tabela 'maquinas' ===");
nomesMaquinas.forEach((n) => console.log(" •", n));

console.log("\n=== Valores únicos em 'registros_producao.maquina' ===");
valoresRegistros.forEach((v) => console.log(" •", v));

// ─── 2. Normaliza string para comparação ────────────────────────────────────

function norm(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 3. Tenta fazer match entre valor do registro e nome da máquina ─────────

function findMatch(valor, nomes) {
  const vNorm = norm(valor);

  // Exato
  const exato = nomes.find((n) => norm(n) === vNorm);
  if (exato) return exato;

  // Um contém o outro
  const contido = nomes.find((n) => {
    const nNorm = norm(n);
    return vNorm.includes(nNorm) || nNorm.includes(vNorm);
  });
  if (contido) return contido;

  return null;
}

// ─── 4. Classifica cada valor ────────────────────────────────────────────────

const mapeamento = {}; // valorOriginal → nomeNormalizado
const semMatch = [];   // valores sem correspondência

for (const valor of valoresRegistros) {
  const match = findMatch(valor, nomesMaquinas);
  if (match) {
    mapeamento[valor] = match;
  } else {
    semMatch.push(valor);
  }
}

console.log("\n=== Mapeamento encontrado (será aplicado) ===");
for (const [orig, dest] of Object.entries(mapeamento)) {
  if (orig !== dest) console.log(` "${orig}" → "${dest}"`);
  else console.log(` "${orig}" ✓ já padronizado`);
}

if (semMatch.length > 0) {
  console.log("\n=== Sem correspondência → serão adicionados à tabela 'maquinas' ===");
  semMatch.forEach((v) => console.log(" +", v));
}

// ─── 5. Adiciona máquinas novas à tabela 'maquinas' ─────────────────────────

if (semMatch.length > 0) {
  const novas = semMatch.map((nome) => ({ nome }));
  const { error } = await supabase.from("maquinas").insert(novas);
  if (error) {
    console.error("\nErro ao inserir novas máquinas:", error.message);
  } else {
    console.log(`\n✓ ${semMatch.length} máquina(s) adicionada(s) à tabela 'maquinas'.`);
    // Adiciona ao mapeamento como já corretos
    semMatch.forEach((v) => { mapeamento[v] = v; });
  }
}

// ─── 6. Atualiza registros_producao ──────────────────────────────────────────

console.log("\nAtualizando registros_producao...");

let atualizados = 0;
let erros = 0;

for (const [original, padronizado] of Object.entries(mapeamento)) {
  if (original === padronizado) continue; // já está correto, pula

  const { error } = await supabase
    .from("registros_producao")
    .update({ maquina: padronizado })
    .eq("maquina", original);

  if (error) {
    console.error(`Erro ao atualizar "${original}":`, error.message);
    erros++;
  } else {
    atualizados++;
    process.stdout.write(`\r✓ ${atualizados} valor(es) padronizado(s)`);
  }
}

console.log(`\n\nConcluído! Padronizados: ${atualizados} | Erros: ${erros}`);
