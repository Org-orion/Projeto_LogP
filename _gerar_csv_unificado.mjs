// Gera CSV unificado de produtos + produtos_catalog
import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync(
  'C:\\Users\\PC012\\.claude\\projects\\c--dev-producao-concrem\\f69f0a65-bb8f-4b9e-9e50-361e0ee3f402\\tool-results\\b94bo0xta.txt',
  'utf8'
);

const lines = raw.split('\n').map(l => l.replace(/^\d+\t/, '').trim()).filter(Boolean);

const produtos = [];
const catalog = [];
let section = null;

for (const line of lines) {
  if (line.startsWith('=== PRODUTOS (')) { section = 'produtos'; continue; }
  if (line.startsWith('=== PRODUTOS_CATALOG (')) { section = 'catalog'; continue; }
  if (!line.startsWith('{')) continue;
  try {
    const obj = JSON.parse(line);
    if (section === 'produtos') produtos.push(obj);
    else if (section === 'catalog') catalog.push(obj);
  } catch {}
}

function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const headers = [
  'codigo', 'descricao', 'categoria', 'preco_unitario', 'ativo',
  'dim_largura', 'dim_comprimento', 'dim_espessura',
  'maquina_entrada', 'tipo_material',
  'origem', 'id_catalog'
];

const rows = [headers.join(',')];

// Produtos (já completos)
for (const p of produtos) {
  rows.push([
    esc(p.codigo),
    esc(p.descricao),
    esc(p.categoria),
    esc(p.preco_unitario),
    esc(p.ativo),
    esc(p.dim_largura),
    esc(p.dim_comprimento),
    esc(p.dim_espessura),
    esc(p.maquina_entrada),
    esc(p.tipo_material),
    'produtos',
    ''
  ].join(','));
}

// Catalog (colunas a preencher ficam vazias)
for (const c of catalog) {
  rows.push([
    '',                   // codigo — preencher
    esc(c.produto),
    esc(c.grupo),
    '',                   // preco_unitario — preencher
    'true',
    '',                   // dim_largura — preencher se aplicável
    '',                   // dim_comprimento
    '',                   // dim_espessura
    '',                   // maquina_entrada
    '',                   // tipo_material
    'catalog',
    esc(c.id)
  ].join(','));
}

writeFileSync('c:\\dev\\producao-concrem\\produtos_unificados.csv', rows.join('\n'), 'utf8');
console.log(`Gerado: ${produtos.length} produtos + ${catalog.length} catalog = ${rows.length - 1} linhas`);
