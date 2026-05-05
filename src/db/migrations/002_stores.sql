-- Lojas Shopify configuráveis (sem depender de .env)
CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  configured_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_url ON stores (store_url);

-- Settings gerais do bot (chave-valor)
CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
