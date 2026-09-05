// Tipos do frontend — espelham o modelo do backend (src/chat/types.ts).
export type Platform = "twitch" | "youtube" | "kick";

export type Role =
  | "owner"
  | "admin"
  | "moderator"
  | "subscriber"
  | "member"
  | "vip"
  | "viewer";

export interface Badge {
  id: string;
  label: string;
  iconUrl?: string;
}

export interface Emote {
  name: string;
  positions?: Array<[number, number]>;
  imageUrl?: string;
}

export type EventType =
  | "message"
  | "highlight"
  | "subscription"
  | "gift"
  | "raid"
  | "donation"
  | "member";

export interface UnifiedMessage {
  id: string;
  platform: Platform;
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  badges: Badge[];
  message: string;
  emotes: Emote[];
  timestamp: string;
  roles: Role[];
  eventType: EventType;
  rawMetadata: Record<string, unknown>;
}

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
  detail?: string;
  since: string;
}

export type WsFrame =
  | { type: "message"; payload: UnifiedMessage }
  | { type: "status"; payload: ConnectionStatus[] | ConnectionStatus }
  | { type: "history"; payload: UnifiedMessage[] }
  | { type: "info"; payload: unknown };
