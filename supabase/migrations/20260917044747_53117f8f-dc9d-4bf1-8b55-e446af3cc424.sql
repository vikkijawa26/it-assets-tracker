CREATE TABLE public.checkouts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null,
  checked_out_to text not null default '',
  checked_out_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text not null default ''
);
GRANT SELECT, INSERT, UPDATE ON public.checkouts TO authenticated;
GRANT ALL ON public.checkouts TO service_role;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset owner or admin manages checkouts"
  ON public.checkouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a
          WHERE a.id = checkouts.asset_id
            AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets a
          WHERE a.id = checkouts.asset_id
            AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));