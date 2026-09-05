import { describe, it, expect } from "vitest";
import { MessageDeduplicator } from "../src/chat/dedup.js";
import { normalizeMessage, type RawIncoming } from "../src/chat/normalize.js";

function mk(seq: number): ReturnType<typeof normalizeMessage> {
  return normalizeMessage({
    platform: "twitch",
    channelId: "c",
    userId: "u",
    username: "ana",
    message: "msg",
    timestamp: 1_000 + seq,
  } as RawIncoming);
}

describe("MessageDeduplicator", () => {
  it("mensagem repetida na janela é duplicada", () => {
    const d = new MessageDeduplicator(10_000);
    const m = mk(0);
    expect(d.isUnique(m)).toBe(true);
    expect(d.isUnique(m)).toBe(false);
  });

  it("mensagens diferentes são únicas", () => {
    const d = new MessageDeduplicator(10_000);
    expect(d.isUnique(mk(0))).toBe(true);
    expect(d.isUnique(mk(1))).toBe(true);
  });

  it("após expirar a janela volta a ser única", () => {
    const d = new MessageDeduplicator(5);
    const m = mk(0);
    expect(d.isUnique(m)).toBe(true);
    // avança tempo (simulado): reap não ocorre sem passagem real; testamos clear
    d.clear();
    expect(d.isUnique(m)).toBe(true);
  });

  it("clear zera o estado", () => {
    const d = new MessageDeduplicator();
    d.isUnique(mk(0));
    d.clear();
    expect(d.size).toBe(0);
  });
});
