-- Bonuri scanate (OCR Gemini) + istoric cumpărături
CREATE TABLE IF NOT EXISTS public.scanned_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_name TEXT NOT NULL,
  store_address TEXT,
  total NUMERIC(12, 2) NOT NULL,
  receipt_date DATE,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  eligible BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scanned_receipts_user_id
  ON public.scanned_receipts (user_id);

CREATE INDEX IF NOT EXISTS idx_scanned_receipts_created_at
  ON public.scanned_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scanned_receipts_store_name
  ON public.scanned_receipts (store_name);

ALTER TABLE public.scanned_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scanned_receipts_select_own ON public.scanned_receipts;
CREATE POLICY scanned_receipts_select_own
  ON public.scanned_receipts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for inserts from server actions.

NOTIFY pgrst, 'reload schema';
