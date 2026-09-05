import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./client.js";
import { logger } from "../logging.js";

/**
 * Runner de migrations minimalista (ordem alfabética dos arquivos SQL).
 * Cria a tabela _migrations e aplica o que falta. Idempotente.
 */
const MIGRATIONS_DIR_DIST = new URL("../db/migrations/", import.meta.url).pathname;
// Em dev, o código roda de src/; em produção compilada, de dist/. As .sql não são
// compiladas, então copiamos para dist/db/migrations no build. Se ausente, usamos src.
import { existsSync } from "node:fs";
function resolveMigrationsDir(): string {
  if (existsSync(MIGRATIONS_DIR_DIST)) return MIGRATIONS_DIR_DIST;
  // fallback: sobe dois níveis (dist/backend -> backend) e entra em src/db/migrations
  const fallback = new URL("../../src/db/migrations/", import.meta.url).pathname;
  return fallback;
}
const MIGRATIONS_DIR = resolveMigrationsDir();

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const already = await pool.query("SELECT 1 FROM _migrations WHERE name=$1", [f]);
    if ((already.rowCount ?? 0) > 0) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, f), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations(name) VALUES($1)", [f]);
      await client.query("COMMIT");
      logger.info(`[migrate] aplicada: ${f}`);
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error(`[migrate] FALHA em ${f}`, { error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      client.release();
    }
  }
}
