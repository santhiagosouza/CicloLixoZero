// =========================================================================
// MÓDULO DE CÁLCULO DE PEGADA DE CARBONO (GHG PROTOCOL)
// =========================================================================

export interface CarbonMetrics {
  emissoesAterroKg: number;       // Cenário 01: Emissão se 100% fosse para aterro
  emissoesReciclagemKg: number;   // Cenário 02: Emissão real gerada pela reciclagem/compostagem
  emissoesEvitadasKg: number;     // Emissões evitadas acumuladas (Cenário 01 - Cenário 02)
  creditoCarbonoR$: number;       // Estimativa de crédito de carbono (R$)
  arvoresPoupadas: number;        // Árvores salvas equivalentes
  emissaoEnergiaKg: number;       // CO2eq do consumo de energia elétrica
  emissaoAguaKg: number;          // CO2eq do consumo de água
  emissaoTransporteAterroKg: number;    // CO2eq do frete até o aterro
  emissaoTransporteReciclagemKg: number;// CO2eq do frete até a reciclagem/cooperativa
  detalhePorMaterial: Record<string, number>; // Emissão evitada ou gerada por tipo de material
}

// Fatores de Emissão Padrão (Base GHG Protocol Brasil / IPCC)
export const FATORES_EMISSAO = {
  ATERRO_KG_CO2_PER_KG: 1.3357,       // kg CO2eq por kg de resíduo em aterro
  RECICLAGEM_KG_CO2_PER_KG: 0.4815,   // kg CO2eq por kg de resíduo reciclado/compostado
  ENERGIA_KG_CO2_PER_KWH: 0.96,       // kg CO2eq por kWh consumido
  AGUA_KG_CO2_PER_M3: 0.0035,         // kg CO2eq por m³ consumido
  TRANSPORTE_ATERRO_KG_CO2_PER_KM: 7.447,    // kg CO2eq por km rodado até aterro
  TRANSPORTE_RECICLAGEM_KG_CO2_PER_KM: 1.511,// kg CO2eq por km rodado até reciclagem
  VALOR_TONELADA_CARBONO_BRL: 26.50,  // Valor estimado R$ por tonelada de CO2eq evitado
  CO2_POR_ARVORE_KG: 8.40             // kg de CO2eq absorvidos por 1 árvore
};

/**
 * Calcula todas as métricas de carbono com base no volume de resíduos lançados e consumos logísticos.
 */
export function calcularPegadaCarbono(
  pesosPorCategoria: {
    organicoKg: number;
    reciclavelKg: number;
    especialKg: number;
    aterroKg: number;
    totalKg: number;
  },
  pesosPorMaterial: Record<string, number>,
  consumos: {
    energiaKwh: number;
    aguaM3: number;
    kmAterro: number;
    kmReciclagem: number;
  }
): CarbonMetrics {
  const { organicoKg, reciclavelKg, especialKg, aterroKg, totalKg } = pesosPorCategoria;
  
  // Total desviado de aterro (Reciclável + Orgânico Compostado)
  const pesoDesviadoKg = reciclavelKg + organicoKg + especialKg;

  // Cenário 01: Se todo o resíduo gerado fosse para o aterro sanitário
  const emissoesAterroKg = totalKg * FATORES_EMISSAO.ATERRO_KG_CO2_PER_KG;

  // Cenário 02: Emissão real considerando desvio para reciclagem/compostagem
  // O que vai para aterro emite taxa de aterro; o que é desviado emite taxa reduzida de reciclagem
  const emissoesReciclagemKg = 
    (aterroKg * FATORES_EMISSAO.ATERRO_KG_CO2_PER_KG) +
    (pesoDesviadoKg * FATORES_EMISSAO.RECICLAGEM_KG_CO2_PER_KG);

  // Emissões Evitadas = Cenário 01 - Cenário 02
  const emissoesEvitadasKg = Math.max(0, emissoesAterroKg - emissoesReciclagemKg);

  // Crédito de Carbono (R$)
  const toneladasEvitadas = emissoesEvitadasKg / 1000;
  const creditoCarbonoR$ = toneladasEvitadas * FATORES_EMISSAO.VALOR_TONELADA_CARBONO_BRL;

  // Árvores Poupadas (Equivalência)
  const arvoresPoupadas = Math.round(emissoesEvitadasKg / FATORES_EMISSAO.CO2_POR_ARVORE_KG);

  // Emissões de Consumo & Transporte
  const emissaoEnergiaKg = consumos.energiaKwh * FATORES_EMISSAO.ENERGIA_KG_CO2_PER_KWH;
  const emissaoAguaKg = consumos.aguaM3 * FATORES_EMISSAO.AGUA_KG_CO2_PER_M3;
  const emissaoTransporteAterroKg = consumos.kmAterro * FATORES_EMISSAO.TRANSPORTE_ATERRO_KG_CO2_PER_KM;
  const emissaoTransporteReciclagemKg = consumos.kmReciclagem * FATORES_EMISSAO.TRANSPORTE_RECICLAGEM_KG_CO2_PER_KM;

  // Detalhamento de Emissões por Material
  const detalhePorMaterial: Record<string, number> = {};
  Object.entries(pesosPorMaterial).forEach(([mat, kg]) => {
    // Proporção de emissão evitada por material
    detalhePorMaterial[mat] = kg * (FATORES_EMISSAO.ATERRO_KG_CO2_PER_KG - FATORES_EMISSAO.RECICLAGEM_KG_CO2_PER_KG);
  });

  return {
    emissoesAterroKg: Number(emissoesAterroKg.toFixed(1)),
    emissoesReciclagemKg: Number(emissoesReciclagemKg.toFixed(1)),
    emissoesEvitadasKg: Number(emissoesEvitadasKg.toFixed(1)),
    creditoCarbonoR$: Number(creditoCarbonoR$.toFixed(2)),
    arvoresPoupadas,
    emissaoEnergiaKg: Number(emissaoEnergiaKg.toFixed(1)),
    emissaoAguaKg: Number(emissaoAguaKg.toFixed(1)),
    emissaoTransporteAterroKg: Number(emissaoTransporteAterroKg.toFixed(1)),
    emissaoTransporteReciclagemKg: Number(emissaoTransporteReciclagemKg.toFixed(1)),
    detalhePorMaterial
  };
}
