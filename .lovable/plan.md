## Objetivo

Unificar a tabela "Relatório por Setor" com a seção "Detalhamento por setor": ao clicar em uma linha da tabela, o detalhamento daquele setor (categorias + subcategorias) abre logo abaixo, dentro da própria tabela.

## Mudanças (src/pages/GravimetriaDetail.tsx)

1. **Tornar as linhas clicáveis** na tabela "Relatório por Setor":
   - Adicionar `cursor-pointer hover:bg-muted/50` na `TableRow` do setor.
   - Adicionar um ícone chevron (▸ / ▾) na primeira coluna que rotaciona quando aberto.
   - Estado local `expandedSectors: Set<string>` controlando quais linhas estão abertas.
   - Toggle ao clicar na linha. Permitir múltiplos abertos (como o accordion atual).

2. **Renderizar linha de detalhamento** logo após a linha do setor quando expandida:
   - Uma `TableRow` extra com `<TableCell colSpan={allCats.length + 2}>` contendo o mesmo conteúdo que hoje está dentro de `AccordionContent` (cards por categoria com tabela de subcategorias, mostrando kg e % do setor).
   - Mostrar também o resumo "X kg · Y% do total" no cabeçalho da linha de detalhe para não perder a informação que estava no accordion.

3. **Remover** o bloco `<div>` de "Detalhamento por setor" inteiro (linhas 529-579) com o `Accordion`.

4. **Linha "Total geral"** continua no final, sem ser clicável.

## Detalhes técnicos

- Sem mudanças em dados, queries ou agregação (`sectorsAgg`, `allCats`, `total` permanecem iguais).
- Reaproveitar o JSX dos cards de categoria/subcategoria que já existe — só mover para dentro da `TableRow` expandida.
- Imports do `Accordion*` podem ser removidos se não forem usados em outros lugares do arquivo.
- Ícone chevron via `lucide-react` (`ChevronRight` com `rotate-90` quando aberto).

## Observações

- Comportamento de impressão: linhas expandidas continuam visíveis ao imprimir. Se quiser sempre imprimir tudo aberto, posso forçar `expandedSectors` = todos os setores durante print — me avise se quiser isso.
