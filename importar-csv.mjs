import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://wxfuzdwqjwjfxsetegmx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTAzMDgsImV4cCI6MjA4OTg2NjMwOH0.YbRby-m2lnkBX9-Z8COzZjAzn0r56mzkCI_m9g28IZI";
const TABELA = "registros_producao";
const ARQUIVO = "C:\\Users\\PC012\\Downloads\\registros_producao_rows.csv";
const LOTE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function comRetry(fn, descricao) {
  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const msg = err?.message ?? String(err);
      if (tentativa < MAX_RETRIES) {
        console.warn(`  ⚠ ${descricao} — tentativa ${tentativa}/${MAX_RETRIES}: ${msg}. Aguardando ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
}

// ─── Conversores ─────────────────────────────────────────────────────────────

function excelSerialToISO(serial) {
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split("T")[0];
}

function brDateToISO(val) {
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function excelTimeToHMS(decimal) {
  const totalSeg = Math.round(decimal * 86400);
  const h = Math.floor(totalSeg / 3600);
  if (h >= 24) return null;
  const min = Math.floor((totalSeg % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSeg % 60).toString().padStart(2, "0");
  return `${h.toString().padStart(2, "0")}:${min}:${s}`;
}

function normalizeTime(val) {
  const cleaned = val.replace(/^[^\d]+/, "");
  const m = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h >= 24 || min >= 60) return null; // horário inválido
  return `${h.toString().padStart(2, "0")}:${m[2]}:00`;
}

const COLUNAS_DATA = new Set(["data", "created_at", "updated_at"]);
const COLUNAS_HORA = new Set(["hora_inicial", "hora_final"]);
const NUMERIC_KEYWORDS = [
  "qtd", "pressao", "temperatura", "espessura", "largura", "comprimento",
  "comp_", "larg_", "esp_", "gramatura", "tempo", "n_maquina", "registro",
  "prensa", "seccionadora", "linha_pintura", "recobrimento", "montadora",
  "montagem", "recebimento", "lixamento", "destopadeira", "colagem_borda",
  "usinagem", "embalagem", "furacao", "multi_serra", "plaina", "coladeira",
  "altura", "profundidade", "desvio", "paralelismo", "n_lote", "n_corte",
  "n_bordas", "quantidade", "sobra", "producao_",
];

function isNumericColumn(col) {
  const c = col.toLowerCase();
  return NUMERIC_KEYWORDS.some((k) => c.includes(k));
}

// ─── Lê e parseia o CSV ───────────────────────────────────────────────────────

const texto = readFileSync(ARQUIVO, "latin1");
const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
const cabecalho = linhas[0].split(";").map((c) => c.trim());

const registros = linhas.slice(1).map((linha) => {
  const valores = linha.split(";");
  const obj = {};
  cabecalho.forEach((col, i) => {
    if (col === "id") return;
    const val = (valores[i] ?? "").trim();
    if (val === "") { obj[col] = null; return; }
    if (val === "sim") { obj[col] = true; return; }
    if (val === "nao" || val === "não") { obj[col] = false; return; }
    if (COLUNAS_DATA.has(col)) {
      const num = Number(val);
      if (!isNaN(num) && num > 40000) { obj[col] = excelSerialToISO(num); return; }
      obj[col] = brDateToISO(val) ?? null; return;
    }
    if (COLUNAS_HORA.has(col)) {
      const num = Number(val);
      if (!isNaN(num) && num > 0 && num < 1) { obj[col] = excelTimeToHMS(num); return; }
      obj[col] = normalizeTime(val); return;
    }
    const num = Number(val.replace(",", "."));
    if (!isNaN(num)) { obj[col] = num; return; }
    if (isNumericColumn(col)) { obj[col] = null; return; }
    obj[col] = val;
  });
  return obj;
});

console.log(`\n📄 CSV lido: ${registros.length} registros`);

// ─── Lotes específicos para reprocessar (0 = processar todos) ───────────────
// Preencha com os índices de início dos lotes que falharam, ou deixe vazio para reprocessar tudo
const APENAS_INDICES = []; // vazio = reimporta tudo

// ─── 1. Apaga dados atuais ────────────────────────────────────────────────────

if (APENAS_INDICES.length === 0) {
  console.log("\n🗑  Apagando dados existentes...");
  await comRetry(async () => {
    const { error } = await supabase.from(TABELA).delete().not("id", "is", null);
    if (error) throw new Error(error.message);
  }, "DELETE");
  console.log("✓ Dados apagados.");
} else {
  console.log(`\n⚡ Modo parcial: reinserindo apenas ${APENAS_INDICES.length} lote(s) que falharam.`);
}

// ─── 2. Insere em lotes com retry ────────────────────────────────────────────

const lotesParaProcessar = APENAS_INDICES.length > 0
  ? APENAS_INDICES
  : Array.from({ length: Math.ceil(registros.length / LOTE) }, (_, i) => i * LOTE);

console.log(`\n⬆  Inserindo registros em lotes de ${LOTE}...\n`);

let inseridos = 0;
let erros = 0;

for (const i of lotesParaProcessar) {
  const lote = registros.slice(i, i + LOTE);
  const numLote = Math.floor(i / LOTE) + 1;

  try {
    await comRetry(async () => {
      const { error } = await supabase.from(TABELA).insert(lote);
      if (error) throw new Error(error.message);
    }, `Lote ${numLote}`);
    inseridos += lote.length;
    process.stdout.write(`\rInseridos: ${inseridos}/${registros.length}`);
  } catch {
    // Fallback: tenta linha a linha para salvar o que for possível
    process.stdout.write(`\n  ↳ Lote ${numLote} falhou — tentando linha a linha...`);
    for (const row of lote) {
      try {
        // Arredonda decimais em campos que podem ser inteiros no banco
        const rowCorrigido = Object.fromEntries(
          Object.entries(row).map(([k, v]) => {
            if (typeof v === "number" && !Number.isInteger(v) && isNumericColumn(k)) {
              return [k, Math.round(v)];
            }
            return [k, v];
          })
        );
        const { error } = await supabase.from(TABELA).insert(rowCorrigido);
        if (error) throw new Error(error.message);
        inseridos++;
      } catch (rowErr) {
        erros++;
      }
    }
    process.stdout.write(`\rInseridos: ${inseridos}/${registros.length}`);
  }
}

console.log(`\n\n✅ Concluído! Inseridos: ${inseridos} | Lotes com erro: ${erros}`);
