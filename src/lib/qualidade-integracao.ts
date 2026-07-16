// Integração de baixo risco entre páginas do módulo Qualidade: quem detecta um
// problema (Gramatura fora da faixa, Inspeção reprovada, etc.) grava um
// rascunho aqui e navega pra /qualidade/nao-conformidades; RncRelatoriosTab lê
// esse rascunho ao montar e abre o diálogo de "Novo RNC" pré-preenchido — sem
// nenhuma mudança no formulário/impressão existentes.

export const RASCUNHO_RNC_KEY = "qualidade_rnc_rascunho";

export interface RascunhoRnc {
  processo_cliente?: string;
  lote_numero_pedido?: string;
  reclamacao_descricao?: string;
  requisito?: string;
  familia_nc?: number;
  criticidade?: "baixa" | "media" | "alta" | "critica";
}

export function gerarNaoConformidade(router: { push: (href: string) => void }, rascunho: RascunhoRnc) {
  sessionStorage.setItem(RASCUNHO_RNC_KEY, JSON.stringify(rascunho));
  router.push("/qualidade/nao-conformidades");
}
