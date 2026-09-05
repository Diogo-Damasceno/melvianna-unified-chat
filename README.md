# Chat Unificado — Guimarães Melvianna

Aplicação profissional que unifica o chat da **Twitch**, do **YouTube** e da **Kick** em
uma única interface, com bot multiplataforma e overlay para OBS. Este repositório é o
**MVP — Fase 1: Chat Unificado (modo demonstração)**, com arquitetura preparada para o
painel administrativo (Fase 2) e o bot próprio (Fase 3).

> **Status:** MVP funcional. O chat roda em **modo de demonstração** (simula as três
> plataformas, sem credenciais reais e **sem enviar mensagens para canais reais**).
> As integrações reais (Twitch IRC/EventSub, YouTube liveChatMessages, Kick WS) são
> stubs documentados, ativados apenas fora do `DEMO_MODE` e com credenciais.

## Por que modo demonstração?

Para validar toda a experiência (chat unificado, overlay OBS, reconexão, isolamento de
plataformas, deduplicação, filtros, busca, pausa) **sem depender de canais/tokens da
streamer**. Nada é inventado: canais, comandos e identidade visual reais são recebidos
posteriormente via variáveis de ambiente.

## Stack

- **Front-end:** React + TypeScript + Vite (SPA responsiva, tema escuro).
- **Back-end:** Node.js + TypeScript + Express + WebSocket (`ws`).
- **Tempo real:** WebSocket (hub único, rotas `/ws` e `/overlay/ws`).
- **Banco:** PostgreSQL (schema pronto para painel/bot; chat do MVP roda em memória).
- **Infra:** Docker Compose (postgres + backend + frontend/nginx).

## Estrutura de diretórios

```
melvianna-unified-chat/
├── docker-compose.yml
├── .env.example
├── README.md
├── docs/
│   ├── architecture.md
│   ├── integrations-limitations.md
│   └── streamelements-migration.md
├── backend/                # Node + TS
│   ├── src/
│   │   ├── config/          # carga/validação de env (zod)
│   │   ├── chat/           # tipos, normalize, dedup, store
│   │   ├── platforms/      # adapter pattern: demo, twitch, youtube, kick, registry
│   │   ├── ws/             # hub WebSocket (ChatHub)
│   │   ├── overlay/        # rotas do overlay OBS (token)
│   │   ├── middleware/     # rate limit, validação, token overlay
│   │   ├── db/             # cliente pg + migrations
│   │   └── index.ts        # bootstrap
│   └── test/               # unit + integration (vitest)
└── frontend/               # React + TS
    ├── src/
    │   ├── components/     # ChatView, MessageItem, ConnectionStatus, Filters, SearchBar
    │   ├── hooks/          # useChat (WS + reconexão)
    │   └── styles/theme.css
    └── test/
```

## Como executar (Docker Compose — recomendado)

```bash
# 1. copie e ajuste o ambiente (NUNCA commite o .env)
cp .env.example .env
# altere ao menos OVERLAY_TOKEN para um token longo e aleatório

# 2. suba tudo
docker compose up --build

# 3. acesse
#    Chat unificado:  http://localhost:5173
#    Overlay preview:  http://localhost:5173/overlay/preview?token=SEU_TOKEN
#    Overlay OBS:      http://localhost:5173/overlay?token=SEU_TOKEN
#    Health:           http://localhost:4000/health
```

O `docker-compose` sobe PostgreSQL, o back-end e o front-end (nginx). O front-end faz
proxy de `/ws`, `/overlay` e `/api` para o back-end.

## Como executar em desenvolvimento (sem Docker)

Pré-requisito: Node 22, PostgreSQL opcional (o chat demo não depende dele).

```bash
# Back-end
cd backend
npm install
cp ../.env.example .env   # ajuste OVERLAY_TOKEN
npm run dev               # http://localhost:4000

# Front-end (outro terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxy -> :4000)
```

## Testes, lint e build

```bash
# Back-end
cd backend && npm install
npm run typecheck && npm run lint && npm test && npm run build

# Front-end
cd frontend && npm install
npm run typecheck && npm run lint && npm test && npm run build
```

## Modelo de mensagem unificado

```ts
interface UnifiedMessage {
  id: string;            // id determinístico (dedup)
  platform: "twitch" | "youtube" | "kick";
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  badges: Badge[];
  message: string;
  emotes: Emote[];
  timestamp: string;    // ISO 8601
  roles: Role[];
  eventType: EventType; // message|highlight|subscription|gift|raid|donation|member
  rawMetadata: Record<string, unknown>; // dados crus preservados
}
```

## Segurança

- Tokens/credenciais **somente no back-end**, via variáveis de ambiente.
- `.env.example` sem valores reais; `.env` está no `.gitignore`.
- Logs estruturados **não** registram tokens/senhas (redação automática).
- Rate limiting por IP, validação de todas as entradas (`zod`/helpers).
- Overlay OBS protegido por token revogável (`OVERLAY_TOKEN`); separado do painel.
- CORS + headers seguros no back-end; nginx como reverse proxy em produção.

## Próximas fases

- **Fase 2 — Painel administrativo:** auth por papel (owner/admin/mod/viewer), comandos,
  filtros, cooldowns, logs de auditoria, export/import de config.
- **Fase 3 — Bot próprio:** comandos, respostas automáticas, aliases, timers, sorteios,
  contadores, moderação — com **ativação individual** e plano de migração do StreamElements
  (ver `docs/streamelements-migration.md`).

## Integrações reais — limitações

Ver `docs/integrations-limitations.md`. Resumo: Twitch exige IRC/EventSub + OAuth; YouTube
usa polling (quota limitada) e OAuth do canal; Kick tem API oficial jovem (WS de chat). O
modo demo NÃO usa nenhuma dessas — é simulação local.

## Convenções de commit

Commits como trabalho próprio da streamer/proprietário. Sem menções de IA. Sem segredos
versionados.
