# Dias de amostragem ao finalizar a gravimetria

## Objetivo
Ao encerrar uma gravimetria, perguntar ao usuário **quantos dias de separação de materiais** foram considerados. Esse número (e não a quantidade de dias distintos das pesagens) será a base das previsões mensal e anual.

## O que muda

### 1. Banco de dados
Adicionar a coluna `sample_days` (inteiro, opcional) na tabela `gravimetrias`.

```sql
ALTER TABLE public.gravimetrias
  ADD COLUMN IF NOT EXISTS sample_days integer;
```

### 2. Encerrar gravimetria (`src/pages/Gravimetria.tsx`)
Substituir o atual `ConfirmDialog` do botão "Encerrar Gravimetria" por um diálogo dedicado contendo:
- Mensagem de confirmação
- Campo numérico obrigatório **"Dias de separação considerados"** (mín. 1)
- Botões Cancelar / Encerrar

Ao confirmar, salva `sample_days` e `ended_at` no mesmo update.

### 3. Permitir editar depois
No **Histórico** de gravimetrias, ao lado de "Ver detalhes" e do botão excluir, adicionar um ícone de lápis que abre um diálogo "Editar dias de amostragem" — útil caso a pessoa tenha digitado errado.

Também mostrar o valor atual ("X dias amostrados") na linha do histórico.

### 4. Novo cálculo de previsões
No card **"Resumo geral por categoria"** (parte inferior da página de Gravimetria) e na exportação XLSX:

- Hoje: `days = nº de datas distintas em todas as pesagens` → `dailyAvg = total / days` → `mensal = dailyAvg × 30`, `anual = dailyAvg × 365`.
- Novo: `days = soma de sample_days de todas as gravimetrias encerradas do cliente` (ignora gravimetrias em andamento ou sem o campo preenchido).
- Mesmas fórmulas de média diária × 30 / × 365.
- O card "Dias de separação amostrados" passa a refletir esse total e o rótulo muda para deixar claro que vem da informação do usuário.

### 5. Detalhes (`GravimetriaDetail.tsx`)
Exibir no cabeçalho da gravimetria o valor `sample_days` quando presente ("X dias de separação considerados") — sem alterar gráficos existentes, já que o detail não calcula projeções hoje.

## Observações
- Gravimetrias antigas ficarão com `sample_days = null`. Elas **não entram** no cálculo de previsões até que o admin edite e informe o valor (mostraremos um aviso no card quando nenhuma gravimetria tiver o campo preenchido).
- Se não houver nenhum `sample_days` informado, as previsões aparecem como "—" com instrução de preencher.
