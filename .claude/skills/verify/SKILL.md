---
name: verify
description: Como rodar/observar este app (Next.js) em runtime para verificação — não só build/typecheck.
---

# Verificar o app em runtime

## Servidor de dev
- `npm run dev` sobe em `http://localhost:3000` (webpack, não Turbopack — ver `package.json`).
- **Frequentemente já tem uma instância rodando** (o usuário testa no próprio navegador durante a sessão). Antes de subir uma nova, cheque: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`. Se responder 200, use essa — não mate o processo do usuário. Se você mesmo subir uma instância extra, o Next detecta a porta ocupada, sobe em 3001 e se desliga sozinho ("Another next dev server is already running") — não precisa `kill` manual depois.

## Login é bloqueado pra automação por script
- `/api/auth/login` exige um token do Cloudflare Turnstile (`TURNSTILE_SECRET_KEY` está configurado em `.env.local`), validado contra a API do Cloudflare. **Não dá pra logar via curl/fetch direto** — precisa de um navegador real resolvendo o widget.
- Sem um browser tool disponível na sessão, qualquer rota que exige `getSession()` (praticamente todas as páginas e API routes autenticadas) fica bloqueada pra verificação automatizada além de:
  - Confirmar que a rota responde 401/redirect sem sessão (prova que o gate de auth está no lugar e não crasha antes de checar).
  - Confirmar que o servidor sobe e serve a home (`/`) sem erro 500.
- **Se precisar verificar o fluxo autenticado de verdade**: peça pro usuário clicar através da UI ele mesmo (ele já costuma estar com o app aberto no navegador), ou peça as credenciais de um usuário de teste + desligue temporariamente o Turnstile em `.env.local` (`TURNSTILE_SECRET_KEY` vazio faz `/api/auth/login` pular a checagem — ver `verificarTurnstile` em `src/app/api/auth/login/route.ts`) — só faça isso com autorização explícita do usuário, é uma env var de produção.

## Lógica de negócio pesada (ex.: motor de custeio)
- Para módulos com cálculo server-side complexo (ex.: `src/lib/custeio-motor/`), a forma mais confiável de verificar SEM depender de login é rodar o módulo real (não uma reimplementação) via `npx tsx` direto contra o Supabase real, carregando `.env.local` manualmente (sem `dotenv`, não está instalado — parsear o arquivo à mão). O alias `@/` funciona com `tsx` desde que o comando rode com cwd na raiz do repo (ele lê o `tsconfig.json` local).
- Isso NÃO substitui bater na rota HTTP de verdade (o `getSession()`/`hasPageAccess` da API route não é exercitado), mas verifica a lógica que a rota chama por dentro — é o handle disponível quando o login está bloqueado.
