-- Dados de demonstração (seed). Identificados claramente como demo.
-- Nenhuma credencial real. Contas/papéis para o painel (fase 2).

INSERT INTO users (username, display_name, role, is_active)
VALUES
  ('melvianna', 'Melvianna', 'owner', true),
  ('admin_demo', 'Admin Demo', 'admin', true),
  ('mod_demo', 'Mod Demo', 'moderator', true),
  ('viewer_demo', 'Viewer Demo', 'viewer', true)
ON CONFLICT (username) DO NOTHING;

-- Comandos de exemplo (desabilitados por padrão; ativação individual pós-teste).
INSERT INTO commands (name, platform, response, enabled, cooldown_sec, roles_allowed, aliases)
VALUES
  ('comandos', 'shared', 'Comandos disponíveis: !comandos !social !horario !sorteio', false, 5, ARRAY['viewer'], ARRAY['cmds']),
  ('social', 'shared', 'Twitch/YT/Kick: @Melvianna — redes em breve', false, 5, ARRAY['viewer'], ARRAY[]::text[]),
  ('horario', 'shared', 'Live toda dia às 20h (horário de Brasília)', false, 10, ARRAY['viewer'], ARRAY[]::text[]),
  ('sorteio', 'shared', 'Use o painel para iniciar um sorteio', false, 0, ARRAY['moderator','admin','owner'], ARRAY[]::text[])
ON CONFLICT (name, platform) DO NOTHING;

-- Filtros de exemplo (demo)
INSERT INTO filters (type, value, action, enabled)
VALUES
  ('blocked_word', 'palavrao1', 'remove', true),
  ('link', 'http', 'warn', true)
ON CONFLICT DO NOTHING;
