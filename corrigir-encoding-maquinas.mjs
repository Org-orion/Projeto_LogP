import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Busca todos os nomes corretos da tabela maquinas
const { data: maquinas, error: e1 } = await supabase.from("maquinas").select("nome");
if (e1) { console.error(e1.message); process.exit(1); }

// 2. Busca valores únicos de maquina em registros_producao
const { data: registros, error: e2 } = await supabase
  .from("registros_producao")
  .select("maquina");
if (e2) { console.error(e2.message); process.exit(1); }

const nomesMaquinas = maquinas.map((m) => m.nome).filter(Boolean);
const valoresUnicos = [...new Set(registros.map((r) => r.maquina).filter(Boolean))];

// 3. Detecta valores com caracteres corrompidos (não ASCII puro nem UTF-8 válido típico)
//    e tenta match por palavras-chave numéricas e alfanuméricas limpas
function palavrasLimpas(str) {
  // Extrai apenas sequências de letras A-Z e números, ignora lixo de encoding
  return str.match(/[A-Za-z0-9]+/g) ?? [];
}

function scoreMatch(valor, nomeMaquina) {
  const pw = palavrasLimpas(valor).map((p) => p.toLowerCase());
  const pm = palavrasLimpas(nomeMaquina).map((p) => p.toLowerCase());
  // Conta quantas palavras do nome da máquina estão no valor (e vice-versa)
  const hits = pm.filter((p) => pw.some((w) => w === p || w.startsWith(p) || p.startsWith(w)));
  return hits.length / Math.max(pm.length, 1);
}

console.log("\n=== Verificando valores em registros_producao ===\n");

let atualizados = 0;
let erros = 0;

for (const valor of valoresUnicos) {
  // Verifica se o valor já existe exatamente na tabela maquinas
  const exato = nomesMaquinas.find((n) => n === valor);
  if (exato) continue; // já está correto

  // Encontra o melhor match por score de palavras limpas
  let melhorMatch = null;
  let melhorScore = 0;

  for (const nome of nomesMaquinas) {
    const score = scoreMatch(valor, nome);
    if (score > melhorScore) {
      melhorScore = score;
      melhorMatch = nome;
    }
  }

  if (melhorMatch && melhorScore >= 0.6) {
    console.log(`"${valor}"\n→ "${melhorMatch}" (score: ${(melhorScore * 100).toFixed(0)}%)\n`);

    const { error } = await supabase
      .from("registros_producao")
      .update({ maquina: melhorMatch })
      .eq("maquina", valor);

    if (error) {
      console.error(`  ✗ Erro: ${error.message}`);
      erros++;
    } else {
      atualizados++;
    }
  } else {
    console.log(`"${valor}" — sem match confiável (melhor: "${melhorMatch}", score: ${(melhorScore * 100).toFixed(0)}%)`);
  }
}

console.log(`\nConcluído! ✓ Corrigidos: ${atualizados} | ✗ Erros: ${erros}`);
