import { createHash } from "node:crypto";
import type { Platform, UnifiedMessage } from "./types.js";

/**
 * Gera um id determinístico e estável para uma mensagem.
 * Usa os campos que identificam unicamente uma mensagem real, para que
 * reconexões/reatrasos não produzam ids diferentes para o mesmo conteúdo.
 */
export function makeMessageId(
  platform: Platform,
  channelId: string,
  userId: string,
  message: string,
  timestamp: string | number | Date,
): string {
  const ts =
    typeof timestamp === "object"
      ? timestamp.getTime()
      : typeof timestamp === "number"
        ? timestamp
        : Date.parse(timestamp);
  const raw = `${platform}:${channelId}:${userId}:${message}:${ts}`;
  return `${platform}_${createHash("sha1").update(raw).digest("hex").slice(0, 16)}`;
}

/**
 * Normaliza uma mensagem crua de uma plataforma para UnifiedMessage.
 * `raw` é o payload original da plataforma e é preservado em rawMetadata.
 */
export interface RawIncoming {
  platform: Platform;
  channelId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  badges?: UnifiedMessage["badges"];
  message: string;
  emotes?: UnifiedMessage["emotes"];
  timestamp?: string | number | Date;
  roles?: UnifiedMessage["roles"];
  eventType?: UnifiedMessage["eventType"];
  rawMetadata?: Record<string, unknown>;
}

export function normalizeMessage(raw: RawIncoming): UnifiedMessage {
  const ts = raw.timestamp ?? new Date();
  const timestamp =
    typeof ts === "object" ? ts.toISOString() : new Date(ts).toISOString();

  return {
    id: makeMessageId(raw.platform, raw.channelId, raw.userId, raw.message, timestamp),
    platform: raw.platform,
    channelId: raw.channelId,
    userId: raw.userId,
    username: raw.username,
    displayName: raw.displayName ?? raw.username,
    avatarUrl: raw.avatarUrl,
    badges: raw.badges ?? [],
    message: raw.message,
    emotes: raw.emotes ?? [],
    timestamp,
    roles: raw.roles ?? ["viewer"],
    eventType: raw.eventType ?? "message",
    rawMetadata: raw.rawMetadata ?? {},
  };
}
