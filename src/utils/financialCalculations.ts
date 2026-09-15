// =========================================================================
// MÓDULO DE CÁLCULO FINANCEIRO E ECONÔMICO DE RESÍDUOS
// =========================================================================

import { residuosFinanceiro } from '../data/residuosFinanceiro';

export interface FinancialMetrics {
  saldoEconomico: number;      // Saldo Econômico Total (R$) = Valor Material + Aterro Evitado
  valorMaterialTotal: number;  // Receita de venda dos materiais recicláveis/compostados (R$)
  aterroEvitadoTotal: number;  // Economia de custo de aterro evitado (R$)
  custoConsumoTotal: number;   // Custo operacional estimado de consumo (R$)
  valorLiquido: number;        // Valor Líquido (R$) = Saldo Econômico - Consumo Total
  valorPorMaterial: Record<string, number>; // Valor em R$ por cada tipo de material
}

/**
 * Calcula todas as métricas financeiras de resíduos com base nos pesos por tipo e na UF do cliente.
 */
export function calcularMetricasFinanceiras(
  ufCliente: string,
  pesosPorTipoNome: Record<string, number>, // ex: { "PET Transparente": 100, "Papelão": 200, "Composto Orgânico": 500 }
  pesosPorCategoria: {
    organicoKg: number;
    reciclavelKg: number;
    especialKg: number;
    aterroKg: number;
    totalKg: number;
  },
  consumoCustosR$?: number
): FinancialMetrics {
  const stateUF = (ufCliente || 'SP').toUpperCase() as keyof typeof residuosFinanceiro.precos;
  
  // Tabela de preços da UF do cliente (ou fallback para SP)
  const precosUF = residuosFinanceiro.precos[stateUF] || residuosFinanceiro.precos['SP'];
  const custoAterroKg = residuosFinanceiro.custo_rejeito[stateUF as keyof typeof residuosFinanceiro.custo_rejeito] || 0.44;

  let valorMaterialTotal = 0;
  const valorPorMaterial: Record<string, number> = {
    'ORGÂNICO': 0,
    'PLÁSTICO': 0,
    'PAPEL': 0,
    'METAL': 0,
    'VIDRO': 0
  };

  // Mapeamento de correspondência de tipos para categorias financeiras
  Object.entries(pesosPorTipoNome).forEach(([nomeTipo, pesoKg]) => {
    // Buscar preço unitário no objeto da UF
    let precoKg = precosUF[nomeTipo as keyof typeof precosUF];
    
    // Fallback de aproximação por palavras-chave se o nome exato não constar
    if (precoKg === undefined) {
      const lower = nomeTipo.toLowerCase();
      if (lower.includes('pet') || lower.includes('plástico') || lower.includes('pead') || lower.includes('pebd')) precoKg = precosUF['Plástico Misto'] || 1.5;
      else if (lower.includes('papel') || lower.includes('papelão') || lower.includes('caixa')) precoKg = precosUF['Papel Misto'] || 0.5;
      else if (lower.includes('vidro') || lower.includes('garrafa')) precoKg = precosUF['Vidro Misto'] || 0.25;
      else if (lower.includes('alumínio') || lower.includes('ferro') || lower.includes('metal') || lower.includes('lata')) precoKg = precosUF['Metal Misturado'] || 2.5;
      else if (lower.includes('orgânico') || lower.includes('compost') || lower.includes('comida') || lower.includes('restos')) precoKg = precosUF['Composto Orgânico'] || 0.8;
      else precoKg = 0.5; // Padrão genérico
    }

    const valorTotalItem = pesoKg * precoKg;
    valorMaterialTotal += valorTotalItem;

    // Agrupar por grandes grupos materiais
    const lowerName = nomeTipo.toLowerCase();
    if (lowerName.includes('orgânic') || lowerName.includes('compost') || lowerName.includes('alimento') || lowerName.includes('húmus') || lowerName.includes('biofert')) {
      valorPorMaterial['ORGÂNICO'] += valorTotalItem;
    } else if (lowerName.includes('plástic') || lowerName.includes('pet') || lowerName.includes('pead') || lowerName.includes('pebd') || lowerName.includes('pvc') || lowerName.includes('pp') || lowerName.includes('copo')) {
      valorPorMaterial['PLÁSTICO'] += valorTotalItem;
    } else if (lowerName.includes('papel') || lowerName.includes('jornal') || lowerName.includes('revista') || lowerName.includes('cartolina') || lowerName.includes('kraft')) {
      valorPorMaterial['PAPEL'] += valorTotalItem;
    } else if (lowerName.includes('metal') || lowerName.includes('ferro') || lowerName.includes('alumínio') || lowerName.includes('cobre') || lowerName.includes('latão') || lowerName.includes('chumbo')) {
      valorPorMaterial['METAL'] += valorTotalItem;
    } else if (lowerName.includes('vidro') || lowerName.includes('cacos') || lowerName.includes('garrafa')) {
      valorPorMaterial['VIDRO'] += valorTotalItem;
    }
  });

  // Aterro Evitado: Economia gerada pela quantidade de resíduos desviados do aterro (Orgânico + Reciclável + Especial)
  const kgDesviados = pesosPorCategoria.organicoKg + pesosPorCategoria.reciclavelKg + pesosPorCategoria.especialKg;
  const aterroEvitadoTotal = kgDesviados * custoAterroKg;

  // Saldo Econômico Total (R$)
  const saldoEconomico = valorMaterialTotal + aterroEvitadoTotal;

  // Custo de consumo operacional
  const custoConsumoTotal = consumoCustosR$ !== undefined ? consumoCustosR$ : (saldoEconomico * 0.093); // ~9.3% do saldo de consumo operacional se não informado

  // Valor Líquido (R$)
  const valorLiquido = saldoEconomico - custoConsumoTotal;

  // Arredondamento final das categorias
  Object.keys(valorPorMaterial).forEach(key => {
    valorPorMaterial[key] = Math.round(valorPorMaterial[key]);
  });

  return {
    saldoEconomico: Math.round(saldoEconomico),
    valorMaterialTotal: Math.round(valorMaterialTotal),
    aterroEvitadoTotal: Math.round(aterroEvitadoTotal),
    custoConsumoTotal: Math.round(custoConsumoTotal),
    valorLiquido: Math.round(valorLiquido),
    valorPorMaterial
  };
}
