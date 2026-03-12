CREATE TABLE IF NOT EXISTS wallet_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  review_note TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_requests_type_check CHECK (request_type IN ('deposit', 'withdraw')),
  CONSTRAINT wallet_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT wallet_requests_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_wallet_requests_user_created
  ON wallet_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_requests_status_created
  ON wallet_requests (status, created_at DESC);
