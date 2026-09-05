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
import type { Platform, Role, UnifiedMessage } from "../chat/types.js";

interface DemoUser {
  username: string;
  displayName: string;
  roles: Role[];
}

/**
 * Adaptador de DEMONSTRAÇÃO.
 *
 * Simula o tráfego de uma plataforma (Twitch, YouTube ou Kick) sem qualquer
 * credencial real e SEM enviar mensagens para canais reais.
 *
 * É o coração do MVP: permite validar o chat unificado, o overlay e a
 * infraestrutura de ponta a ponta antes de plugar integrações reais.
 *
 * O modo demo também simula falhas de conexão intermitentes para exercitar
 * o indicador de estado, a reconexão automática e o isolamento entre
 * plataformas.
 */

const DEMO_USERS: Record<Platform, DemoUser[]> = {
  twitch: [
    { username: "melvianna", displayName: "Melvianna", roles: ["owner"] },
    { username: "mod_ana", displayName: "Mod_Ana", roles: ["moderator"] },
    { username: "sub_bruno", displayName: "Sub_Bruno", roles: ["subscriber", "vip"] },
    { username: "viewer_lia", displayName: "viewer_lia", roles: ["viewer"] },
    { username: "bits_tom", displayName: "Bits_Tom", roles: ["subscriber"] },
  ],
  youtube: [
    { username: "melvianna_yt", displayName: "Melvianna", roles: ["owner"] },
    { username: "yt_mod", displayName: "YT_Mod", roles: ["moderator"] },
    { username: "yt_member", displayName: "YT_Member", roles: ["member"] },
    { username: "yt_guest", displayName: "yt_guest", roles: ["viewer"] },
  ],
  kick: [
    { username: "melvianna_k", displayName: "Melvianna", roles: ["owner"] },
    { username: "kick_mod", displayName: "Kick_Mod", roles: ["moderator"] },
    { username: "kick_sub", displayName: "Kick_Sub", roles: ["subscriber"] },
    { username: "kick_lurker", displayName: "kick_lurker", roles: ["viewer"] },
  ],
};

const DEMO_MESSAGES: string[] = [
  "Oi gente! Bem-vindos ao chat unificado!",
  "Esse bot vai ajudar demais na live Kappa",
  "Quem já segue a Melvianna aqui?",
  "PogChamp essa jogada foi insana",
  "Comando !comandos quando sai?",
  "Boa stream, tô amando a vibe",
  "LUL preciso melhorar meu aim",
  "Qual o setup da streamer?",
  "Doação recebida, obrigada! <3",
  "Partida tensa, vem virada",
  "Alguém sabe o horário de amanhã?",
  "Moderação on fire hoje",
];

const DEMO_EMOTES = ["Kappa", "PogChamp", "LUL", "monkaS", "5Head", "HeyGuys"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class DemoAdapter implements PlatformAdapter {
  readonly platform: Platform;
  private readonly channelId: string;
  private opts: AdapterOptions;
  private state: ConnectionState = "idle";
  private since = new Date().toISOString();
  private msgCb: ((m: UnifiedMessage) => void) | null = null;
  private statusCb: ((s: ConnectionStatus) => void) | null = null;
  private timer: NodeJS.Timeout | null = null;
  private failTimer: NodeJS.Timeout | null = null;
  private seq = 0;
  /** Simula falha de conexão após N mensagens (para testar reconexão/isolamento). */
  private readonly simulateFailure: boolean;

  constructor(
    platform: Platform,
    channelId: string,
    opts: AdapterOptions,
    simulateFailure = false,
  ) {
    this.platform = platform;
    this.channelId = channelId;
    this.opts = opts;
    this.simulateFailure = simulateFailure;
  }

  private setState(state: ConnectionState, detail?: string): void {
    this.state = state;
    this.since = new Date().toISOString();
    const status: ConnectionStatus = { platform: this.platform, state, since: this.since, detail };
    logger.info(`[demo:${this.platform}] estado=${state}`, { detail: detail ?? null });
    this.statusCb?.(status);
  }

  async connect(): Promise<void> {
    if (!this.opts.enabled) {
      this.setState("disconnected", "Adaptador desabilitado");
      return;
    }
    this.setState("connecting");
    // handshake simulado
    await new Promise((r) => setTimeout(r, 400));
    this.setState("connected");
    this.scheduleNext();
    // Simula uma queda depois de um tempo para exercitar reconexão + isolamento.
    if (this.simulateFailure) {
      this.failTimer = setTimeout(() => {
        this.setState("error", "Conexão demo perdida (simulado)");
        this.scheduleReconnect();
      }, 12_000);
    }
  }

  private scheduleNext(): void {
    const rate = env.DEMO_MESSAGE_RATE_MS;
    this.timer = setTimeout(() => {
      if (this.state === "connected") {
        this.emitRandomMessage();
        this.scheduleNext();
      }
    }, rate + Math.random() * rate);
  }

  private scheduleReconnect(): void {
    this.setState("reconnecting");
    this.timer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        this.setState("error", "Falha ao reconectar (demo)");
        this.scheduleReconnect();
      }
    }, 3_000);
  }

  private emitRandomMessage(): void {
    const user = pick(DEMO_USERS[this.platform]);
    const message = pick(DEMO_MESSAGES);
    const emote =
      Math.random() < 0.4 ? [{ name: pick(DEMO_EMOTES) }] : undefined;

    // Eventos especiais ocasionais
    const roll = Math.random();
    let eventType: RawIncoming["eventType"] = "message";
    let extra: RawIncoming["rawMetadata"] = {};
    if (roll > 0.93) {
      eventType = "subscription";
      extra = { tier: "Tier 1", months: 1 + Math.floor(Math.random() * 12) };
    } else if (roll > 0.88) {
      eventType = "donation";
      extra = {
        amount: 2 + Math.floor(Math.random() * 20),
        currency: this.platform === "youtube" ? "USD" : this.platform === "kick" ? "USD" : "BRL",
      };
    } else if (roll > 0.85) {
      eventType = "highlight";
    }

    const raw: RawIncoming = {
      platform: this.platform,
      channelId: this.channelId,
      userId: `${this.platform}_${user.username}`,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: `https://demo.melvianna.local/avatars/${this.platform}/${user.username}.png`,
      badges: user.roles.map((r) => ({ id: r, label: r })),
      message,
      emotes: emote ? (emote as RawIncoming["emotes"]) : [],
      roles: user.roles,
      eventType,
      rawMetadata: {
        demo: true,
        seq: this.seq++,
        ...extra,
      },
    };
    this.msgCb?.(normalizeMessage(raw));
  }

  async disconnect(): Promise<void> {
    this.timer?.close();
    this.failTimer?.close();
    this.timer = null;
    this.failTimer = null;
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

  /** No modo demo, NUNCA envia para canais reais — registra e retorna. */
  async sendMessage(_channelId: string, text: string): Promise<void> {
    logger.info(`[demo:${this.platform}] sendMessage ignorado (modo demo, sem canal real): ${text}`);
  }

  async moderate(_action: ModerationAction): Promise<void> {
    logger.info(`[demo:${this.platform}] moderate ignorado (modo demo)`);
  }

  getStatus(): ConnectionStatus {
    return { platform: this.platform, state: this.state, since: this.since };
  }

  async refreshCredentials(): Promise<void> {
    // Demo não possui credenciais.
    logger.debug(`[demo:${this.platform}] refreshCredentials: no-op`);
  }
}
