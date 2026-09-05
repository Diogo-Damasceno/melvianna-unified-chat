import type { UnifiedMessage } from "./types.js";

/**
 * Deduplicador em memória para evitar que reconexões façam a mesma
 * mensagem aparecer mais de uma vez no chat unificado.
 *
 * Usa uma janela de tempo (padrão 10s) e um conjunto de ids recentes.
 * Mensagens com o mesmo id (gerado deterministicamente em normalize) dentro
 * da janela são consideradas duplicatas.
 */
export class MessageDeduplicator {
  private seen = new Map<string, number>(); // id -> expiraEm(ms)
  private readonly windowMs: number;

  constructor(windowMs = 10_000) {
    this.windowMs = windowMs;
  }

  /** Retorna true se a mensagem for nova (não duplicada). */
  isUnique(msg: UnifiedMessage): boolean {
    this.reap();
    const now = Date.now();
    const expires = now + this.windowMs;
    const existing = this.seen.get(msg.id);
    if (existing !== undefined) {
      // estende a janela para a mensagem repetida
      this.seen.set(msg.id, expires);
      return false;
    }
    this.seen.set(msg.id, expires);
    return true;
  }

  /** Força a remoção de entradas expiradas (chamado periodicamente). */
  private reap(): void {
    const now = Date.now();
    for (const [id, exp] of this.seen) {
      if (exp <= now) this.seen.delete(id);
    }
  }

  /** Limpa todo o estado (útil em testes). */
  clear(): void {
    this.seen.clear();
  }

  get size(): number {
    return this.seen.size;
  }
}
