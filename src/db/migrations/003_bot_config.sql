-- Configuração do bot Telegram (sem .env)
CREATE TABLE IF NOT EXISTS telegram_config (
  id BIGSERIAL PRIMARY KEY,
  bot_token TEXT NOT NULL,
  bot_name TEXT DEFAULT '',
  allowed_chat_ids BIGINT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
