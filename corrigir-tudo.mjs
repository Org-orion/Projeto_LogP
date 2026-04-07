import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"]);

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !MINUSCULAS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}

function isAllCaps(str) {
  const letras = str.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  return letras.length > 0 && letras === letras.toUpperCase();
}

function normalizar(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// 1. Busca todos os dados (com paginação para registros_producao)
const { data: maquinas, error: e1 } = await supabase.from("maquinas").select("nome");
if (e1) { console.error("Erro maquinas:", e1.message); process.exit(1); }

// Pagina para pegar todos os nomes únicos em registros_producao
const nomesSet = new Set();
let pagina = 0;
const TAM_PAG = 1000;
while (true) {
  const { data: lote, error: e2 } = await supabase
    .from("registros_producao")
    .select("maquina")
    .range(pagina * TAM_PAG, (pagina + 1) * TAM_PAG - 1);
  if (e2) { console.error("Erro registros:", e2.message); process.exit(1); }
  if (!lote || lote.length === 0) break;
  lote.forEach((r) => r.maquina && nomesSet.add(r.maquina));
  if (lote.length < TAM_PAG) break;
  pagina++;
}

const nomesMaquinas = maquinas.map((m) => m.nome).filter(Boolean);
const valoresUnicos = [...nomesSet].sort();

console.log(`\nMáquinas na tabela 'maquinas': ${nomesMaquinas.length}`);
console.log(`Valores únicos em 'registros_producao.maquina': ${valoresUnicos.length}\n`);

// 2. Para cada valor, determina o nome correto
const mapeamento = {}; // valorOriginal → nomeCorreto

for (const valor of valoresUnicos) {
  // Já está correto?
  if (nomesMaquinas.includes(valor)) {
    mapeamento[valor] = valor;
    continue;
  }

  // Converte para Title Case e tenta match
  const candidato = isAllCaps(valor) ? toTitleCase(valor) : valor;

  // Tenta match exato com o candidato
  if (nomesMaquinas.includes(candidato)) {
    mapeamento[valor] = candidato;
    continue;
  }

  // Tenta match normalizado
  const candidatoNorm = normalizar(candidato);
  const matchNorm = nomesMaquinas.find((n) => normalizar(n) === candidatoNorm);
  if (matchNorm) {
    mapeamento[valor] = matchNorm;
    continue;
  }

  // Tenta match parcial por palavras (todas as palavras do valor estão no nome)
  const palavrasValor = candidatoNorm.split(" ").filter((p) => p.length > 2);
  const matchParcial = nomesMaquinas.find((n) => {
    const nNorm = normalizar(n);
    return palavrasValor.every((p) => nNorm.includes(p));
  });
  if (matchParcial) {
    mapeamento[valor] = matchParcial;
    continue;
  }

  // Sem match — usa o candidato em Title Case (vai ser inserido em maquinas)
  mapeamento[valor] = candidato;
}

// 3. Exibe o plano
console.log("=== Correções planejadas ===");
let jaCorretos = 0;
const novasMaquinas = [];

for (const [orig, dest] of Object.entries(mapeamento)) {
  if (orig === dest && nomesMaquinas.includes(dest)) {
    jaCorretos++;
  } else {
    console.log(`  "${orig}"\n  → "${dest}"\n`);
    if (!nomesMaquinas.includes(dest)) {
      novasMaquinas.push(dest);
    }
  }
}
console.log(`  (${jaCorretos} já estão corretos)\n`);

// 4. Insere novas máquinas
if (novasMaquinas.length > 0) {
  console.log(`=== Inserindo ${novasMaquinas.length} nova(s) máquina(s) em 'maquinas' ===`);
  novasMaquinas.forEach((n) => console.log("  +", n));

  const { error } = await supabase
    .from("maquinas")
    .insert(novasMaquinas.map((nome) => ({ nome })));

  if (error) {
    console.error("Erro ao inserir:", error.message);
  } else {
    console.log(`✓ ${novasMaquinas.length} máquina(s) inserida(s).\n`);
    novasMaquinas.forEach((n) => nomesMaquinas.push(n));
  }
}

// 5. Aplica correções em registros_producao
console.log("=== Aplicando correções em registros_producao ===");
let atualizados = 0;
let erros = 0;

for (const [original, correto] of Object.entries(mapeamento)) {
  if (original === correto) continue;

  const { error } = await supabase
    .from("registros_producao")
    .update({ maquina: correto })
    .eq("maquina", original);

  if (error) {
    console.error(`✗ "${original}": ${error.message}`);
    erros++;
  } else {
    atualizados++;
    process.stdout.write(`\r✓ ${atualizados} registro(s) corrigido(s)`);
  }
}

console.log(`\n\n✅ Concluído! Corrigidos: ${atualizados} | Erros: ${erros}`);
