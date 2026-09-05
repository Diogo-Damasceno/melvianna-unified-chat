import { env } from "../config/env.js";
import { logger } from "../logging.js";
import { DemoAdapter } from "./demo.js";
import { TwitchAdapter } from "./twitch.js";
import { YouTubeAdapter } from "./youtube.js";
import { KickAdapter } from "./kick.js";
import type { ConnectionStatus, PlatformAdapter } from "./types.js";
import type { Platform, UnifiedMessage } from "../chat/types.js";

export interface PlatformRegistry {
  get(platform: Platform): PlatformAdapter;
  all(): PlatformAdapter[];
  onMessage(cb: (m: UnifiedMessage) => void): void;
  onStatusChange(cb: (status: ConnectionStatus) => void): void;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}

/**
 * Cria e gerencia os adaptadores de plataforma.
 *
 * Regra de isolamento: cada adaptador roda independente. Se um falha (ex.:
 * Twitch sem credencial), os outros continuam operando. No modo DEMO_MODE,
 * usamos DemoAdapter para todas as plataformas, que SIMULA tráfego e falhas
 * sem enviar nada para canais reais.
 */
export function createRegistry(): PlatformRegistry {
  const adapters: Record<Platform, PlatformAdapter> = {
    twitch: env.DEMO_MODE
      ? new DemoAdapter("twitch", env.DEMO_CHANNEL_TWITCH, { enabled: true }, false)
      : new TwitchAdapter(env.DEMO_CHANNEL_TWITCH, {
          enabled: env.TWITCH_ENABLED,
          channelId: env.TWITCH_CHANNEL,
        }),
    youtube: env.DEMO_MODE
      ? new DemoAdapter("youtube", env.DEMO_CHANNEL_YOUTUBE, { enabled: true }, false)
      : new YouTubeAdapter(env.DEMO_CHANNEL_YOUTUBE, {
          enabled: env.YOUTUBE_ENABLED,
          channelId: env.YOUTUBE_CHANNEL_ID,
        }),
    kick: env.DEMO_MODE
      ? new DemoAdapter("kick", env.DEMO_CHANNEL_KICK, { enabled: true }, true)
      : new KickAdapter(env.DEMO_CHANNEL_KICK, {
          enabled: env.KICK_ENABLED,
          channelId: env.KICK_CHANNEL,
        }),
  };

  // Gera falha simulada apenas no Kick em demo para demonstrar isolamento.
  // (configurado acima via simulateFailure=true para kick)

  function get(platform: Platform): PlatformAdapter {
    return adapters[platform];
  }
  function all(): PlatformAdapter[] {
    return Object.values(adapters);
  }
  function onMessage(cb: (m: UnifiedMessage) => void): void {
    for (const a of all()) a.onMessage(cb);
  }
  function onStatusChange(cb: (s: ConnectionStatus) => void): void {
    for (const a of all()) a.onStatusChange(cb);
  }
  async function startAll(): Promise<void> {
    await Promise.allSettled(
      all().map(async (a) => {
        try {
          await a.connect();
        } catch (err) {
          logger.error(`[registry] falha ao conectar ${a.platform}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }
  async function stopAll(): Promise<void> {
    await Promise.allSettled(all().map((a) => a.disconnect()));
  }

  return { get, all, onMessage, onStatusChange, startAll, stopAll };
}

export type { PlatformRegistry as Registry };
