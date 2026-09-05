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
 * Adaptador REAL da Kick (preparado, não ativo no MVP).
 *
 * Mecanismo oficial recomendado (Kick Developer API):
 *  - Chat: WebSocket público de chat da Kick (wss://ws.kick.com/chat) para o
 *    canal; requer chatroom_id + autenticação de bot (token de API do app).
 *  - Eventos: mensagens e alguns eventos chegam pelo WS; subs/bits via API.
 *  - Envio/moderação: endpoints REST da Kick (requer token com escopos).
 *
 * LIMITAÇÕES CONHECIDAS (importante documentar):
 *  - A API oficial da Kick é JOVEm e com cobertura parcial; alguns recursos
 *    (ex.: lista completa de emotes, moderação avançada) podem ser instáveis
 *    ou ausentes. Não usar scraping de endpoints privados/não documentados.
 *  - Sem token de bot/app, o WS conecta mas não envia/modera.
 *  - Kick não possui EventSub-equivalente tão maduro quanto Twitch.
 *
 * Stub: implementa PlatformAdapter e permanece inativo sem credenciais.
 */
export class KickAdapter implements PlatformAdapter {
  readonly platform: Platform = "kick";
  private opts: AdapterOptions;
  private state: ConnectionState = "idle";
  private since = new Date().toISOString();
  private msgCb: ((m: UnifiedMessage) => void) | null = null;
  private statusCb: ((s: ConnectionStatus) => void) | null = null;

  /** Envia uma mensagem normalizada para os inscritos (usado pela impl. de WS). */
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
      this.setState("disconnected", "Kick desabilitado");
      return;
    }
    if (!env.KICK_CHANNEL) {
      this.setState(
        "error",
        "Kick inativa: KICK_CHANNEL ausente. Implementação WS de chat prevista pós-MVP.",
      );
      logger.warn("[kick] adaptador inativo por falta de canal (esperado no MVP)");
      return;
    }
    this.setState("connecting");
    this.setState("error", "Kick adapter: WS de chat pendente (pós-MVP).");
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
    if (!env.KICK_CLIENT_ID) throw new Error("Kick: sem credenciais para enviar.");
    // TODO(fase bot): REST send message
  }
  async moderate(_action: ModerationAction): Promise<void> {
    throw new Error("Kick: moderação via API restrita; implementar pós-MVP com token de bot.");
  }
  async refreshCredentials(): Promise<void> {
    logger.debug("[kick] refreshCredentials: no-op (pendente)");
  }
}
