import { describe, it, expect } from "vitest";
import { validateSendBody, requireOverlayToken } from "../src/middleware/index.js";
import { env } from "../src/config/env.js";
import express from "express";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

function makeReqRes(token?: string) {
  const req: any = { query: token ? { token } : {}, headers: {}, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
  const res: any = { statusCode: 0, body: undefined, status(c: number) { this.statusCode = c; return this; }, json(b: unknown) { this.body = b; return this; } };
  return { req, res };
}

describe("validateSendBody", () => {
  it("aceita corpo válido", () => {
    expect(validateSendBody({ channelId: "twitch_c", text: "oi" })).toEqual({ channelId: "twitch_c", text: "oi" });
  });
  it("rejeita texto vazio", () => {
    expect(validateSendBody({ channelId: "c", text: "" })).toBeNull();
  });
  it("rejeita texto > 500", () => {
    expect(validateSendBody({ channelId: "c", text: "x".repeat(501) })).toBeNull();
  });
  it("rejeita tipo errado", () => {
    expect(validateSendBody({ channelId: 1, text: "x" })).toBeNull();
    expect(validateSendBody(null)).toBeNull();
  });
});

describe("requireOverlayToken", () => {
  it("bloqueia sem token", () => {
    const { req, res } = makeReqRes();
    let nexted = false;
    requireOverlayToken(req, res, () => { nexted = true; });
    expect(res.statusCode).toBe(401);
    expect(nexted).toBe(false);
  });
  it("permite com token correto", () => {
    const { req, res } = makeReqRes(env.OVERLAY_TOKEN);
    let nexted = false;
    requireOverlayToken(req, res, () => { nexted = true; });
    expect(nexted).toBe(true);
  });
});

describe("rateLimit + health endpoint (smoke)", () => {
  it("health responde com status ok", async () => {
    const app = express();
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    const server = createServer(app);
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;
    const resp = await fetch(`http://127.0.0.1:${port}/health`);
    const json = await resp.json();
    expect(json.status).toBe("ok");
    server.close();
  });
});
