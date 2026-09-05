import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import express from "express";
import { WebSocket } from "ws";
import { env } from "../src/config/env.js";
// Define modo demo + rate rápido ANTES de importar módulos que leem env no load.
process.env.DEMO_MODE = "true";
process.env.DEMO_MESSAGE_RATE_MS = "200";
process.env.PORT = "0";
process.env.OVERLAY_TOKEN = "test-overlay-token";
const TEST_PORT = 4123;
process.env.PORT = String(TEST_PORT);

async function buildServer() {
  const { createRegistry } = await import("../src/platforms/registry.js");
  const { MessageDeduplicator } = await import("../src/chat/dedup.js");
  const { ChatStore } = await import("../src/chat/store.js");
  const { ChatHub } = await import("../src/ws/hub.js");
  const { makeHealthRouter } = await import("../src/middleware/index.js");
  const { overlayRouter } = await import("../src/overlay/route.js");

  const app = express();
  const registry = createRegistry();
  const dedup = new MessageDeduplicator();
  const store = new ChatStore(50);
  app.use(makeHealthRouter(registry, dedup, store));
  const server = createServer(app);
  const hub = ChatHub.create(server, registry, store, dedup);
  hub.route("/ws", false);
  hub.route("/overlay/ws", true);
  app.use("/overlay", overlayRouter());
  await new Promise<void>((r) => server.listen(TEST_PORT, r));
  await registry.startAll();
  return { server, registry };
}

describe("integration: chat hub demo", () => {
  let server: ReturnType<typeof createServer>;
  let registry: Awaited<ReturnType<typeof buildServer>>["registry"];

  beforeAll(async () => {
    const built = await buildServer();
    server = built.server as any;
    registry = built.registry;
  });

  afterAll(async () => {
    await registry.stopAll();
    const s = server as any;
    s.closeAllConnections?.();
    s.close(() => {});
    // garante encerramento mesmo com timers do demo pendentes
    setTimeout(() => process.exit(0), 500);
  }, 15000);

  it("recebe mensagens normalizadas via WebSocket do modo demo", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`);
    const got: any[] = [];
    const done = new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("timeout esperando mensagem")), 4000);
      ws.on("message", (data) => {
        const obj = JSON.parse(data.toString());
        if (obj.type === "message") {
          got.push(obj.payload);
          if (got.length >= 1) {
            clearTimeout(to);
            resolve();
          }
        }
      });
      ws.on("error", reject);
    });
    await done;
    expect(got[0]).toHaveProperty("platform");
    expect(got[0]).toHaveProperty("id");
    expect(got[0]).toHaveProperty("username");
    expect(got[0]).toHaveProperty("message");
    expect(["twitch", "youtube", "kick"]).toContain(got[0].platform);
  }, 8000);

  it("health reporta plataformas e demoMode", async () => {
    const resp = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    const json = await resp.json();
    expect(json.status).toBe("ok");
    expect(json.demoMode).toBe(true);
    expect(Array.isArray(json.platforms)).toBe(true);
    expect(json.platforms.length).toBe(3);
  });

  it("overlay /ws exige token (fecha sem token)", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/overlay/ws`);
    const closed: number | null = await new Promise((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => resolve(-1));
    });
    expect(closed).toBe(4401);
  });

  it("overlay /ws aceita com token", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/overlay/ws?token=${env.OVERLAY_TOKEN}`);
    const opened = await new Promise<boolean>((resolve) => {
      ws.on("open", () => resolve(true));
      ws.on("close", () => resolve(false));
      ws.on("error", () => resolve(false));
    });
    expect(opened).toBe(true);
    ws.close();
  });
});
