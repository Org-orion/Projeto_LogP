import { Parser } from "expr-eval";

// As regras vêm do banco em sintaxe "estilo SQL" (strings entre aspas simples,
// AND/OR/NOT maiúsculos, escape de aspas com '') — aqui convertemos pra
// sintaxe do expr-eval (aspas duplas, and/or/not minúsculos) sem tocar o
// conteúdo das strings.
function paraSintaxeExprEval(expressao: string): string {
  let resultado = "";
  let dentroDeString = false;
  let i = 0;
  while (i < expressao.length) {
    const c = expressao[i];
    if (dentroDeString) {
      if (c === "'") {
        if (expressao[i + 1] === "'") { resultado += "'"; i += 2; continue; }
        dentroDeString = false;
        resultado += '"';
        i++;
        continue;
      }
      resultado += c === '"' ? '\\"' : c;
      i++;
      continue;
    }
    if (c === "'") { dentroDeString = true; resultado += '"'; i++; continue; }
    // "=" isolado (comparação estilo SQL) -> "==" (expr-eval usa "=" pra
    // atribuição). Não toca em ==, !=, <=, >= já existentes.
    if (c === "=" && expressao[i - 1] !== "=" && expressao[i - 1] !== "!" && expressao[i - 1] !== "<" && expressao[i - 1] !== ">" && expressao[i + 1] !== "=") {
      resultado += "==";
      i++;
      continue;
    }
    resultado += c;
    i++;
  }
  // AND/OR/NOT como palavras isoladas (fora de string, já convertida acima)
  return resultado.replace(/\bAND\b/g, "and").replace(/\bOR\b/g, "or").replace(/\bNOT\b/g, "not");
}

const parser = new Parser();
parser.functions.IF = (condicao: unknown, seVerdadeiro: unknown, seFalso: unknown) =>
  condicao ? seVerdadeiro : seFalso;

export type Escopo = Record<string, string | number | boolean | null>;

const cacheExpressoes = new Map<string, ReturnType<Parser["parse"]>>();

function compilar(expressao: string) {
  const convertida = paraSintaxeExprEval(expressao);
  let compilada = cacheExpressoes.get(convertida);
  if (!compilada) {
    compilada = parser.parse(convertida);
    cacheExpressoes.set(convertida, compilada);
  }
  return compilada;
}

/** Avalia uma condição (campo `condicao`) — string vazia = sempre verdadeira. */
export function avaliarCondicao(condicao: string, escopo: Escopo): boolean {
  if (!condicao || !condicao.trim()) return true;
  const resultado = compilar(condicao).evaluate(escopo as Record<string, number>);
  return Boolean(resultado);
}

/** Avalia uma fórmula numérica (campo `formula`). */
export function avaliarFormula(formula: string, escopo: Escopo): number {
  const resultado = compilar(formula).evaluate(escopo as Record<string, number>);
  const numero = Number(resultado);
  if (!Number.isFinite(numero)) {
    throw new Error(`Fórmula "${formula}" não resultou em número finito (resultado: ${resultado})`);
  }
  return numero;
}

/** Substitui placeholders "{Var}" num nome de item pelo valor da variável no escopo. */
export function resolverPlaceholder(item: string, escopo: Escopo): string {
  return item.replace(/\{(\w+)\}/g, (_, nome: string) => {
    const valor = escopo[nome];
    if (valor === undefined || valor === null) {
      throw new Error(`Placeholder "{${nome}}" não encontrado no escopo pra resolver item "${item}"`);
    }
    return String(valor);
  });
}
