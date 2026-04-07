import { readFileSync } from "fs";

const ARQUIVO = "C:\\Users\\PC012\\Downloads\\registros_producao_rows.csv";

// Lê como buffer bruto
const buf = readFileSync(ARQUIVO);

// Procura "FURA" nos bytes
const alvo = Buffer.from("FURA");
for (let i = 0; i < buf.length - 20; i++) {
  if (buf[i] === alvo[0] && buf[i+1] === alvo[1] && buf[i+2] === alvo[2] && buf[i+3] === alvo[3]) {
    const trecho = buf.slice(i, i + 20);
    console.log("Bytes encontrados:", [...trecho].map(b => b.toString(16).padStart(2,"0")).join(" "));
    console.log("Como latin1:  ", trecho.toString("latin1"));
    console.log("Como utf8:    ", trecho.toString("utf8"));
    console.log("Como utf16le: ", trecho.toString("utf16le"));
    console.log("---");
    break;
  }
}
