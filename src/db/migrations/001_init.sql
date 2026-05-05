-- Conversas e mensagens
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  agent TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_chat ON conversations (chat_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id),
  chat_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages (chat_id, created_at DESC);

-- Métricas de tokens por chamada LLM
CREATE TABLE IF NOT EXISTS token_metrics (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_date ON token_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_agent ON token_metrics (agent, created_at DESC);

-- Log de ações executadas nos agentes
CREATE TABLE IF NOT EXISTS agent_actions (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_actions_chat ON agent_actions (chat_id, created_at DESC);
