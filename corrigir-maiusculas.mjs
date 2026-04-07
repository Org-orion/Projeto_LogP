import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Converte "MULTI SERRA PERFIL" → "Multi Serra Perfil"
function toTitleCase(str) {
  const minusculas = ["de", "da", "do", "das", "dos", "e", "a", "o"];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !minusculas.includes(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}

// Detecta se está tudo em maiúsculas (ignora números e símbolos)
function isAllCaps(str) {
  const letras = str.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  return letras.length > 0 && letras === letras.toUpperCase();
}

// Busca todas as máquinas
const { data: maquinas, error } = await supabase
  .from("maquinas")
  .select("id, nome")
  .order("nome");

if (error) { console.error("Erro:", error.message); process.exit(1); }

const paraCorrigir = maquinas.filter((m) => m.nome && isAllCaps(m.nome));

if (paraCorrigir.length === 0) {
  console.log("Nenhuma máquina com nome todo em maiúsculas encontrada.");
  process.exit(0);
}

console.log("=== Correções que serão aplicadas ===");
paraCorrigir.forEach((m) => {
  const novo = toTitleCase(m.nome);
  console.log(` "${m.nome}" → "${novo}"`);
});

console.log("\nAplicando...");

let ok = 0;
let erros = 0;

for (const m of paraCorrigir) {
  const novoNome = toTitleCase(m.nome);

  // Atualiza tabela maquinas
  const { error: e1 } = await supabase
    .from("maquinas")
    .update({ nome: novoNome })
    .eq("id", m.id);

  if (e1) { console.error(`Erro em 'maquinas' (${m.nome}):`, e1.message); erros++; continue; }

  // Atualiza registros_producao
  const { error: e2 } = await supabase
    .from("registros_producao")
    .update({ maquina: novoNome })
    .eq("maquina", m.nome);

  if (e2) { console.error(`Erro em 'registros_producao' (${m.nome}):`, e2.message); erros++; continue; }

  ok++;
}

console.log(`\nConcluído! ✓ Corrigidas: ${ok} | ✗ Erros: ${erros}`);
