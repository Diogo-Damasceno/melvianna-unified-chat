# Limitações das integrações reais

Este documento registra, com honestidade, o que cada plataforma **oficialmente** suporta
e onde há restrições. O MVP roda em **modo de demonstração** e NÃO depende dessas APIs.
As implementações reais são stubs (`src/platforms/{twitch,youtube,kick}.ts`) ativados fora
do `DEMO_MODE` e com credenciais de ambiente.

## Twitch

- **Mecanismo oficial recomendado**
  - Chat: **IRC via WebSocket** (`wss://irc-ws.chat.twitch.tv:443`), autenticado com
    OAuth (login do bot ou do canal). Scope `chat:read` para leitura.
  - Eventos (subs, bits, raids, seguidores): **EventSub** (webhook ou conduit), requer
    `client_id`/`client_secret` + OAuth.
- **Limitações**
  - IRC exige token válido; sem credencial não conecta.
  - Emotes: só globais/do canal via *Get Emote Sets*; BTTV/FFZ/7TV são 3º grau e **não**
    são oficialmente suportados (não usados por padrão).
  - Moderação (ban/timeout/delete) exige escopos de moderação e ser moderador do canal.
  - Rate limits do IRC (ex.: 20 mensagens/30s para contas não-verificadas).
- **Status no MVP:** stub documentado; ativação na Fase 3 (integração real).

## YouTube

- **Mecanismo oficial recomendado**
  - Chat ao vivo: **YouTube Data API v3** → `liveChatMessages.list` (**polling**, não
    push). Requer OAuth (`youtube.readonly`/`youtube.force-ssl`) ou API key (limitado).
  - Envio: `liveChatMessages.insert` (requer OAuth do canal).
  - Eventos (membros, super chats, inscrições): mesmos endpoints + mensagens de evento.
- **Limitações**
  - **Polling**, não push: há latência e consumo de quota (cada `list` ≈ 1 unidade;
    limite 10k unidades/dia — caro em lives longas). Backoff de polling obrigatório.
  - Emotes do YouTube **não** são expostos via API de chat (apenas texto).
  - Moderação via API é restrita; muitas ações exigem ser dono/mod do canal.
  - Exige OAuth do canal para ler o próprio chat ao vivo (API key não basta).
- **Status no MVP:** stub documentado; ativação na Fase 3.

## Kick

- **Mecanismo oficial recomendado**
  - Chat: **WebSocket público de chat** da Kick (`wss://ws.kick.com/chat`) para o canal;
    requer `chatroom_id` + autenticação de bot (token de API do app).
  - Envio/moderação: endpoints REST da Kick (requer token com escopos).
- **Limitações**
  - API oficial da Kick é **jovem** e com cobertura parcial; alguns recursos (lista
    completa de emotes, moderação avançada) podem ser instáveis ou ausentes.
  - **Não** usar scraping de endpoints privados/não documentados (viola termos).
  - Sem token de bot/app, o WS conecta mas não envia/modera.
  - Não há EventSub-equivalente tão maduro quanto o da Twitch.
- **Status no MVP:** stub documentado; ativação na Fase 3.

## StreamElements (atual)

- **Não será desativado/alterado automaticamente.** O novo bot terá cada comando com
  flag de ativação individual. Migração progressiva: mapear → implementar equivalente →
  testar em ambiente controlado → ativar → desativar o equivalente no StreamElements **só
  após aprovação** (ver `streamelements-migration.md`).

## Regras gerais de conformidade

- Usar **somente** APIs/SDKs oficiais e OAuth.
- **Nunca** scraping frágil, endpoints privados ou métodos que violem termos.
- Antes de enviar/moderar, checar permissões concedidas pela plataforma; se não suportado,
  indicar a limitação na UI e na documentação.
- Tokens no back-end; renovação/revogação suportadas onde a plataforma permitir.
