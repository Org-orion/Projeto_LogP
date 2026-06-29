import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://wxfuzdwqjwjfxsetegmx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MDMwOCwiZXhwIjoyMDg5ODY2MzA4fQ.rQDoa52nQzER87sUPVZkDgAxmmqIxELHUbhfmOphEb4"
);

const INTEIRAS = new Set([
  "qtd_chapas","qtd_conforme","qtd_sobra","qtd_producao_1","qtd_producao_2",
  "qtd_nao_conforme_1","qtd_nao_conforme_2","qtd_nao_conforme_3","qtd_nao_conforme_4",
  "seccionadora_aq009","recebimento_chapa_aq001","recebimento_materiais_aq002",
]);

const NUMERICAS = new Set([
  "esp_recebido_mm","larg_recebido_cm","comp_recebido_cm",
  "espessura_mm","largura_cm","comprimento_cm",
  "espessura_2_mm","largura_2_cm","comprimento_2_cm",
  "esp_sobra_mm","larg_sobra_mm","comp_sobra_cm",
]);

// Converte DD/MM/YYYY → YYYY-MM-DD
function parseData(v) {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [d, m, y] = s.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

// Normaliza hora HH:MM:SS ou HH:MM, nulifica se inválida
function parseHora(v) {
  if (!v || !v.trim()) return null;
  const s = v.trim().slice(0, 5); // pega só HH:MM
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h) || isNaN(m) || m > 59 || h > 23) return null;
  return s;
}

function parseVal(key, raw) {
  const v = raw?.trim() ?? "";
  if (v === "" || v === "NULL") return null;
  if (key === "data") return parseData(v);
  if (key === "hora_inicial" || key === "hora_final") return parseHora(v);
  if (INTEIRAS.has(key)) { const n = Math.round(parseFloat(v.replace(",","."))); return isNaN(n) ? null : n; }
  if (NUMERICAS.has(key)) { const n = parseFloat(v.replace(",",".")); return isNaN(n) ? null : n; }
  return v;
}

const CSV = "c:\\Users\\PC012\\Desktop\\Upload Supabase\\Maquinas\\RQ03-SECCIONADORA 2.csv";
const lines = readFileSync(CSV,"utf-8").split(/\r?\n/).filter(l=>l.trim());
const headers = lines[0].split(";").map(h=>h.trim());

const rows = lines.slice(1).map(line => {
  const cols = line.split(";");
  const obj = {};
  headers.forEach((h,i) => { obj[h] = parseVal(h, cols[i]); });
  return obj;
});

console.log(`Total: ${rows.length} registros | Exemplo:`, { data: rows[0].data, maquina: rows[0].maquina, qtd_conforme: rows[0].qtd_conforme });

const BATCH = 500;
let inseridos = 0, erros = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const lote = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("registros_producao").insert(lote);
  if (error) {
    console.error(`\nErro lote ${i}–${i+BATCH}: ${error.message}`);
    // linha a linha
    for (const row of lote) {
      const { error: e2 } = await supabase.from("registros_producao").insert(row);
      if (e2) console.error(`  ↳ ${row.data} ${row.hora_inicial}: ${e2.message}`);
      else inseridos++;
    }
    erros += lote.length;
  } else {
    inseridos += lote.length;
    process.stdout.write(`\r${inseridos}/${rows.length}...`);
  }
}

console.log(`\n✅ ${inseridos} inseridos, ${erros} lotes com erro.`);
