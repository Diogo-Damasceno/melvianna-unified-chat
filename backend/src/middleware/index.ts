import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import type { PlatformRegistry } from "../platforms/registry.js";
import { MessageDeduplicator } from "../chat/dedup.js";
import { ChatStore } from "../chat/store.js";
import { logger } from "../logging.js";

/**
 * Middleware simples de rate limiting por IP (janela deslizante em memória).
 * Suficiente para o MVP; em produção usar Redis/edge. Não registra segredos.
 */
export function rateLimit(
  windowMs: number,
  max: number,
): (req: Request, res: Response, next: () => void) => void {
  const hits = new Map<string, number[]>();
  return (req, res, next) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const arr = (hits.get(ip) ?? []).filter((t) => t > now - windowMs);
    if (arr.length >= max) {
      res.status(429).json({ error: "rate_limited", retryAfterMs: windowMs });
      return;
    }
    arr.push(now);
    hits.set(ip, arr);
    next();
  };
}

/** Validação de token de overlay (revogável via OVERLAY_TOKEN no env). */
export function requireOverlayToken(req: Request, res: Response, next: () => void): void {
  const token =
    (req.query.token as string | undefined) ??
    (req.headers["x-overlay-token"] as string | undefined) ??
    undefined;
  if (token !== env.OVERLAY_TOKEN) {
    logger.warn("[overlay] token inválido/ausente", { ip: req.ip });
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function statusRouter(registry: PlatformRegistry): Router {
  const r = Router();
  r.get("/", (_req, res) => {
    res.json({
      demoMode: env.DEMO_MODE,
      platforms: registry.all().map((a) => a.getStatus()),
    });
  });
  return r;
}

export function makeHealthRouter(
  registry: PlatformRegistry,
  dedup: MessageDeduplicator,
  store: ChatStore,
): Router {
  const r = Router();
  r.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      demoMode: env.DEMO_MODE,
      uptime: process.uptime(),
      platforms: registry.all().map((a) => a.getStatus()),
      chatBuffered: store.size,
      dedupTracked: dedup.size,
    });
  });
  return r;
}

/** Validação central de entrada (evita injeção no sendMessage). */
export function validateSendBody(body: unknown): { channelId: string; text: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.channelId !== "string" || typeof b.text !== "string") return null;
  if (b.text.length === 0 || b.text.length > 500) return null;
  return { channelId: b.channelId.slice(0, 100), text: b.text };
}
