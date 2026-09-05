import { useEffect, useRef } from "react";
import type { UnifiedMessage, Platform } from "../types";
import { MessageItem } from "./MessageItem";

export function ChatView({
  messages,
  filter,
  query,
  autoScroll,
}: {
  messages: UnifiedMessage[];
  filter: Record<Platform, boolean>;
  query: string;
  autoScroll: boolean;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim().toLowerCase();
  const visible = messages.filter((m) => {
    if (!filter[m.platform]) return false;
    if (q) {
      return (
        m.username.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) || m.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, autoScroll]);

  return (
    <div className="chatview" ref={scrollRef}>
      {visible.length === 0 ? (
        <div className="empty">Nenhuma mensagem para os filtros atuais.</div>
      ) : (
        visible.map((m) => <MessageItem key={m.id} msg={m} />)
      )}
      <div ref={endRef} />
    </div>
  );
}
