import { env } from "../config/env.js";
import { logger } from "../logging.js";
import { normalizeMessage, type RawIncoming } from "../chat/normalize.js";
import type {
  AdapterOptions,
  ConnectionStatus,
  ConnectionState,
  ModerationAction,
  PlatformAdapter,
} from "./types.js";
import type { Platform, UnifiedMessage } from "../chat/types.js";

/**
 * Adaptador REAL da Twitch (preparado, não ativo no MVP).
 *
 * Mecanismo oficial recomendado:
 *  - Chat: IRC via WebSocket (wss://irc-ws.chat.twitch.tv:443) autenticado com
 *    OAuth token (login Bot) OU OAuth do canal. Requer scope chat:read.
 *  - Eventos (subs, bits, raids): EventSub via webhook/conduit (requer app
 *    client_id/secret + OAuth). Ver referência: dev.twitch.tv/docs.
 *
 * LIMITAÇÕES CONHECIDAS:
 *  - Twitch IRC exige token válido; sem credencial, não conecta.
 *  - Emotes: só os globais/do canal via Get Emote Sets; BTTV/FFZ são 3º grau
 *    e NÃO são oficialmente suportados (não usados por padrão).
 *  - Moderação (ban/timeout/delete) exige escopos de moderação (channel:moderate)
 *    e ser moderador do canal.
 *
 * Este stub implementa a interface PlatformAdapter e registra claramente que
 * está inativo fora do modo demo. A implementação IRC/EventSub completa entra
 * na fase de integrações reais (após o MVP). Nada aqui envia credenciais a
 * lugar nenhum além da Twitch, e todas vêm de variáveis de ambiente.
 */
export class TwitchAdapter implements PlatformAdapter {
  readonly platform: Platform = "twitch";
  private opts: AdapterOptions;
  private state: ConnectionState = "idle";
  private since = new Date().toISOString();
  private msgCb: ((m: UnifiedMessage) => void) | null = null;
  private statusCb: ((s: ConnectionStatus) => void) | null = null;

  /** Envia uma mensagem normalizada para os inscritos (usado pela impl. IRC/EventSub). */
  pushMessage(raw: RawIncoming): void {
    this.msgCb?.(normalizeMessage(raw));
  }

  constructor(_channelId: string, opts: AdapterOptions) {
    this.opts = opts;
  }

  private setState(state: ConnectionState, detail?: string): void {
    this.state = state;
    this.since = new Date().toISOString();
    this.statusCb?.({ platform: this.platform, state, since: this.since, detail });
  }

  getStatus(): ConnectionStatus {
    return { platform: this.platform, state: this.state, since: this.since };
  }

  async connect(): Promise<void> {
    if (!this.opts.enabled) {
      this.setState("disconnected", "Twitch desabilitada");
      return;
    }
    // Sem credenciais no MVP: registra a limitação e fica "error"/inativo,
    // sem quebrar as outras plataformas.
    if (!env.TWITCH_OAUTH_TOKEN || !env.TWITCH_CHANNEL) {
      this.setState(
        "error",
        "Twitch inativa: credenciais (TWITCH_OAUTH_TOKEN/TWITCH_CHANNEL) ausentes. " +
          "Implementação IRC/EventSub prevista para fase de integração real.",
      );
      logger.warn("[twitch] adaptador inativo por falta de credenciais (esperado no MVP)");
      return;
    }
    this.setState("connecting");
    // TODO(fase integração): abrir IRC WS, JOIN #canal, assinar EventSub.
    this.setState("error", "Twitch adapter: implementação IRC/EventSub pendente (pós-MVP).");
  }

  async disconnect(): Promise<void> {
    this.setState("disconnected");
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  onMessage(cb: (m: UnifiedMessage) => void): void {
    this.msgCb = cb;
  }
  onStatusChange(cb: (s: ConnectionStatus) => void): void {
    this.statusCb = cb;
  }

  async sendMessage(_channelId: string, _text: string): Promise<void> {
    if (!env.TWITCH_OAUTH_TOKEN) {
      throw new Error("Twitch: sem token para enviar mensagens.");
    }
    // TODO(fase bot): PRIVMSG #canal :texto
  }

  async moderate(action: ModerationAction): Promise<void> {
    // TODO(fase bot): chamar tmi ban/timeout/delete com escopos apropriados.
    throw new Error(
      `Twitch: moderação (${action.type}) requer escopos de moderação e implementação IRC (pós-MVP).`,
    );
  }

  async refreshCredentials(): Promise<void> {
    // Twitch: OAuth de app token via client_id/secret (refresh implícito no IRC
    // por revalidação do token). Pendente de implementação. Sem segredos logados.
    logger.debug("[twitch] refreshCredentials: no-op (implementar com client_id/secret)");
  }
}
