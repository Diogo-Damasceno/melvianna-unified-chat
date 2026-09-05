// Logger estruturado simples. Nunca registra tokens, senhas ou dados sensíveis.

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

function redact(value: unknown): unknown {
  if (typeof value !== "string") return value;
  // heurística para não logar segredos acidentalmente
  if (/token|secret|password|authorization|cookie/i.test(value)) return "[redacted]";
  return value;
}

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    msg,
  };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      entry[k] = redact(v);
    }
  }
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
