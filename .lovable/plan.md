## Objetivo

Mover a porcentagem para **dentro das fatias** do gráfico de pizza "Por Categoria" (como na imagem de referência), mantendo o nome + kg como rótulo externo.

## Mudanças (src/pages/GravimetriaDetail.tsx, gráfico "Por Categoria")

1. **Rótulo externo** do `Pie`: passa a mostrar apenas `Nome valor kg` (sem a %).
2. **Rótulo interno** (nova `Label` customizada renderizada dentro de cada fatia):
   - Calcula a posição no centro da fatia usando `midAngle`, `innerRadius` e `outerRadius` (padrão do Recharts).
   - Mostra `XX,X %` em negrito, branco, centralizado.
   - **Tratamento de fatias pequenas:** se `pct < 5%`, o texto interno é omitido (ficaria ilegível/sobreposto). Nesse caso a % continua visível no rótulo externo entre parênteses como fallback, ex.: `Resíduo 1,2 kg (1,2%)`.
3. Gráfico "Por Setor" (barras) permanece como está — a % no topo da barra já funciona bem ali.

## Resposta sobre a quebra

Sim, fatias muito pequenas quebram (texto sai da fatia ou sobrepõe vizinhos). O threshold de 5% com fallback para o rótulo externo resolve isso de forma limpa, sem precisar de linhas-guia extras.

## Observações

- Sem mudanças em dados, queries ou lógica de negócio. Apenas apresentação do `PieChart`.
- Sem novas dependências.