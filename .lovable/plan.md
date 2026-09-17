# Plan: Add four features to Asset Ledger

Adding these features is **additive** — the existing sign-in, admin account management, and asset ledger all keep running. Nothing is removed. Four new capabilities, each kept lean per your "quick & functional" priority.

## Navigation change

The bottom nav goes from 3 tabs to 4:

```text
Scan | Inventory | Labels | Reports
```

- **Scan** — unchanged (camera + manual tag entry).
- **Inventory** — unchanged list, plus a checkout action inside the asset sheet.
- **Labels** — new (QR code generator + print).
- **Reports** — repurposed from the old Export tab: analytics charts + XLSX/CSV export + print-to-PDF + bulk import (admin only).

## Feature 1 — QR code labels (new "Labels" tab)

An admin (or any signed-in user) can generate printable QR code labels for asset tags so they can stick them on physical equipment and scan them later.

- Install `qrcode.react` (React QR component).
- "Labels" tab lists assets with a checkbox to select which ones to print.
- Live preview renders each selected asset's QR code (encoding the tag string — the exact text the scanner reads) plus the tag and name under it.
- "Print labels" button opens the browser print dialog (`window.print`) with a dedicated print stylesheet that lays the labels out in a clean grid on a page. Print to paper or "Save as PDF" from the print dialog.
- No server changes; uses the asset rows already loaded.

## Feature 2 — Bulk import from spreadsheet (admin only, in Reports tab)

An admin uploads a CSV or XLSX file of assets to create many rows at once instead of scanning each one.

- Admin-only section in the Reports tab (hidden for non-admins).
- File picker accepts `.csv` and `.xlsx`. Parsing uses the already-installed `xlsx` library, client-side.
- Expected columns: `Tag, Name, Status, Location, Owner, Notes` (a downloadable template button is provided).
- Parsed rows are upserted through the existing browser Supabase client (same path the manual save uses), so RLS applies — rows are created under the signed-in admin. Duplicates on `tag` are updated.
- Shows a count of imported rows and any skipped rows.

## Feature 3 — Checkout / assignment history (in the asset sheet)

Record who an asset is checked out to and when, mark returns, and see the full history per asset.

- **New `checkouts` table** (migration):
  - `id`, `asset_id` (references assets, cascade delete), `user_id`, `checked_out_to` (text), `checked_out_at`, `returned_at` (nullable), `notes`.
  - RLS: the asset's owner **or** an admin can read/write checkouts for that asset.
- In the asset sheet (the bottom panel that opens when you tap an asset):
  - If the asset is currently checked out, show who has it and a "Return" button.
  - Otherwise, a "Check out to" input + button. Checking out also writes the person's name into the asset's `owner` field and logs a `checkouts` row; returning clears it and stamps `returned_at`.
  - A compact history list shows past check-outs/returns for that asset.
- Uses the browser Supabase client directly (consistent with the existing asset save path).

## Feature 4 — Reports & analytics (repurposed "Reports" tab)

A simple analytics view plus the existing exports, and a printable report.

- Breakdowns as lightweight CSS bar charts (no chart library) for: status, location, and owner. Each shows counts with a horizontal bar.
- The existing XLSX/CSV export buttons stay here.
- "Print report" button opens a print-styled report (totals + breakdowns) for paper or PDF via the print dialog.
- Bulk-import section (Feature 2) lives at the bottom of this tab, admin only.

## Database migration (single migration)

Creates the `checkouts` table with grants, RLS enabled, and an owner/admin policy, plus an `updated_at`-style trigger is not needed (checkouts are append/return logs). Exact structure:

```sql
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
```

## Package install

- `qrcode.react` — for rendering QR codes in the Labels tab.

## Files changed

- `src/routes/_authenticated/ledger.tsx` — add Labels tab, convert Export tab → Reports (charts + import + print), add checkout UI + history in the asset sheet.
- `src/styles.css` — print styles for labels and the report, simple bar-chart utility classes.
- One Supabase migration (the `checkouts` table above).

## Verification

- `tsgo --noEmit` typecheck passes.
- Browser check on the preview: sign in as ITadmin, open Labels and print-preview, import a small CSV, check an asset out and back in, open Reports and print-preview.

## Out of scope

- The pre-existing `has_role` security-definer linter warning is not touched by this work.
- No changes to sign-in, admin account management, or existing scan/inventory behavior.
