// Gera SQL de migração a partir de Tampos..csv
import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('C:\\dev\\producao-concrem\\Tampos.csv', 'utf8')
  .replace(/^﻿/, '');          // remove BOM

const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
const [header, ...rows] = lines;

// codigo;descricao;dim_comprimento;dim_largura;dim_espessura;categoria
function parseRow(line) {
  const [codigo, descricao, dim_comprimento, dim_largura, dim_espessura, categoria] = line.split(';');
  return {
    codigo:        codigo?.trim()  || null,
    descricao:     descricao?.trim(),
    comprimento:   parseFloat(dim_comprimento) || null,
    largura:       parseFloat(dim_largura)     || null,
    espessura:     parseFloat(dim_espessura)   || null,
    categoria:     categoria?.trim() || 'TAMPO_SC',
  };
}

function tipoMaterial(descricao) {
  return descricao.toUpperCase().includes('SUPER') ? 'MDF Hidro' : 'MDF Comum';
}

// Gera código determinístico para linhas sem código:
// T{comprimento}x{largura*10 sem decimal}{'C'|'S'}
// Ex: TAMPO 205X51.5X3.0MM COMUM → T205x515C
function gerarCodigo(r) {
  const tipo  = r.descricao.toUpperCase().includes('SUPER') ? 'S' : 'C';
  const larg  = Math.round(r.largura * 10);  // 51.5 → 515, 60 → 600
  return `T${r.comprimento}x${larg}${tipo}`;
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

const parsed = rows.map(parseRow).filter(r => r.descricao);

const updates = [];
const inserts = [];

for (const r of parsed) {
  const codigo      = r.codigo ?? gerarCodigo(r);
  const tipo        = tipoMaterial(r.descricao);

  if (r.codigo) {
    // Atualiza registro existente com comprimento e tipo_material
    const codigoNum = r.codigo.replace('.', '');  // "5.631" → "5631"
    updates.push(
      `UPDATE produtos SET descricao=${esc(r.descricao)}, dim_comprimento=${esc(r.comprimento)}, ` +
      `dim_largura=${esc(r.largura)}, dim_espessura=${esc(r.espessura)}, ` +
      `tipo_material=${esc(tipo)}, maquina_entrada='Seccionadora' ` +
      `WHERE codigo=${esc(codigoNum)};`
    );
  } else {
    inserts.push(
      `(${esc(codigo)}, ${esc(r.descricao)}, ${esc(r.categoria)}, 0, true, ` +
      `${esc(r.largura)}, ${esc(r.comprimento)}, ${esc(r.espessura)}, ` +
      `'Seccionadora', ${esc(tipo)})`
    );
  }
}

const sql = `-- ============================================================
-- Tampos: atualiza existentes + insere novos
-- ${updates.length} updates  |  ${inserts.length} inserts
-- ============================================================

-- 1. Atualiza os tampos que já têm código (adiciona dim_comprimento)
${updates.join('\n')}

-- 2. Insere tampos novos (sem código no cadastro original)
INSERT INTO produtos
  (codigo, descricao, categoria, preco_unitario, ativo,
   dim_largura, dim_comprimento, dim_espessura,
   maquina_entrada, tipo_material)
VALUES
${inserts.join(',\n')}
ON CONFLICT (codigo) DO UPDATE SET
  descricao       = EXCLUDED.descricao,
  dim_comprimento = EXCLUDED.dim_comprimento,
  dim_largura     = EXCLUDED.dim_largura,
  dim_espessura   = EXCLUDED.dim_espessura,
  maquina_entrada = EXCLUDED.maquina_entrada,
  tipo_material   = EXCLUDED.tipo_material;

-- Confirma
SELECT COUNT(*) AS total_tampos FROM produtos WHERE categoria = 'TAMPO_SC';
`;

writeFileSync('c:\\dev\\producao-concrem\\migrate_tampos.sql', sql, 'utf8');
console.log(`Gerado: ${updates.length} updates + ${inserts.length} inserts`);
