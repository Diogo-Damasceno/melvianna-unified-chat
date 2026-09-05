// Modelo de dados unificado do chat multiplataforma.
// Toda mensagem que entra no sistema é normalizada para este formato,
// preservando os dados originais em `rawMetadata` (sem perda de informação).

export type Platform = "twitch" | "youtube" | "kick";

export type Role = "owner" | "admin" | "moderator" | "subscriber" | "member" | "vip" | "viewer";

export interface Badge {
  /** Identificador estável do badge (ex.: "subscriber", "mod", "founder"). */
  id: string;
  /** Rótulo legível (ex.: "Mod", "Sub 12"). */
  label: string;
  /** URL do ícone, quando a plataforma fornecer. */
  iconUrl?: string;
}

export interface Emote {
  /** Texto original do emote no corpo da mensagem (ex.: "Kappa"). */
  name: string;
  /** Posições [inicio, fim) no conteúdo original, quando disponível. */
  positions?: Array<[number, number]>;
  /** URL da imagem do emote, quando disponível. */
  imageUrl?: string;
}

/**
 * Tipos de evento especiais além de mensagens de chat comuns.
 * - message: mensagem de chat normal
 * - highlight: mensagem destacada
 * - subscription: nova inscrição / sub
 * - gift: sub gift / doação de presente
 * - raid: raid de outro canal
 * - donation: doação (bits, estrelas, moedas)
 * - member: novo membro / join
 */
export type EventType =
  | "message"
  | "highlight"
  | "subscription"
  | "gift"
  | "raid"
  | "donation"
  | "member";

export interface UnifiedMessage {
  /** ID estável e único (gerado na normalização). */
  id: string;
  /** Plataforma de origem. */
  platform: Platform;
  /** Identificador do canal/canal de destino. */
  channelId: string;
  /** ID do usuário na plataforma. */
  userId: string;
  /** Nome de usuário (login, minúsculo quando aplicável). */
  username: string;
  /** Nome de exibição (display name com capitalização original). */
  displayName: string;
  /** URL do avatar, quando fornecido. */
  avatarUrl?: string;
  /** Badges/insígnias do usuário. */
  badges: Badge[];
  /** Conteúdo textual da mensagem (já normalizado). */
  message: string;
  /** Emotes detectados. */
  emotes: Emote[];
  /** Timestamp ISO 8601 do envio. */
  timestamp: string;
  /** Papéis/funções do usuário na plataforma. */
  roles: Role[];
  /** Tipo de evento. */
  eventType: EventType;
  /** Metadados crus da plataforma de origem (não normalizados). */
  rawMetadata: Record<string, unknown>;
}

export const PLATFORMS: Platform[] = ["twitch", "youtube", "kick"];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as string[]).includes(value);
}
