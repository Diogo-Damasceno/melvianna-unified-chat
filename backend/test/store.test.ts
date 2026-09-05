import { describe, it, expect } from "vitest";
import { ChatStore } from "../src/chat/store.js";
import { normalizeMessage, type RawIncoming } from "../src/chat/normalize.js";
import type { Platform } from "../src/chat/types.js";

function mk(platform: Platform, user: string, msg: string): ReturnType<typeof normalizeMessage> {
  return normalizeMessage({
    platform,
    channelId: "c",
    userId: user,
    username: user,
    message: msg,
    timestamp: new Date(),
  } as RawIncoming);
}

describe("ChatStore", () => {
  it("mantém capacidade (buffer circular)", () => {
    const s = new ChatStore(3);
    for (let i = 0; i < 5; i++) s.add(mk("twitch", "u", `m${i}`));
    expect(s.size).toBe(3);
    expect(s.recent().map((m) => m.message)).toEqual(["m2", "m3", "m4"]);
  });

  it("filtra por plataforma", () => {
    const s = new ChatStore(10);
    s.add(mk("twitch", "a", "x"));
    s.add(mk("youtube", "b", "y"));
    expect(s.byPlatform("youtube")).toHaveLength(1);
  });

  it("busca por usuário e conteúdo (case-insensitive)", () => {
    const s = new ChatStore(10);
    s.add(mk("twitch", "Ana", "ola mundo"));
    expect(s.search("ana")).toHaveLength(1);
    expect(s.search("MUNDO")).toHaveLength(1);
    expect(s.search("zzz")).toHaveLength(0);
  });
});
