import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { PlatformRegistry } from "../platforms/registry.js";
import type { UnifiedMessage } from "../chat/types.js";
import type { ConnectionStatus } from "../platforms/types.js";
import { MessageDeduplicator } from "../chat/dedup.js";
import { ChatStore } from "../chat/store.js";
import { env } from "../config/env.js";
import { logger } from "../logging.js";

/**
 * Hub de WebSocket do chat unificado.
 *
 * - Transmite cada mensagem normalizada (já deduplicada) para os clientes.
 * - Envia snapshots de estado de conexão e o histórico recente no JOIN.
 * - Protocolo simples: clientes recebem {type:'message'|'status'|'history'|'info'}.
 *
 * IMPORTANTE: usamos UM ÚNICO WebSocketServer por servidor HTTP. Ter múltiplos
 * WebSocketServer no mesmo server corrompe o handshake (frame RSV1). O roteamento
 * por path (ex.: /ws vs /overlay/ws) e a exigência de token são resolvidos no
 * handler de 'connection' a partir de req.url.
 *
 * O hub NÃO expõe credenciais. O overlay OBS usa o mesmo canal porém autenticado
 * por token (requireToken=true).
 */
interface HubRoute {
  path: string;
  requireToken: boolean;
}

export class ChatHub {
  private readonly wss: WebSocketServer;
  private readonly routes = new Map<string, HubRoute>();
  private readonly registry: PlatformRegistry;
  private readonly store: ChatStore;
  private readonly dedup: MessageDeduplicator;

  private constructor(
    server: HttpServer,
    registry: PlatformRegistry,
    store: ChatStore,
    dedup: MessageDeduplicator,
  ) {
    this.registry = registry;
    this.store = store;
    this.dedup = dedup;
    this.wss = new WebSocketServer({ server });

    registry.onMessage((msg: UnifiedMessage) => {
      if (!dedup.isUnique(msg)) {
        logger.debug(`[ws] mensagem duplicada ignorada ${msg.id}`);
        return;
      }
      store.add(msg);
      this.broadcast({ type: "message", payload: msg });
    });
    registry.onStatusChange((status: ConnectionStatus) => {
      this.broadcast({ type: "status", payload: status });
    });

    this.wss.on("connection", (ws, req) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const route = this.routes.get(url.pathname);
      if (!route) {
        ws.close(4404, "not_found");
        return;
      }
      if (route.requireToken) {
        const token = url.searchParams.get("token");
        if (token !== env.OVERLAY_TOKEN) {
          ws.close(4401, "unauthorized");
          return;
        }
      }
      // estado atual + histórico recente
      const statuses = registry.all().map((a) => a.getStatus());
      ws.send(JSON.stringify({ type: "status", payload: statuses }));
      ws.send(JSON.stringify({ type: "history", payload: store.recent(env.MAX_CHAT_HISTORY) }));
      logger.info(`[ws] cliente conectado em ${route.path}`);
    });
  }

  static create(
    server: HttpServer,
    registry: PlatformRegistry,
    store: ChatStore,
    dedup: MessageDeduplicator,
  ): ChatHub {
    return new ChatHub(server, registry, store, dedup);
  }

  /** Registra uma rota de WebSocket (path + exigência de token). */
  route(path: string, requireToken = false): this {
    this.routes.set(path, { path, requireToken });
    logger.info(`[ws] rota ${path} registrada${requireToken ? " (token exigido)" : ""}`);
    return this;
  }

  /** Fecha o hub (usado no shutdown). */
  close(): void {
    void this.registry;
    void this.store;
    void this.dedup;
    this.wss.close();
  }

  private broadcast(obj: unknown): void {
    const data = JSON.stringify(obj);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }
}
