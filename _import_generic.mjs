import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://wxfuzdwqjwjfxsetegmx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnV6ZHdxandqZnhzZXRlZ214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MDMwOCwiZXhwIjoyMDg5ODY2MzA4fQ.rQDoa52nQzER87sUPVZkDgAxmmqIxELHUbhfmOphEb4"
);

// Colunas que o banco armazena como INTEGER
const INTEIRAS = new Set([
  "qtd_chapas","qtd_conforme","qtd_sobra",
  "qtd_producao_1","qtd_producao_2",
  "qtd_nao_conforme_1","qtd_nao_conforme_2","qtd_nao_conforme_3","qtd_nao_conforme_4",
  "seccionadora_aq009","recebimento_chapa_aq001","recebimento_chapa_aq01",
  "recebimento_materiais_aq002","recebimento_insumos_aq044",
  "multi_serra_aba_aq010","multi_serra_regua_aq010","coladeira_alizar_aq0012",
  "plaina_moldureira_batente_aq011","plaina_moldureira_rodape_aq043",
  "prensa_fria_aq017","lixamento_aq041","colagem_borda_aq020",
  "esquadrejadeira_aq040","montadora_grade_aq039","mesa_montagem_aq016",
  "linha_pintura_aq021","recobrimento_aq019","usinagem_portas_aq023",
  "usinagem_friso_aq022","recebimento_ferragens_aq005","embalagem_portas_aq024",
  "montagem_kit_aq029","linha_pintura_portas_aq018","destopadeira_sarrafo_aq015",
  "recebimento_chapa_aq01","temperatura_coleiro",
]);

function parseData(v) {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return null;
}

function parseHora(v) {
  if (!v?.trim()) return null;
  const s = v.trim().slice(0, 5);
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h) || isNaN(m) || m > 59 || h > 23) return null;
  return s;
}

function parseVal(key, raw) {
  const v = raw?.trim() ?? "";
  if (v === "" || v === "NULL" || v === "null") return null;
  if (key === "data") return parseData(v);
  if (key === "hora_inicial" || key === "hora_final") return parseHora(v);
  if (INTEIRAS.has(key)) {
    const n = Math.round(parseFloat(v.replace(",", ".")));
    return isNaN(n) ? null : n;
  }
  // Tenta número para qualquer campo restante que pareça numérico
  if (/^-?\d+([.,]\d+)?$/.test(v)) {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? v : n;
  }
  return v;
}

export async function importarCSV(csvPath) {
  const lines = readFileSync(csvPath, "utf-8").split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(";").map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(";");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = parseVal(h, cols[i]); });
    return obj;
  });

  const maquina = rows[0]?.maquina ?? csvPath;
  console.log(`\n📥 ${maquina} — ${rows.length} registros`);
  console.log(`   Exemplo: data=${rows[0]?.data}, qtd_conforme=${rows[0]?.qtd_conforme}`);

  const BATCH = 500;
  let inseridos = 0, erros = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const lote = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("registros_producao").insert(lote);
    if (error) {
      process.stdout.write(`\n   ⚠ Erro lote ${i}: ${error.message} — tentando linha a linha...`);
      for (const row of lote) {
        const { error: e2 } = await supabase.from("registros_producao").insert(row);
        if (e2) { console.error(`\n   ↳ ${row.data} ${row.hora_inicial}: ${e2.message}`); erros++; }
        else inseridos++;
      }
    } else {
      inseridos += lote.length;
      process.stdout.write(`\r   ${inseridos}/${rows.length}...`);
    }
  }
  console.log(`\n✅ ${inseridos} inseridos, ${erros} erros.`);
}

// Executa diretamente se chamado com argumento
const csv = process.argv[2];
if (csv) await importarCSV(csv);
