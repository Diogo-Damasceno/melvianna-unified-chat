import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Pool de conexão PostgreSQL (usado por painel/bot nas fases seguintes).
 * O MVP do chat roda em memória/WebSocket, mas o schema já é criado para
 * suportar comandos, usuários, auditoria e configurações. Nenhuma credencial
 * é logada (ver logging.ts).
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
});

export async function query<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function withClient<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
