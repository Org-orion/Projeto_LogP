import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://wxfuzdwqjwjfxsetegmx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MDMwOCwiZXhwIjoyMDg5ODY2MzA4fQ.rQDoa52nQzER87sUPVZkDgAxmmqIxELHUbhfmOphEb4"
);

// Colunas que o banco armazena como INTEGER — decimal deve ser arredondado
const INTEIRAS = new Set([
  "qtd_chapas","qtd_conforme","qtd_sobra",
  "seccionadora_aq009","recebimento_chapa_aq01","recebimento_materiais_aq002",
]);

// Colunas numéricas (aceita decimal)
const NUMERICAS = new Set([
  "esp_recebido_mm","larg_recebido_cm","comp_recebido_cm",
  "espessura_mm","largura_cm","comprimento_cm",
  "esp_sobra_mm","larg_sobra_mm","comp_sobra_cm",
]);

function parseVal(key, raw) {
  const v = raw?.trim() ?? "";
  if (v === "" || v === "NULL") return null;

  // Horário — valida HH:MM, nulifica se inválido
  if ((key === "hora_inicial" || key === "hora_final") && /^\d+:\d+$/.test(v)) {
    const [h, m] = v.split(":").map(Number);
    if (m > 59 || h > 23) {
      console.warn(`  ⚠ Horário inválido ignorado: ${key}=${v}`);
      return null;
    }
    return v;
  }

  if (INTEIRAS.has(key)) {
    const n = Math.round(parseFloat(v.replace(",", ".")));
    return isNaN(n) ? null : n;
  }
  if (NUMERICAS.has(key)) {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  return v;
}

const CSV = "c:\\Users\\PC012\\Desktop\\Upload Supabase\\Maquinas\\RQ03-SECCIONADORA 1.csv";
const raw = readFileSync(CSV, "utf-8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].split(";");

// Apenas os lotes que falharam: linhas 2501–3500 do CSV (índices base-1 incluindo header)
const INICIO = 2500; // índice base-0 no array lines[] (linha 2501 do arquivo)
const FIM    = 3500;

const rows = lines.slice(INICIO, FIM).map(line => {
  const cols = line.split(";");
  const obj = {};
  headers.forEach((h, i) => { obj[h.trim()] = parseVal(h.trim(), cols[i]); });
  return obj;
});

console.log(`Reprocessando ${rows.length} registros (linhas ${INICIO}–${FIM} do CSV)...`);

const BATCH = 100; // lotes menores para facilitar diagnóstico
let inseridos = 0;
let erros = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const lote = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("registros_producao").insert(lote);
  if (error) {
    console.error(`\nErro lote ${INICIO + i}–${INICIO + i + BATCH}: ${error.message}`);
    // Tenta linha a linha para identificar o registro exato
    for (const row of lote) {
      const { error: e2 } = await supabase.from("registros_producao").insert(row);
      if (e2) console.error(`  ↳ Linha ${row.data} ${row.hora_inicial}: ${e2.message}`);
      else inseridos++;
    }
    erros += lote.length;
  } else {
    inseridos += lote.length;
    process.stdout.write(`\rInseridos: ${inseridos}/${rows.length}...`);
  }
}

console.log(`\n✅ Concluído: ${inseridos} inseridos, ${erros} com erro.`);
