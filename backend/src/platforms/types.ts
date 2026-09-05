import type { Platform, UnifiedMessage } from "../chat/types.js";

/** Estados possíveis de uma conexão de plataforma. */
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface ConnectionStatus {
  platform: Platform;
  state: ConnectionState;
  /** Detalhe/erro legível, quando houver (sem segredos). */
  detail?: string;
  /** ISO do último evento de mudança de estado. */
  since: string;
}

/**
 * Interface comum obrigatória para TODOS os adaptadores de plataforma.
 *
 * Cada plataforma (Twitch, YouTube, Kick) implementa esta mesma superfície,
 * de modo que o hub de chat e o painel não precisam conhecer detalhes de
 * implementação. A indisponibilidade de uma plataforma não afeta as outras,
 * pois cada adaptador gerencia seu próprio ciclo de conexão e reconexão.
 */
export interface PlatformAdapter {
  readonly platform: Platform;

  /** Conecta à plataforma (ou inicia o modo demo). */
  connect(): Promise<void>;

  /** Desconecta graciosamente. */
  disconnect(): Promise<void>;

  /** Força reconexão (usado após falhas ou comandos manuais). */
  reconnect(): Promise<void>;

  /** Inscreve um callback para receber mensagens normalizadas. */
  onMessage(cb: (msg: UnifiedMessage) => void): void;

  /** Inscreve um callback para mudanças de estado de conexão. */
  onStatusChange(cb: (status: ConnectionStatus) => void): void;

  /** Envia uma mensagem para o chat da plataforma (quando permitido). */
  sendMessage(channelId: string, text: string): Promise<void>;

  /**
   * Executa uma ação de moderação permitida pela plataforma.
   * Deve lançar erro claro se a plataforma não suportar a ação.
   */
  moderate(action: ModerationAction): Promise<void>;

  /** Estado atual da conexão. */
  getStatus(): ConnectionStatus;

  /**
   * Renova credenciais quando a plataforma suportar.
   * Adaptadores sem suporte devem ser no-op e documentar a limitação.
   */
  refreshCredentials(): Promise<void>;
}

export type ModerationActionType =
  | "timeout"
  | "ban"
  | "unban"
  | "deleteMessage"
  | "slowMode"
  | "emoteOnly"
  | "followersOnly";

export interface ModerationAction {
  type: ModerationActionType;
  channelId: string;
  /** Alvo (usuário) quando aplicável. */
  targetUserId?: string;
  targetUsername?: string;
  /** Duração em segundos (timeout, slowMode). */
  durationSeconds?: number;
  /** ID da mensagem (deleteMessage). */
  messageId?: string;
  reason?: string;
}

/** Opções base de configuração de um adaptador. */
export interface AdapterOptions {
  enabled: boolean;
  /** Canal/canal alvo (preenchido por env quando disponível). */
  channelId?: string;
  /** Liga logs detalhados. */
  debug?: boolean;
}
