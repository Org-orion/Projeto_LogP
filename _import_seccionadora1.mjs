import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://wxfuzdwqjwjfxsetegmx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MDMwOCwiZXhwIjoyMDg5ODY2MzA4fQ.rQDoa52nQzER87sUPVZkDgAxmmqIxELHUbhfmOphEb4"
);

// Colunas numéricas — converte string para número (null se vazio)
const NUMERICAS = new Set([
  "esp_recebido_mm","larg_recebido_cm","comp_recebido_cm","qtd_chapas",
  "espessura_mm","largura_cm","comprimento_cm","qtd_conforme",
  "esp_sobra_mm","larg_sobra_mm","comp_sobra_cm","qtd_sobra",
  "seccionadora_aq009","recebimento_chapa_aq01","recebimento_materiais_aq002",
]);

function parseVal(key, raw) {
  const v = raw?.trim() ?? "";
  if (v === "" || v === "NULL" || v === "null") return null;
  if (NUMERICAS.has(key)) {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  return v;
}

const CSV_PATH = "c:\\Users\\PC012\\Desktop\\Upload Supabase\\Maquinas\\RQ03-SECCIONADORA 1.csv";
const raw = readFileSync(CSV_PATH, "utf-8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].split(";");

const rows = lines.slice(1).map(line => {
  const cols = line.split(";");
  const obj = {};
  headers.forEach((h, i) => {
    obj[h.trim()] = parseVal(h.trim(), cols[i]);
  });
  return obj;
});

console.log(`Total de linhas: ${rows.length}`);
console.log(`Exemplo linha 1:`, rows[0]);

const BATCH = 500;
let inseridos = 0;
let erros = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const lote = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("registros_producao").insert(lote);
  if (error) {
    console.error(`Erro no lote ${i}–${i + BATCH}:`, error.message, error.details);
    erros += lote.length;
  } else {
    inseridos += lote.length;
    process.stdout.write(`\rInseridos: ${inseridos}/${rows.length}...`);
  }
}

console.log(`\n✅ Concluído: ${inseridos} inseridos, ${erros} com erro.`);
