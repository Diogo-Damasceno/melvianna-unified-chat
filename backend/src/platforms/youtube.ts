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
 * Adaptador REAL do YouTube (preparado, não ativo no MVP).
 *
 * Mecanismo oficial recomendado:
 *  - Chat ao vivo: YouTube Data API v3 -> liveChatMessages.list (polling) com
 *    OAuth (youtube.readonly / youtube.force-ssl) ou API key (limitado).
 *  - Eventos (novos membros, super chats, subs): mesmos endpoints +
 *    liveChatMessages (mensagens de evento).
 *  - Envio: liveChatMessages.insert (requer OAuth do canal).
 *
 * LIMITAÇÕES CONHECIDAS:
 *  - A API de chat ao vivo é POLLING (não push); há quota (10k unidades/dia;
 *    cada list custa ~1 unidade, caro em longas live sessions).
 *  - Emotes do YouTube não são expostos via API de chat; só texto.
 *  - Moderação via API é restrita e muitas ações exigem ser dono/mod do canal.
 *  - Requer OAuth do canal (não apenas API key) para ler chat de canal próprio.
 *
 * Stub: implementa PlatformAdapter e permanece inativo sem credenciais.
 */
export class YouTubeAdapter implements PlatformAdapter {
  readonly platform: Platform = "youtube";
  private opts: AdapterOptions;
  private state: ConnectionState = "idle";
  private since = new Date().toISOString();
  private msgCb: ((m: UnifiedMessage) => void) | null = null;
  private statusCb: ((s: ConnectionStatus) => void) | null = null;

  /** Envia uma mensagem normalizada para os inscritos (usado pela impl. de polling). */
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
      this.setState("disconnected", "YouTube desabilitado");
      return;
    }
    if (!env.YOUTUBE_CHANNEL_ID) {
      this.setState(
        "error",
        "YouTube inativa: YOUTUBE_CHANNEL_ID ausente. Implementação de polling liveChatMessages prevista pós-MVP.",
      );
      logger.warn("[youtube] adaptador inativo por falta de canal (esperado no MVP)");
      return;
    }
    this.setState("connecting");
    this.setState("error", "YouTube adapter: polling liveChatMessages pendente (pós-MVP).");
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
    if (!env.YOUTUBE_OAUTH_TOKEN) throw new Error("YouTube: sem OAuth para enviar.");
    // TODO(fase bot): liveChatMessages.insert
  }
  async moderate(_action: ModerationAction): Promise<void> {
    throw new Error("YouTube: moderação via API restrita; implementar pós-MVP com OAuth do canal.");
  }
  async refreshCredentials(): Promise<void> {
    logger.debug("[youtube] refreshCredentials: no-op (OAuth refresh pendente)");
  }
}
