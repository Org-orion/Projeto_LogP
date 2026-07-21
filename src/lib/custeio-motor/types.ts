// Tipos do motor de cálculo de custeio — espelham supabase_custeio_motor.sql.

export type Componente = "porta" | "batente" | "alizar" | "kit";
export type TipoValor = "fixo" | "formula" | "lookup";

export interface RegraConsumo {
  id: string;
  componente: Componente;
  categoria: string;
  item: string;
  ordem: number;
  condicao: string;
  tipo_valor: TipoValor;
  valor_fixo: number | null;
  formula: string | null;
  lookup_tabela: string | null;
  lookup_chave: string | null;
  lookup_coluna: string | null;
  unidade: string | null;
  observacao: string;
}

export interface Insumo {
  id: string;
  tipo: string;
  produto: string;
  chave: string;
  unidade: string;
  preco_atual: number;
  preco_anterior: number | null;
  ativo: boolean;
}

export interface AlizarPerfil {
  espessura_mm: number;
  perfil: string;
  vista_cm: number;
  regulagem_cm: number;
  coef_x_berneck: number | null;
}

export interface MapaRecobrimento {
  recobrimento: string;
  tipo: string; // Melamínico | PET
  fita_de_borda: string;
  borracha: string;
}

export interface ParamEmbalagem {
  componente: string;
  item: string;
  unidade: string;
  quantidade: number;
}

export interface ParamFerragem {
  item_custeio: string;
  descricao_compra: string;
  quantidade_por_kit: number;
  valor_unit_referencia: number | null;
}

export interface ParamPalletPorta {
  chave: string;
  custo_por_folha_referencia: number | null;
  volume_madeira_m3: number | null;
  quantidade_por_folha: number | null;
}

export interface ParamPalletKit {
  chave: string;
  volume_madeira_m3: number | null;
  quantidade_por_unidade: number | null;
}

export interface ParamPinturaGramatura {
  linha: string;
  pintura: string;
  item: string;
  gramatura_g_m2: number;
}

export interface OverheadCategoria {
  categoria: string;
  percentual_faturamento: number;
  escala_padrao: "sim" | "nao" | "parcial";
}

export interface OverheadFatorComponente {
  perfil: string;
  fator: number;
}

export interface OverheadExcecao {
  componente: Componente;
  categoria: string; // nome da categoria ou 'TODAS'
  tipo_excecao: "sem_fator" | "multiplicador_condicional" | "zerado" | "multiplicador_fora_padrao";
  condicao: string;
  valor: number | null;
}

export interface ConsolidacaoExcecao {
  descricao: string;
  componente_origem: Componente;
  item: string;
  condicao: string;
  efeito: "excluir" | "incluir_parcial";
  valor_ajuste: number | null;
  ativo: boolean;
}

// Dados de referência completos, carregados uma vez por cálculo (repositorio.ts)
export interface DadosReferencia {
  regras: RegraConsumo[];
  insumos: Insumo[];
  alizarPerfis: AlizarPerfil[];
  mapaRecobrimento: MapaRecobrimento[];
  embalagem: ParamEmbalagem[];
  ferragem: ParamFerragem[];
  palletPorta: ParamPalletPorta[];
  palletKit: ParamPalletKit[];
  pinturaGramaturas: ParamPinturaGramatura[];
  overheadCategorias: OverheadCategoria[];
  overheadFatores: OverheadFatorComponente[];
  overheadExcecoes: OverheadExcecao[];
  consolidacaoExcecoes: ConsolidacaoExcecao[];
}

// Configuração de entrada (o que o usuário escolhe na tela/pedido)
export interface ConfiguracaoCusteio {
  modelo: "ESSENZIALE" | "INNOVAZIONE" | "SOFISTICATO";
  larguraPorta: number; // cm
  alturaPorta: number; // m
  enchimento: "Colméia" | "3" | "6" | "Sólido";
  recobrimento: string | null; // nome do recobrimento (ou null se pintada)
  pintura: string | null; // nome da pintura (ou null se recoberta)
  larguraBatente: number; // cm
  espessuraAlizar: 9 | 15;
  perfilAlizar: string;
  fechadura: string | null;
  dobradica: string | null;
  tipoTrava: "MDF" | "Eucalipto";
  pallet: "Sim" | "Não";
  montagem: "Sim" | "Não";
  usinagem: "Sim" | "Não";
  frizo: "Sim" | "Não";
}

// Item de custo calculado — mesmo formato de 03_exemplo_validado.csv
export interface ItemCusto {
  categoria: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  custo: number;
  percentual: number; // preenchido depois, em relação ao total do componente
}

// Valores derivados da configuração (não afetam cálculo, só exibição — igual
// ao bloco "Informações" que a planilha original mostra no topo de cada aba).
export interface InformacoesDerivadas {
  linha: string;
  padrao: string;
  acabamento: string;
  tipoRecobrimento: string;
  fitaBorda: string;
  borracha: string;
}

export interface ResultadoComponente {
  componente: Componente;
  itens: ItemCusto[];
  custoDireto: number;
  custoOverhead: number;
  custoTotal: number;
  overheadDetalhe: { categoria: string; percentualEfetivo: number; valor: number }[];
}
