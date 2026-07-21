// Paleta categórica validada (8 slots, colorblind-safe na ordem abaixo — não
// reordenar) + cores de status fixas, do skill de dataviz do projeto.
// Categorias de custo alocadas nos 8 slots; qualquer categoria fora dessa
// lista (ex.: Pallet, Borracha) cai em "Outros" (cinza neutro) — mantém o
// stacked bar em no máximo 8 séries coloridas + 1 bucket cinza.

export interface ThemeColor {
  light: string;
  dark: string;
}

export const CATEGORIA_COR_ORDEM: [string, ThemeColor][] = [
  ["MDF",             { light: "#2a78d6", dark: "#3987e5" }],
  ["Recobrimento",    { light: "#008300", dark: "#008300" }],
  ["Fita de Borda",   { light: "#e87ba4", dark: "#d55181" }],
  ["Cola",            { light: "#eda100", dark: "#c98500" }],
  ["Pintura",         { light: "#1baf7a", dark: "#199e70" }],
  ["Embalagem",       { light: "#eb6834", dark: "#d95926" }],
  ["Ferragem",        { light: "#4a3aa7", dark: "#9085e9" }],
  ["Custos Gerais",   { light: "#e34948", dark: "#e66767" }],
];

export const CATEGORIA_COR: Record<string, ThemeColor> = Object.fromEntries(CATEGORIA_COR_ORDEM);

export const OUTROS_LABEL = "Outros";
export const OUTROS_COR: ThemeColor = { light: "#898781", dark: "#898781" };

/** Categoria conhecida (um dos 8 slots) ou "Outros" — nunca gera uma 9ª cor. */
export function resolveCategoriaCor(nome: string): ThemeColor {
  return CATEGORIA_COR[nome] ?? OUTROS_COR;
}

export function isCategoriaConhecida(nome: string): boolean {
  return nome in CATEGORIA_COR;
}

// Status fixo — nunca reaproveitado como cor de série/categoria.
export const STATUS_COR: Record<"good" | "warning" | "serious" | "critical", ThemeColor> = {
  good:     { light: "#0ca30c", dark: "#0ca30c" },
  warning:  { light: "#fab219", dark: "#fab219" },
  serious:  { light: "#ec835a", dark: "#ec835a" },
  critical: { light: "#d03b3b", dark: "#d03b3b" },
};

export const IMPORT_STATUS_INFO: Record<string, { label: string; status: keyof typeof STATUS_COR }> = {
  processando: { label: "Processando", status: "warning" },
  concluido:   { label: "Concluído",   status: "good" },
  parcial:     { label: "Parcial",     status: "serious" },
  erro:        { label: "Erro",        status: "critical" },
};
