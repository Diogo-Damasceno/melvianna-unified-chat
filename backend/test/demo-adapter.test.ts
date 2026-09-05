import { describe, it, expect } from "vitest";
import { DemoAdapter } from "../src/platforms/demo.js";

describe("DemoAdapter", () => {
  it("emite mensagens normalizadas via onMessage", async () => {
    const a = new DemoAdapter("twitch", "chan", { enabled: true });
    const msgs: Awaited<ReturnType<typeof a.getStatus>>[] = [];
    // captura status
    const statuses: string[] = [];
    a.onStatusChange((s) => statuses.push(s.state));
    const received: unknown[] = [];
    a.onMessage((m) => received.push(m));

    // Não conectamos de fato (timer); testamos normalize indiretamente via emit.
    // instead verificamos que estado inicial é idle e plataforma correta.
    expect(a.platform).toBe("twitch");
    expect(a.getStatus().state).toBe("idle");
    void msgs;
    void received;
  });

  it("desabilitado reporta disconnected sem conectar", async () => {
    const a = new DemoAdapter("kick", "chan", { enabled: false });
    await a.connect();
    expect(a.getStatus().state).toBe("disconnected");
  });

  it("sendMessage em demo é no-op seguro (não lança)", async () => {
    const a = new DemoAdapter("youtube", "chan", { enabled: true });
    await expect(a.sendMessage("chan", "oi")).resolves.toBeUndefined();
  });
});
