
# Ciclo Lixo Zero — Sistema de Gestão de Resíduos

Sistema multi-tenant para gestão de geração de resíduos por empresa, começando pelo módulo de **Gravimetria** (registro e análise de pesagens de resíduos por período).

## Backend — Supabase (conta externa)

Será necessário conectar a integração nativa do Supabase do Lovable apontando para o seu projeto Supabase externo "Ciclo Lixo Zero". Após aprovar o plano, será solicitada a conexão.

### Estrutura de dados

**Multi-tenant + papéis**
- `clients` — empresas clientes (nome, CNPJ, ativo)
- `profiles` — dados do usuário (vinculado a `auth.users`, `client_id`, nome)
- `app_role` enum: `master_admin`, `client_admin`, `client_user`
- `user_roles` — papéis por usuário (tabela separada, com função `has_role()` SECURITY DEFINER, para evitar recursão em RLS)

**Catálogos**
- `categories` — global, gerenciada apenas por master_admin (seed: Orgânico, Reciclável, Perigoso, Rejeito)
- `subcategories` — por cliente, gerenciada por client_admin (seed padrão por cliente novo: Alimento, Baterias, Eletrônicos, Lâmpadas, Metalizados, Óleo, Papel Branco), vinculada a uma categoria
- `sectors` — por cliente, gerenciada por client_admin

**Gravimetria**
- `gravimetrias` — `client_id`, `numero` (sequencial por cliente: Gravimetria 1, 2…), `started_at`, `ended_at` (null = em andamento), `started_by`
- `weighings` — pesagens: `gravimetria_id`, `data`, `sector_id`, `category_id`, `subcategory_id`, `peso_kg`, `created_by`

**RLS**
- Master admin: acesso total
- Client admin/user: apenas dados do próprio `client_id`
- Apenas client_admin pode gerenciar setores/subcategorias do seu cliente
- Apenas master_admin pode gerenciar categorias e clientes

## Autenticação

- Email + senha (auto-confirm ligado para facilitar testes)
- Tela de login única
- Master admin criado manualmente após primeiro signup (atribuição de role via SQL)
- Client admin convida usuários do seu cliente (cria conta + atribui role `client_user` ao mesmo `client_id`)

## Telas e fluxos

### 1. Login
Email/senha, redireciona conforme papel.

### 2. Painel Master Admin
- **Clientes**: criar/editar/desativar empresas; ao criar, definir o primeiro client_admin (email + senha temporária)
- **Categorias globais**: CRUD das 4 categorias
- **Visão geral**: lista de gravimetrias de todos os clientes (somente leitura)

### 3. Painel Cliente (admin e usuário)
Sidebar com: Gravimetria, Setores, Subcategorias, Usuários (só admin), Relatórios.

**Gravimetria (tela principal)**
- Cabeçalho com botão grande **"Iniciar Gravimetria"** (desabilitado se já houver uma em andamento) e **"Encerrar Gravimetria"** quando ativa
- Card destacando a gravimetria ativa: número, data/hora de início, total acumulado (kg), nº de pesagens
- Formulário de **Nova Pesagem** (visível só com gravimetria ativa):
  - Data (default: hoje)
  - Setor (select)
  - Categoria (select)
  - Subcategoria (select filtrado pela categoria)
  - Peso (kg, numérico com 3 decimais)
  - Botão "Registrar pesagem"
- Tabela de pesagens da gravimetria ativa (data, setor, categoria, subcategoria, peso, ação remover)
- Histórico: lista de gravimetrias encerradas (número, período, total kg) com link para detalhes

**Detalhe da Gravimetria**
- Resumo: período, total kg, nº pesagens
- Gráfico de pizza por categoria e barras por setor
- Tabela completa de pesagens, com filtros por setor/categoria
- Exportar CSV

**Setores** (client_admin): CRUD simples
**Subcategorias** (client_admin): CRUD, vinculando a uma categoria global
**Usuários** (client_admin): listar, criar (email/senha/nome), remover usuários do mesmo cliente

### 4. Relatórios (cliente)
Comparativo entre gravimetrias: evolução de geração total, por categoria e por setor.

## Design

- Tema claro, paleta sustentável: verde primário (#16a34a), neutros suaves, acentos em âmbar para alertas
- Layout com sidebar fixa + topbar (nome do cliente + usuário + logout)
- Componentes shadcn já presentes (Card, Table, Dialog, Form, Select, Tabs, Badge)
- Indicador visual claro de "Gravimetria em andamento" (badge pulsante verde)

## Escopo desta primeira entrega

1. Conexão com Supabase externo + schema completo + RLS + seeds
2. Auth + papéis + multi-tenant
3. CRUDs: clientes (master), categorias (master), setores e subcategorias (client_admin), usuários (client_admin)
4. Módulo Gravimetria completo: iniciar/encerrar, registrar pesagens, listar ativa, histórico, detalhe com gráficos e export CSV

Após aprovação do plano, peço a conexão com seu Supabase externo e a criação do primeiro master_admin.
