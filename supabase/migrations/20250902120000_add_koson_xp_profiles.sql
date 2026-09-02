ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS koson_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS koson_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_koson_transactions_user_id ON koson_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_koson_transactions_created_at ON koson_transactions (created_at DESC);
