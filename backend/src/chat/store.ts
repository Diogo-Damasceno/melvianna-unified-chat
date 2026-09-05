import type { Platform, UnifiedMessage } from "./types.js";

/**
 * Buffer circular em memória das mensagens recentes do chat unificado.
 * Mantém as últimas N mensagens para o histórico recente (requisito do painel)
 * e para clientes que conectam após o início do stream.
 *
 * O chat em tempo real é transmitido via WebSocket; este store é o "backfill".
 */
export class ChatStore {
  private buffer: UnifiedMessage[] = [];
  private readonly capacity: number;

  constructor(capacity = 500) {
    this.capacity = Math.max(1, capacity);
  }

  add(msg: UnifiedMessage): void {
    this.buffer.push(msg);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
  }

  /** Retorna as mensagens mais recentes (mais antigas primeiro). */
  recent(limit = this.capacity): UnifiedMessage[] {
    return this.buffer.slice(-Math.min(limit, this.capacity));
  }

  /** Filtra por plataforma. */
  byPlatform(platform: Platform): UnifiedMessage[] {
    return this.buffer.filter((m) => m.platform === platform);
  }

  /** Busca simples por usuário ou conteúdo (case-insensitive). */
  search(query: string): UnifiedMessage[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.recent();
    return this.buffer.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q),
    );
  }

  get size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}
