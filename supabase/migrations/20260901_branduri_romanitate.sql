CREATE TABLE IF NOT EXISTS public.branduri_romanitate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_bare_prefix VARCHAR(20),
  cui VARCHAR(20),
  nume_brand TEXT NOT NULL,
  categorie_tip SMALLINT NOT NULL CHECK (categorie_tip BETWEEN 1 AND 5),
  procent_retentie_ron SMALLINT CHECK (procent_retentie_ron IS NULL OR procent_retentie_ron BETWEEN 0 AND 100),
  brand_alternativ_id UUID REFERENCES public.branduri_romanitate(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branduri_cod_bare_prefix
  ON public.branduri_romanitate(cod_bare_prefix);

CREATE INDEX IF NOT EXISTS idx_branduri_cui
  ON public.branduri_romanitate(cui);

CREATE INDEX IF NOT EXISTS idx_branduri_nume_brand
  ON public.branduri_romanitate(nume_brand text_pattern_ops);

ALTER TABLE public.branduri_romanitate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branduri_romanitate_select ON public.branduri_romanitate;
CREATE POLICY branduri_romanitate_select
  ON public.branduri_romanitate
  FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
