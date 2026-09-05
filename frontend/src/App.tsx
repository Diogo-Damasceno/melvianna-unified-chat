import { useMemo, useState } from "react";
import { useChat } from "./hooks/useChat";
import { ChatView } from "./components/ChatView";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { Filters } from "./components/Filters";
import { SearchBar } from "./components/SearchBar";
import type { Platform } from "./types";

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

const ALL_ON: Record<Platform, boolean> = { twitch: true, youtube: true, kick: true };

export default function App() {
  const [filter, setFilter] = useState<Record<Platform, boolean>>(ALL_ON);
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const { messages, statuses, connected, clear } = useChat({ url: WS_URL, paused, maxMessages: 400 });

  const toggle = (p: Platform) => setFilter((f) => ({ ...f, [p]: !f[p] }));

  const header = useMemo(
    () => (
      <header className="topbar">
        <div className="brand">
          <span className="logo">◆</span>
          <span>Chat Unificado — Guimarães Melvianna</span>
          <span className={`live ${connected ? "on" : "off"}`}>{connected ? "AO VIVO" : "OFFLINE"}</span>
        </div>
        <ConnectionStatus statuses={statuses} />
      </header>
    ),
    [statuses, connected],
  );

  return (
    <div className="app">
      {header}
      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} />
        <Filters active={filter} onToggle={toggle} />
        <div className="toolbar-actions">
          <button onClick={() => setPaused((p) => !p)} className={paused ? "btn active" : "btn"}>
            {paused ? "Retomar" : "Pausar"}
          </button>
          <button onClick={() => setAutoScroll((a) => !a)} className={autoScroll ? "btn active" : "btn"}>
            Auto-scroll {autoScroll ? "ON" : "OFF"}
          </button>
          <button onClick={clear} className="btn">
            Limpar
          </button>
        </div>
      </div>
      {paused ? <div className="pause-banner">⏸ Fluxo pausado para leitura</div> : null}
      <ChatView messages={messages} filter={filter} query={query} autoScroll={autoScroll} />
      <footer className="footer">
        <span>Modo demonstração (sem credenciais reais).</span>
      </footer>
    </div>
  );
}
