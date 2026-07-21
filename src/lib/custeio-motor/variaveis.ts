import type { AlizarPerfil, ConfiguracaoCusteio, DadosReferencia, MapaRecobrimento } from "./types";
import type { Escopo } from "./expressao";

const LINHA_PRIMER = new Set(["FL100", "FL120", "FX120"]);

function buscarPerfil(dados: DadosReferencia, espessura: number, perfil: string): AlizarPerfil {
  const encontrado = dados.alizarPerfis.find((p) => p.espessura_mm === espessura && p.perfil === perfil);
  if (!encontrado) throw new Error(`Perfil de alizar não encontrado: espessura=${espessura}mm, perfil="${perfil}"`);
  return encontrado;
}

function buscarMapaRecobrimento(dados: DadosReferencia, recobrimento: string): MapaRecobrimento {
  const encontrado = dados.mapaRecobrimento.find((m) => m.recobrimento === recobrimento);
  if (!encontrado) throw new Error(`Recobrimento não encontrado no mapa: "${recobrimento}"`);
  return encontrado;
}

/** Monta o escopo completo de variáveis (config + derivadas) usado por
 * condicao/formula de todas as regras. Uma chamada por componente calculado,
 * já que Vista/Reg/CoefXBerneck só existem no contexto do Alizar. */
export function montarEscopo(config: ConfiguracaoCusteio, dados: DadosReferencia): Escopo {
  const L = config.larguraPorta;
  const A = config.alturaPorta;
  const Modelo = config.modelo;
  const Ench = config.enchimento;
  const Padrao = A > 2.1 || L > 110 ? "Fora do Padrão" : "Padrão";
  const Acabamento = config.pintura ? "Pintada" : "Recoberta";
  const Linha = config.recobrimento && LINHA_PRIMER.has(config.recobrimento) ? "Primer" : "Linha Principal";
  const e = Modelo === "SOFISTICATO" ? 0.04 : 0.03;

  const FitaM = Linha === "Primer" ? 4.4 : ((L / 100) + 0.03) * 2 + (A + 0.03) * 2;
  const AreaRec = ((L / 100) + 0.03) * (A * 1.005) * 2;

  const mapaRec = config.recobrimento ? buscarMapaRecobrimento(dados, config.recobrimento) : null;
  const Tipo = mapaRec?.tipo ?? "";
  const FitaBorda = mapaRec?.fita_de_borda ?? "";
  const Borracha = mapaRec?.borracha ?? "";

  const perfilAlizar = buscarPerfil(dados, config.espessuraAlizar, config.perfilAlizar);
  const Vista = perfilAlizar.vista_cm;
  const Reg = perfilAlizar.regulagem_cm;
  const CoefXBerneck = perfilAlizar.coef_x_berneck ?? 0;
  const Esp = config.espessuraAlizar;
  const Perfil = config.perfilAlizar;

  const AreaRecAlizar =
    (A + 0.13) * ((Vista + Reg + Esp / 10 + 1.5) / 100) * 2 +
    (A + 0.13) * ((Vista + Esp / 10 + 2 + 1.5) / 100) * 2 +
    ((L / 100) + 0.13) * ((Vista + Reg + Esp / 10 + 1.5) / 100) +
    ((L / 100) + 0.13) * ((Vista + Esp / 10 + 2 + 1.5) / 100) +
    (Perfil === "7x9Plus" ? ((L / 100) + 0.13) * 0.03 * 2 : 0);

  return {
    L, A, LB: config.larguraBatente, Esp, Vista, Reg, CoefXBerneck, Perfil,
    Modelo, Ench, Linha, Padrao, Acabamento, Tipo, FitaBorda, Borracha, e,
    FitaM, AreaRec, AreaRecAlizar,
    Recobrimento: config.recobrimento ?? "",
    Pintura: config.pintura ?? "",
    Fechadura: config.fechadura ?? "",
    Dobradica: config.dobradica ?? "",
    TipoTrava: config.tipoTrava,
    Pallet: config.pallet,
    Montagem: config.montagem,
    Usinagem: config.usinagem,
    Frizo: config.frizo,
  };
}
