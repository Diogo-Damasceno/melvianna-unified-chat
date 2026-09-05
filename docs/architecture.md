# Arquitetura

## Visão geral

```
                ┌─────────────────────────────────────────────────────────┐
                │  Browser (React SPA)  —  Chat unificado + Overlay OBS    │
                │   /ws (chat)   /overlay (HTML+token)   /overlay/ws (WS) │
                └───────────────────────┬─────────────────────────────────┘
                                         │ HTTP / WS (nginx reverse proxy em prod)
                ┌────────────────────────▼────────────────────────────────┐
                │  Back-end (Node + TS + Express + ws)                      │
                │  ┌──────────────────────────────────────────────────┐    │
                │  │ ChatHub (1 WebSocketServer, rotas /ws,/overlay/ws)│    │
                │  └──────────────────────────────────────────────────┘    │
                │  ┌─────────────── Platform Registry ──────────────────┐  │
                │  │ DemoAdapter(twitch/youtube/kick)  [DEMO_MODE]      │  │
                │  │ TwitchAdapter | YouTubeAdapter | KickAdapter       │  │
                │  │ (stubs reais; ligam com credenciais, pós-MVP)       │  │
                │  └───────────────────────────────────────────────────┘  │
                │  normalize → dedup → ChatStore (memória) → WS clients    │
                │  overlay routes (token) · middleware (rate/validate)     │
                │  db/ (PostgreSQL: users, commands, filters, audit)        │
                └────────────────────────┬────────────────────────────────┘
                                         │ pg (pool)
                                   ┌─────▼─────┐
                                   │ PostgreSQL │  (schema pronto p/ painel+bot)
                                   └─────────────┘
```

## Princípios

1. **Adapter pattern.** Cada plataforma implementa `PlatformAdapter`
   (`connect/disconnect/reconnect/onMessage/onStatusChange/sendMessage/moderate/
   getStatus/refreshCredentials`). O hub e o painel não conhecem detalhes de implementação.
2. **Isolamento.** Falha de uma plataforma não derruba as outras. No demo, o Kick simula
   queda após ~12s para exercitar reconexão e o indicador de estado.
3. **Modo demonstração.** `DEMO_MODE=true` usa `DemoAdapter` para todas as plataformas.
   Simula tráfego, emotes, eventos (sub/doação/destaque) e falhas — **nunca envia para
   canais reais**.
4. **Normalização + preservação.** Tudo vira `UnifiedMessage`; dados crus ficam em
   `rawMetadata`.
5. **Deduplicação.** `MessageDeduplicator` evita mensagens repetidas em reconexões
   (janela de 10s, id determinístico).
6. **Overlay separado do painel.** Rota própria, token revogável, fundo transparente,
   sem expor credenciais/configurações privadas.
7. **Segurança por padrão.** Segredos só em env; logs redigem segredos; rate limit;
   validação de entradas; CORS; nginx em produção.

## Fluxo de uma mensagem (demo)

```
DemoAdapter.emitRandomMessage()
  → normalizeMessage()  (gera UnifiedMessage + id determinístico)
  → registry.onMessage
  → ChatHub: dedup.isUnique?  → não: descarta | sim: store.add + broadcast WS
  → clientes (chat / overlay) recebem {type:'message', payload}
```

## Estado de conexão

Cada adapter emite `ConnectionStatus` (idle/connecting/connected/reconnecting/
disconnected/error). O front-end mostra um indicador por plataforma e avisa quando
indisponível. Reconexão automática com backoff no cliente WS e nos adapters demo.

## Escalabilidade futura

- MVP é um processo (sem microsserviços). Compatível com k3s/Kubernetes via manifests
  opcionais (não obrigatório).
- Redis só se necessário (cooldowns/filas/eventos) — fora do MVP.
- O schema do Postgres já suporta painel e bot; migrations idempotentes.
