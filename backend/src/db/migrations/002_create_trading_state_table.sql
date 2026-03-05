CREATE TABLE IF NOT EXISTS trading_states (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_states_updated_at
  ON trading_states (updated_at DESC);
