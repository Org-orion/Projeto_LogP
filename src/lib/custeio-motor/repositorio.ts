import { supabaseAdmin } from "@/lib/supabase-admin";
import type { DadosReferencia } from "./types";

// Dados de referência mudam raramente (só quando alguém edita preço/regra) —
// cache em memória do processo evita reconsultar tudo em cada cálculo.
// TTL curto o suficiente pra uma edição de preço aparecer em minutos, não dias.
const TTL_MS = 5 * 60 * 1000;
let cache: { dados: DadosReferencia; expiraEm: number } | null = null;

export async function carregarDadosReferencia(forcarRecarga = false): Promise<DadosReferencia> {
  if (!forcarRecarga && cache && cache.expiraEm > Date.now()) return cache.dados;

  const [
    regras, insumos, alizarPerfis, mapaRecobrimento, embalagem, ferragem,
    palletPorta, palletKit, pinturaGramaturas, overheadCategorias, overheadFatores,
    overheadExcecoes, consolidacaoExcecoes,
  ] = await Promise.all([
    supabaseAdmin.from("custeio_regras_consumo").select("*"),
    supabaseAdmin.from("custeio_insumos").select("*").eq("ativo", true),
    supabaseAdmin.from("custeio_param_alizar_perfis").select("*"),
    supabaseAdmin.from("custeio_param_mapa_recobrimento").select("*"),
    supabaseAdmin.from("custeio_param_embalagem").select("*"),
    supabaseAdmin.from("custeio_param_ferragem").select("*"),
    supabaseAdmin.from("custeio_param_pallet_porta").select("*"),
    supabaseAdmin.from("custeio_param_pallet_kit").select("*"),
    supabaseAdmin.from("custeio_param_pintura_gramaturas").select("*"),
    supabaseAdmin.from("custeio_overhead_categorias").select("*"),
    supabaseAdmin.from("custeio_overhead_fatores_componente").select("*"),
    supabaseAdmin.from("custeio_overhead_excecoes").select("*"),
    supabaseAdmin.from("custeio_consolidacao_excecoes").select("*").eq("ativo", true),
  ]);

  for (const [nome, resultado] of Object.entries({
    regras, insumos, alizarPerfis, mapaRecobrimento, embalagem, ferragem,
    palletPorta, palletKit, pinturaGramaturas, overheadCategorias, overheadFatores,
    overheadExcecoes, consolidacaoExcecoes,
  })) {
    if (resultado.error) throw new Error(`Erro ao carregar ${nome}: ${resultado.error.message}`);
  }

  const dados: DadosReferencia = {
    regras: regras.data ?? [],
    insumos: insumos.data ?? [],
    alizarPerfis: alizarPerfis.data ?? [],
    mapaRecobrimento: mapaRecobrimento.data ?? [],
    embalagem: embalagem.data ?? [],
    ferragem: ferragem.data ?? [],
    palletPorta: palletPorta.data ?? [],
    palletKit: palletKit.data ?? [],
    pinturaGramaturas: pinturaGramaturas.data ?? [],
    overheadCategorias: overheadCategorias.data ?? [],
    overheadFatores: overheadFatores.data ?? [],
    overheadExcecoes: overheadExcecoes.data ?? [],
    consolidacaoExcecoes: consolidacaoExcecoes.data ?? [],
  };

  cache = { dados, expiraEm: Date.now() + TTL_MS };
  return dados;
}
