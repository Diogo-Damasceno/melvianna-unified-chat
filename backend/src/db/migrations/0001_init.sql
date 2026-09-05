-- Schema inicial: usuários, papéis, comandos, filtros, contadores, auditoria.
-- Preparado para o painel administrativo (fase 2) e bot (fase 3).
-- O chat unificado do MVP roda em memória; estas tabelas dão suporte futuro.

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'moderator', 'viewer');

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  role          user_role NOT NULL DEFAULT 'viewer',
  password_hash TEXT, -- apenas para contas locais (NULL se OAuth)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL, -- twitch | youtube | kick
  channel_id    TEXT NOT NULL,
  -- Tokens criptografados em repouso (app deve cifrar antes de gravar). NUNCA plaintext.
  encrypted_token TEXT NOT NULL,
  token_iv      TEXT NOT NULL, -- vetor de inicialização
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, channel_id)
);

CREATE TABLE IF NOT EXISTS commands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'shared', -- shared | twitch | youtube | kick
  response      TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT false, -- ativação individual (migração StreamElements)
  cooldown_sec  INT NOT NULL DEFAULT 5,
  roles_allowed TEXT[] NOT NULL DEFAULT ARRAY['viewer'],
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, platform)
);

CREATE TABLE IF NOT EXISTS filters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL, -- blocked_word | link | spam
  value         TEXT NOT NULL,
  action        TEXT NOT NULL DEFAULT 'remove', -- remove | warn | timeout
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  value         BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,
  target        TEXT,
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commands_platform ON commands(platform);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_filters_type ON filters(type);

-- Retenção: o app aplica expiração de mensagens/logs por política (ver docs).
