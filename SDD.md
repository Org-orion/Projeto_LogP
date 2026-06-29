# Software Design Document (SDD)
## LogP — Sistema Industrial de Controle de Produção
### Concrem Portas Premium

**Versão:** 1.0  
**Data:** 2026-05-28  
**Autor:** Equipe Concrem  

---

## 1. Visão Geral

O **LogP** é um sistema web de controle de produção industrial desenvolvido para a Concrem Portas Premium. Centraliza o monitoramento de produção de máquinas, controle de qualidade, gestão de certificações (FSC e Intertek), rastreabilidade de produtos e administração de usuários em uma única plataforma.

### 1.1 Objetivos

- Substituir registros manuais em papel por registro digital em tempo real
- Prover KPIs de produção diária por setor/máquina
- Controlar qualidade via gramatura, recebimento de insumos e não conformidades
- Gerenciar o processo de auditoria Intertek 2027 (8 setores, 89 documentos cada)
- Rastrear materiais com certificação FSC
- Controlar acesso por perfil de usuário

### 1.2 Escopo

| Módulo | Descrição |
|---|---|
| Produção | Registro e dashboard de produção por máquina |
| Qualidade | Gramatura, recebimento (RQ40) e não conformidades |
| Rastreabilidade | Rastreio de produto por nota fiscal |
| Pedidos | Gestão de pedidos |
| Metas | Metas de produção por setor |
| Certificações | FSC (material) e Intertek 2027 (auditoria) |
| Usuários | Gestão de contas e permissões |

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Client)                  │
│   React 18 + Next.js App Router + TanStack Query    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│               NEXT.JS SERVER (Edge/Node)             │
│     API Routes: /api/auth, /api/usuarios            │
│     Session: HMAC-SHA256 (HTTP-only cookie)         │
└────────┬──────────────────────────┬─────────────────┘
         │ Service Role Key          │ Anon Key
┌────────▼────────┐      ┌──────────▼──────────────────┐
│ Supabase MAIN   │      │ Supabase AUDIT / PEDIDOS     │
│ (produção,      │      │ (instâncias separadas para   │
│  qualidade,     │      │  auditorias e pedidos)       │
│  usuários, FSC) │      └──────────────────────────────┘
└─────────────────┘
```

### 2.2 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI | React | 18.3.1 |
| Linguagem | TypeScript | 5.x |
| Estilização | Tailwind CSS + Shadcn/ui | 3.4.17 |
| Banco de Dados | Supabase (PostgreSQL) | — |
| Autenticação | Sessão customizada (HMAC-SHA256) | — |
| Fetch/Cache | TanStack React Query | 5.83.0 |
| Gráficos | Recharts | 2.15.4 |
| Formulários | React Hook Form + Zod | — |
| PDF Export | jsPDF + jsPDF-AutoTable | — |
| Excel Export | XLSX | — |
| Animações | Framer Motion | — |
| Ícones | Lucide React | — |
| Build (dev) | Turbopack | — |

---

## 3. Estrutura de Diretórios

```
producao-concrem/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Entrada principal (Login → Dashboard)
│   │   ├── layout.tsx              # Root layout com Providers
│   │   ├── globals.css
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts  # POST: Autenticação com rate limiting
│   │       │   └── logout/route.ts # POST: Limpar cookie de sessão
│   │       └── usuarios/
│   │           ├── route.ts        # GET: listar | POST: criar
│   │           └── [id]/route.ts   # PUT: editar | DELETE: excluir
│   │
│   ├── views/                      # Telas completas
│   │   ├── Dashboard.tsx           # Layout principal com roteamento de seções
│   │   └── Login.tsx               # Tela de login com branding Concrem
│   │
│   ├── components/                 # Componentes React
│   │   ├── TopNav.tsx              # Barra de navegação superior
│   │   ├── HomePage.tsx            # Dashboard com KPIs e gráficos
│   │   ├── MaquinasPage.tsx        # Produção por máquina
│   │   ├── QualidadePage.tsx       # Controle de qualidade (3 abas)
│   │   ├── NaoConformidadesTab.tsx # Aba de não conformidades
│   │   ├── AuditoriasPage.tsx      # Auditoria Intertek 2027
│   │   ├── MaterialCertificadoPage.tsx # Material FSC certificado
│   │   ├── RastreabilidadePage.tsx # Rastreabilidade de produto
│   │   ├── PedidosPage.tsx         # Gestão de pedidos
│   │   ├── MetasPage.tsx           # Metas de produção
│   │   ├── UsuariosPage.tsx        # Gestão de usuários (admin)
│   │   ├── NotificationPanel.tsx   # Painel de alertas
│   │   ├── DoorKitAnimation.tsx    # Animação SVG do kit de porta
│   │   ├── ConnectionBadge.tsx     # Status de conexão com DB
│   │   └── ui/                     # Componentes Shadcn/ui
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useKpisDia.ts
│   │   ├── useProducaoDiaria.ts
│   │   ├── useProducaoGraficos.ts
│   │   ├── useEstatisticasProducao.ts
│   │   ├── useNcAlerts.ts
│   │   ├── useNfAlerts.ts
│   │   └── useUltimasNFs.ts
│   │
│   └── lib/                        # Utilitários e clientes
│       ├── supabase.ts             # Cliente público Supabase
│       ├── supabase-admin.ts       # Cliente service role (server-side)
│       ├── supabase-audit.ts       # Cliente instância de auditoria
│       ├── supabase-pedidos.ts     # Cliente instância de pedidos
│       ├── session.ts              # Encode/decode sessão HMAC
│       └── utils.ts                # cn() e helpers gerais
│
├── public/                         # Assets estáticos
├── next.config.ts                  # Config Next.js + security headers
├── tailwind.config.ts
├── components.json                 # Config Shadcn/ui
└── SDD.md                          # Este documento
```

---

## 4. Banco de Dados

### 4.1 Instâncias Supabase

O sistema usa **três instâncias Supabase** separadas para isolamento de domínio:

| Instância | Variável de Ambiente | Finalidade |
|---|---|---|
| Main | `NEXT_PUBLIC_SUPABASE_URL` | Produção, qualidade, usuários, FSC |
| Audit | `NEXT_PUBLIC_SUPABASE_AUDIT_URL` | Auditorias Intertek |
| Pedidos | `NEXT_PUBLIC_SUPABASE_PEDIDOS_URL` | Gestão de pedidos |

### 4.2 Schema Principal

#### `registros_producao`
Tabela central de produção. Cada linha representa uma entrada de produção por máquina.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| data | date | Data do registro |
| hora_inicial | time | Início do turno |
| hora_final | time | Fim do turno |
| maquina | text | Nome da máquina |
| produto | text | Produto fabricado |
| linha | text | Linha de produção |
| nucleo | text | Núcleo utilizado |
| padrao | text | Padrão de acabamento |
| largura_cm | numeric | Largura em cm |
| comprimento_cm | numeric | Comprimento em cm |
| espessura_mm | numeric | Espessura em mm |
| qtd_conforme | integer | Quantidade aprovada |
| qtd_nao_conforme_1..4 | integer | Contadores de NCs por tipo |
| nota_fiscal | text | Número da NF vinculada |

#### `usuarios`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| nome | text | Nome completo |
| email | text | Email único |
| senha | text | Hash bcrypt (rounds=12) |
| perfil | text | Administrador / Supervisor / Operador / Visualizador |
| paginas | jsonb | Array de seções autorizadas |

#### `gramatura_registros`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| data | date | Data da medição |
| maquina | text | Máquina avaliada |
| produto | text | Produto medido |
| gramatura | numeric | Valor em g/m² |
| observacao | text | Notas adicionais |

#### `material_certificado_fsc`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| created_at | timestamptz | Criação do registro |
| data_recebimento | date | Data de entrada do material |
| tipo_material | text | Papelão / Papel / MDF / Colmeia |
| fornecedor | text | Nome do fornecedor |
| quantidade | numeric | Quantidade recebida |
| unidade | text | Unidade de medida |
| numero_nota_fiscal | text | NF de entrada |
| codigo_rq | text | Código RQ do procedimento |
| imagem_nf_url | text | URL no Supabase Storage |
| numero_certificado_fsc | text | Número do certificado FSC |
| validade_certificado | date | Vencimento do certificado |
| operador | text | Responsável pelo lançamento |
| status | text | pendente / aprovado / reprovado |
| observacoes | text | Notas adicionais |

#### `auditorias` / `auditoria_setores` / `auditoria_documentos`

```
auditorias (1)
  └── auditoria_setores (8 setores)
        └── auditoria_documentos (89 documentos por setor)
```

| Status de Documento | Descrição |
|---|---|
| Pendente | Documento ainda não enviado |
| Enviado | Aguardando aprovação |
| Aprovado | Documento aceito |
| N/A | Não se aplica |

#### `produtos_catalog`
Catálogo de 186 produtos nas categorias: REVESTIMENTO, FITA DE BORDA, FILME, BORRACHA, EMBALAGEM, TINTA, COLA, MDF, BONDOOR, LIXA, RODAPE, TRILHO.

---

## 5. Autenticação e Autorização

### 5.1 Fluxo de Login

```
1. POST /api/auth/login { email, password }
2. Rate limit: 10 tentativas / IP / 15min
3. Busca usuário no Supabase pelo email
4. Verifica senha:
   - Hash bcrypt ($2...) → bcrypt.compare()
   - Texto plano (legado) → comparação direta + migração automática para bcrypt
5. Gera token de sessão (HMAC-SHA256)
6. Seta cookie HTTP-only (8h de validade)
7. Retorna objeto do usuário (sem senha)
```

### 5.2 Sessão

- **Formato:** `Base64URL(payload_JSON) + "." + HMAC-SHA256(payload, SESSION_SECRET)`
- **Cookie:** `auth_token`, HTTP-only, Secure (prod), SameSite=Lax, max-age=28800
- **Validação:** em cada API route via `lib/session.ts`

### 5.3 Perfis e Permissões

| Perfil | Capacidades |
|---|---|
| **Administrador** | Acesso total + gerenciar usuários |
| **Supervisor** | Acesso às seções definidas em `paginas` |
| **Operador** | Lançamento de produção e qualidade |
| **Visualizador** | Somente leitura |

A propriedade `paginas` no registro do usuário é um array JSON que lista exatamente quais seções do dashboard estão liberadas. O array `ALL_PAGES` em `UsuariosPage.tsx` é a fonte de verdade da lista completa — **deve ser atualizado sempre que uma nova página for adicionada**.

---

## 6. Módulos da Aplicação

### 6.1 Dashboard / HomePage

**Componente:** `src/components/HomePage.tsx`  
**Hooks:** `useKpisDia`, `useProducaoDiaria`, `useProducaoGraficos`, `useEstatisticasProducao`

KPIs exibidos em tempo real:

| KPI | Máquinas mapeadas |
|---|---|
| Portas Prensadas | Prensa Fria |
| Kits Embalados | Embalagem de Kit |
| Batentes Revestidos | Gaidzinski |
| Alizares Revestidos | Unesa |

Visualizações:
- 4 cards de insight (delta hoje vs. 30d, top máquina da semana, NCs do dia, semana atual vs. anterior)
- Gráfico de tendência 14 dias (AreaChart)
- Top 7 máquinas do mês (BarChart)
- Barras de progresso por máquina (produção do dia)

### 6.2 Máquinas

**Componente:** `src/components/MaquinasPage.tsx`

- Dashboard mensal com filtros de ano e mês
- Taxa de conformidade por máquina (%)
- Exportação para PDF e Excel

### 6.3 Qualidade

**Componente:** `src/components/QualidadePage.tsx`

Três abas:
1. **Gramatura** — medições de peso por máquina/produto
2. **Recebimento de Insumos (RQ40)** — inspeção de entrada de materiais
3. **Não Conformidades** — registro e acompanhamento de NCs com atribuição por máquina

### 6.4 Material Certificado FSC

**Componente:** `src/components/MaterialCertificadoPage.tsx`

- Cadastro de entrada de material com certificação FSC
- Upload de imagem da nota fiscal (Supabase Storage)
- Validação de certificado (número + validade)
- Workflow de status: Pendente → Aprovado / Reprovado

### 6.5 Auditorias Intertek 2027

**Componente:** `src/components/AuditoriasPage.tsx`

- 8 setores auditados, 89 documentos cada
- Upload de documentos com detecção de tipo (PDF, Word, Excel)
- Rastreamento de prazo com código de cores:
  - Vermelho: vencido
  - Laranja: urgente
  - Amarelo: ≤30 dias
  - Verde: dentro do prazo
- Barra de progresso por setor e dashboard global

### 6.6 Usuários

**Componente:** `src/components/UsuariosPage.tsx`  
**API:** `/api/usuarios` e `/api/usuarios/[id]`

- Listagem, criação, edição e exclusão de usuários
- Seletor de perfil com validação
- Reset de senha via hash bcrypt
- Somente acessível por Administradores

### 6.7 Notificações

**Componente:** `src/components/NotificationPanel.tsx`  
**Hooks:** `useNcAlerts`, `useNfAlerts`

- Alertas de NCs dos últimos 7 dias
- Alertas de NFs não vinculadas nos últimos 30 dias (comparação entre `registros_producao.nota_fiscal` e `material_certificado_fsc`)

---

## 7. Segurança

### 7.1 Headers HTTP (`next.config.ts`)

| Header | Valor |
|---|---|
| `X-Frame-Options` | DENY |
| `X-Content-Type-Options` | nosniff |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Strict-Transport-Security` | max-age=63072000; includeSubDomains; preload |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() |

### 7.2 Boas Práticas Implementadas

- Cookies `HttpOnly` + `Secure` — inacessíveis por JavaScript
- Hashing bcrypt com 12 rounds para senhas
- Rate limiting no endpoint de login (10/IP/15min)
- Chave de service role Supabase usada apenas server-side
- RLS (Row Level Security) habilitado nas tabelas Supabase

---

## 8. Variáveis de Ambiente

```bash
# Supabase Principal
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Somente servidor

# Supabase Auditoria
NEXT_PUBLIC_SUPABASE_AUDIT_URL=
NEXT_PUBLIC_SUPABASE_AUDIT_KEY=

# Supabase Pedidos
NEXT_PUBLIC_SUPABASE_PEDIDOS_URL=
NEXT_PUBLIC_SUPABASE_PEDIDOS_KEY=

# Segurança de Sessão
SESSION_SECRET=                     # String aleatória longa para HMAC
```

---

## 9. Build e Deploy

### 9.1 Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server com Webpack |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Validação ESLint |

### 9.2 Plataforma de Deploy

- **Vercel** (recomendado) — integração nativa com Next.js App Router
- Output: servidor standalone (`node .next/standalone/server.js`)
- Node.js 24 LTS

### 9.3 Testes

| Ferramenta | Tipo |
|---|---|
| Playwright | E2E |
| Vitest | Unitário |

---

## 10. Design e Identidade Visual

### 10.1 Paleta de Cores

| Nome | Hex | Uso |
|---|---|---|
| Verde Primário | `#1a5c35` | Brand, botões |
| Verde Claro | `#3da06a`, `#5dc287` | Acentos |
| Verde Escuro | `#0a3620`, `#08301c` | Header/TopNav |
| Fundo | `#f0f2f0` | Background geral |
| Card | `#ffffff` | Cards |
| Texto | `#0f1a14` | Corpo de texto |
| Erro | `#dc2626` | Alertas / NCs |

### 10.2 Tipografia

- **Sans:** Montserrat
- **Mono:** JetBrains Mono
- Scale responsivo via `clamp()`: 10px → 52px

### 10.3 Componentes Base

Shadcn/ui como base com customização via Tailwind: Button, Card, Input, Select, Dialog, Table, Popover, Badge, Tabs, Progress, Tooltip, Accordion.

---

## 11. Decisões de Design

| Decisão | Justificativa |
|---|---|
| Três instâncias Supabase | Isolamento de domínio e segurança entre módulos sensíveis |
| Sessão HMAC própria | Controle total sem dependência de bibliotecas de auth externas |
| TanStack Query | Cache inteligente e revalidação automática de dados de produção |
| Shadcn/ui | Componentes acessíveis e customizáveis sem lock-in de biblioteca |
| jsPDF + XLSX no cliente | Geração de relatórios sem servidor adicional |
| `ALL_PAGES` em UsuariosPage | Fonte de verdade centralizada para controle de acesso por página |

---

## 12. Manutenção

### 12.1 Adicionar Nova Página

1. Criar `src/components/NovaPagina.tsx`
2. Adicionar case no switch de seções em `Dashboard.tsx`
3. Adicionar item de menu em `TopNav.tsx`
4. **Obrigatório:** adicionar a nova chave no array `ALL_PAGES` em `UsuariosPage.tsx`

### 12.2 Adicionar Nova Máquina/Setor aos KPIs

1. Atualizar mapeamento em `useKpisDia.ts`
2. Verificar consistência com `useEstatisticasProducao.ts`

### 12.3 Migrações de Banco

Arquivos SQL de migração estão na raiz do projeto (`migrate_*.sql`). Executar via Supabase Dashboard ou CLI na ordem correta.
