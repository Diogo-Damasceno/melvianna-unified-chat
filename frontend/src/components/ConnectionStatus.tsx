import type { ConnectionStatus as Status, Platform } from "../types";

const STATE_LABEL: Record<string, string> = {
  idle: "Ocioso",
  connecting: "Conectando",
  connected: "Conectado",
  reconnecting: "Reconectando",
  disconnected: "Desconectado",
  error: "Indisponível",
};

const STATE_CLASS: Record<string, string> = {
  idle: "st-idle",
  connecting: "st-connecting",
  connected: "st-connected",
  reconnecting: "st-reconnecting",
  disconnected: "st-disconnected",
  error: "st-error",
};

export function ConnectionStatus({
  statuses,
}: {
  statuses: Record<string, Status>;
}) {
  const platforms: Platform[] = ["twitch", "youtube", "kick"];
  return (
    <div className="conn-row">
      {platforms.map((p) => {
        const s = statuses[p];
        const cls = s ? STATE_CLASS[s.state] : "st-idle";
        return (
          <div key={p} className={`conn ${cls}`} title={s?.detail ?? ""}>
            <span className="conn-dot" />
            <span className="conn-name">{p}</span>
            <span className="conn-state">{s ? STATE_LABEL[s.state] : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}
