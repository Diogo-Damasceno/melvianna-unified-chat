import express from "express";
import cors from "cors";
import { createServer } from "node:http";

import { env } from "./config/env.js";
import { logger } from "./logging.js";
import { createRegistry } from "./platforms/registry.js";
import { MessageDeduplicator } from "./chat/dedup.js";
import { ChatStore } from "./chat/store.js";
import { ChatHub } from "./ws/hub.js";
import { statusRouter, makeHealthRouter, rateLimit, validateSendBody } from "./middleware/index.js";
import { overlayRouter } from "./overlay/route.js";
import { pool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

async function main(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));
  app.use(rateLimit(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX));

  const registry = createRegistry();
  const dedup = new MessageDeduplicator();
  const store = new ChatStore(env.MAX_CHAT_HISTORY);

  // Migrations (opcional/tolerante): não bloqueia o chat demo se o Postgres
  // estiver indisponível. Em produção, garanta DB saudável antes do deploy.
  if (env.RUN_MIGRATIONS !== false) {
    try {
      await runMigrations();
    } catch (err) {
      logger.warn("Migrations não aplicadas (DB indisponível ou schema já aplicado)", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Health + status
  app.use(makeHealthRouter(registry, dedup, store));
  app.use("/api/status", statusRouter(registry));

  // Envio de mensagem (apenas demo-safe: adapters demo ignoram; reais exigem token)
  app.post("/api/send", (req, res) => {
    const body = validateSendBody(req.body);
    if (!body) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    // Roteia para a plataforma pelo prefixo do channelId (demo)
    const adapter = registry.all().find((a) => a.platform === body.channelId.split("_")[0]);
    if (!adapter) {
      res.status(404).json({ error: "platform_not_found" });
      return;
    }
    adapter.sendMessage(body.channelId, body.text).then(
      () => res.json({ ok: true }),
      (err: unknown) => {
        logger.error("[/api/send] erro", { error: err instanceof Error ? err.message : String(err) });
        res.status(502).json({ error: "send_failed", detail: err instanceof Error ? err.message : "unknown" });
      },
    );
  });

  const server = createServer(app);

  // Hub de WebSocket (UM único servidor, várias rotas)
  const hub = ChatHub.create(server, registry, store, dedup);
  hub.route("/ws", false);
  hub.route("/overlay/ws", true);

  // Overlay OBS
  app.use("/overlay", overlayRouter());

  server.listen(env.PORT, () => {
    logger.info(`Backend iniciado`, {
      port: env.PORT,
      demoMode: env.DEMO_MODE,
      env: env.NODE_ENV,
    });
  });

  // Inicia as plataformas (isoladas: falha de uma não derruba as outras)
  await registry.startAll();

  const shutdown = async (sig: string) => {
    logger.info(`Encerrando (${sig})`);
    await registry.stopAll();
    await pool.end().catch(() => {});
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Falha ao iniciar backend", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
