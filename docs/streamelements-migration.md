# Migração progressiva do StreamElements

A streamer usa o **StreamElements** hoje. Ele **continua funcionando** durante o
desenvolvimento e os testes iniciais. O novo bot **não** substitui nem altera o
StreamElements automaticamente.

## Princípio

Cada comando do novo bot tem uma flag `enabled` (individual). Enquanto o equivalente no
StreamElements estiver ativo, o novo comando fica **desativado**, evitando respostas
duplicadas. A migração é **progressiva e aprovada**.

## Passos (ordem obrigatória)

1. **Mapear** os comandos atuais do StreamElements.
   - Entrada pendente da streamer: lista de comandos existentes (nome, resposta, gatilho,
     permissões, cooldown).
   - Registrar em `docs/comandos_streamelements.md` (a criar quando recebido).
2. **Implementar equivalentes** no novo bot (`commands` no Postgres; Fase 3).
   - Manter `enabled=false` por padrão.
3. **Testar** os comandos desativados ou em ambiente controlado (ex.: `!comandos` testado
   via painel "testar sem publicar").
4. **Ativar individualmente** no novo bot (`enabled=true`) após validação.
5. **Desativar manualmente** o equivalente no StreamElements **somente após aprovação**
   da streamer (nunca automático).

## Exemplo de tabela de controle

| Comando      | No StreamElements? | Equivalente no bot | Bot ativo? | SE desativado? | Aprovado? |
|--------------|--------------------|--------------------|-----------|----------------|-----------|
| `!comandos`  | sim                | sim (seed)         | não       | não            | pendente  |
| `!social`    | sim                | sim (seed)         | não       | não            | pendente  |
| `!horario`   | sim                | sim (seed)         | não       | não            | pendente  |
| `!sorteio`   | sim                | sim (seed)         | não       | não            | pendente  |

> Os seeds em `backend/src/db/migrations/0002_demo_seed.sql` já criam esses comandos
> **desativados**, prontos para o fluxo acima.

## Dados pendentes da streamer

- Lista de comandos existentes no StreamElements.
- Funções adicionais solicitadas.
- Logotipo, cores, emojis e identidade visual.
- Lista de administradores e moderadores.
- Definição sobre o chat unificado ser somente interno ou também exibido na transmissão.
