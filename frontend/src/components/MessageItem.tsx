import type { UnifiedMessage } from "../types";

const PLATFORM_LABEL: Record<string, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
};

const EVENT_BADGE: Record<string, string> = {
  subscription: "INSCRIÇÃO",
  donation: "DOAÇÃO",
  gift: "PRESENTE",
  raid: "RAID",
  highlight: "DESTAQUE",
  member: "MEMBRO",
};

export function MessageItem({ msg }: { msg: UnifiedMessage }) {
  const isEvent = msg.eventType !== "message";
  return (
    <div className={`msg ${isEvent ? "msg-event" : ""}`} data-platform={msg.platform}>
      <span className={`badge-platform p-${msg.platform}`} title={PLATFORM_LABEL[msg.platform]}>
        {msg.platform}
      </span>
      {msg.avatarUrl ? (
        <img className="avatar" src={msg.avatarUrl} alt="" width={22} height={22} />
      ) : null}
      <span className="user">
        {msg.displayName}
        {msg.badges.length > 0 ? (
          <span className="badges">
            {msg.badges.map((b) => (
              <span key={b.id} className="role-badge" title={b.label}>
                {b.label}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="text">{msg.message}</span>
      {isEvent ? (
        <span className="event-tag">{EVENT_BADGE[msg.eventType] ?? msg.eventType}</span>
      ) : null}
      <span className="time" title={msg.timestamp}>
        {new Date(msg.timestamp).toLocaleTimeString("pt-BR")}
      </span>
    </div>
  );
}
