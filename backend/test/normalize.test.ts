import { describe, it, expect } from "vitest";
import { normalizeMessage, makeMessageId } from "../src/chat/normalize.js";
import type { RawIncoming } from "../src/chat/normalize.js";
import type { UnifiedMessage } from "../src/chat/types.js";

const base: RawIncoming = {
  platform: "twitch",
  channelId: "chan1",
  userId: "u1",
  username: "ana",
  message: "oi",
  timestamp: "2026-09-05T12:00:00.000Z",
};

describe("normalizeMessage", () => {
  it("gera id determinístico e estável", () => {
    const a = normalizeMessage(base);
    const b = normalizeMessage({ ...base });
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^twitch_/);
  });

  it("preserva rawMetadata e defaults", () => {
    const m: UnifiedMessage = normalizeMessage({ ...base, rawMetadata: { x: 1 } });
    expect(m.rawMetadata.x).toBe(1);
    expect(m.roles).toContain("viewer");
    expect(m.eventType).toBe("message");
    expect(m.displayName).toBe("ana");
  });

  it("usa displayName quando informado", () => {
    const m = normalizeMessage({ ...base, displayName: "Ana" });
    expect(m.displayName).toBe("Ana");
    expect(m.username).toBe("ana");
  });

  it("timestamp Date é convertido para ISO", () => {
    const d = new Date("2026-09-05T12:00:00.000Z");
    const m = normalizeMessage({ ...base, timestamp: d });
    expect(m.timestamp).toBe("2026-09-05T12:00:00.000Z");
  });
});

describe("makeMessageId", () => {
  it("mesmo conteúdo/tempo gera mesmo id", () => {
    const id1 = makeMessageId("twitch", "c", "u", "msg", 123);
    const id2 = makeMessageId("twitch", "c", "u", "msg", 123);
    expect(id1).toBe(id2);
  });
  it("conteúdo diferente gera id diferente", () => {
    const id1 = makeMessageId("twitch", "c", "u", "msg", 123);
    const id2 = makeMessageId("twitch", "c", "u", "outra", 123);
    expect(id1).not.toBe(id2);
  });
});
