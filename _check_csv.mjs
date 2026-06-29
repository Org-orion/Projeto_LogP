import { readFileSync } from "fs";
const CSV = "c:\\Users\\PC012\\Desktop\\Upload Supabase\\Maquinas\\RQ03-SECCIONADORA 1.csv";
const raw = readFileSync(CSV, "utf-8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].split(";");
const IGNORAR = new Set(["largura_cm","comprimento_cm","espessura_mm","esp_recebido_mm","larg_recebido_cm","comp_recebido_cm"]);

for (let i = 2501; i <= 3499; i++) {
  if (!lines[i]) continue;
  const cols = lines[i].split(";");
  cols.forEach((v, j) => {
    const h = headers[j];
    // decimal em coluna suspeita
    if (!IGNORAR.has(h) && v.includes(".") && !isNaN(parseFloat(v)) && v.trim() !== "") {
      console.log(`Decimal  | linha ${i} | coluna: ${h} = ${v}`);
    }
    // horário inválido
    if (/^\d+:\d+$/.test(v.trim())) {
      const [,m] = v.split(":").map(Number);
      if (m > 59) console.log(`Horário  | linha ${i} | coluna: ${h} = ${v}`);
    }
  });
}
