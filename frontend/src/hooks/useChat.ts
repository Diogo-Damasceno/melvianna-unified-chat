import { useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionStatus, UnifiedMessage, WsFrame } from "../types";

interface UseChatOptions {
  url: string;
  /** Pausa o fluxo (mantém buffer, não renderiza novas). */
  paused?: boolean;
  maxMessages?: number;
}

/**
 * Hook de chat via WebSocket.
 * - Reconecta automaticamente com backoff.
 * - Mantém histórico recente em memória.
 * - Expõe estado de conexão por plataforma.
 */
export function useChat({ url, paused = false, maxMessages = 300 }: UseChatOptions) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const applyStatus = useCallback((s: ConnectionStatus) => {
    setStatuses((prev) => ({ ...prev, [s.platform]: s }));
  }, []);

  useEffect(() => {
    let closedByUs = false;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
      };
      ws.onmessage = (ev) => {
        let frame: WsFrame;
        try {
          frame = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (frame.type === "message") {
          if (pausedRef.current) return; // pausa: descarta render mas mantém buffer? (aqui descarta render)
          setMessages((prev) => {
            const next = [...prev, frame.payload as UnifiedMessage];
            return next.length > maxMessages ? next.slice(-maxMessages) : next;
          });
        } else if (frame.type === "history") {
          setMessages(frame.payload as UnifiedMessage[]);
        } else if (frame.type === "status") {
          const p = frame.payload as ConnectionStatus[] | ConnectionStatus;
          if (Array.isArray(p)) p.forEach(applyStatus);
          else applyStatus(p);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closedByUs) return;
        const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws.close();
      };
    }
    connect();
    return () => {
      closedByUs = true;
      wsRef.current?.close();
    };
  }, [url, maxMessages, applyStatus]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, statuses, connected, clear };
}
