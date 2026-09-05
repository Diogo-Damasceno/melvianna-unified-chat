import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Banco de dados (PostgreSQL)
  DATABASE_URL: z.string().min(1).default(
    "postgres://melvianna:melvianna@localhost:5432/melvianna",
  ),
  RUN_MIGRATIONS: z.coerce.boolean().default(true),

  // Modo de demonstração (sem credenciais reais; NUNCA envia para canais reais)
  DEMO_MODE: z.coerce.boolean().default(true),
  DEMO_CHANNEL_TWITCH: z.string().default("melvianna_demo"),
  DEMO_CHANNEL_YOUTUBE: z.string().default("UCmelviannaDemo"),
  DEMO_CHANNEL_KICK: z.string().default("melvianna_demo"),
  DEMO_MESSAGE_RATE_MS: z.coerce.number().int().positive().default(1500),

  // Plataformas habilitadas (overrides no modo demo)
  TWITCH_ENABLED: z.coerce.boolean().default(false),
  YOUTUBE_ENABLED: z.coerce.boolean().default(false),
  KICK_ENABLED: z.coerce.boolean().default(false),

  // Overlay OBS
  OVERLAY_TOKEN: z.string().min(8).default("demo-overlay-token-change-me"),

  // Limites / segurança
  MAX_CHAT_HISTORY: z.coerce.number().int().positive().default(500),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // Credenciais (OPCIONAIS no MVP; só usadas fora do DEMO_MODE)
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  TWITCH_OAUTH_TOKEN: z.string().optional(),
  TWITCH_CHANNEL: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_CHANNEL_ID: z.string().optional(),
  YOUTUBE_OAUTH_TOKEN: z.string().optional(),
  KICK_CLIENT_ID: z.string().optional(),
  KICK_CLIENT_SECRET: z.string().optional(),
  KICK_CHANNEL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let parsed: AppEnv;
try {
  parsed = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const issues = err.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`Erro de configuração de ambiente:\n${issues}`);
  }
  throw err;
}

export const env: AppEnv = parsed;
