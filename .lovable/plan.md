# Plan: Fix "No rows with a Tag column found" on Excel import

## Why it happens

The import reads the first row of the sheet as column headers and looks for the exact text `Tag` (or `tag`). If your header is `TAG`, `Tag ` (with a space), `Asset Tag`, or the headers are not in the very first row, the column is not recognized and every row is skipped — so you get the "no Tag column" error even though a Tag column exists.

## Fix

Make header matching forgiving in the bulk-import code in `src/routes/_authenticated/ledger.tsx`:

- Match headers case-insensitively and ignore surrounding spaces — `Tag`, `TAG`, ` tag ` all work.
- Accept common alternatives: `Tag`, `Asset Tag`, `Asset ID`, `ID`, `Code` (same idea for Name, Status, Location, Owner, Notes — exact name still preferred).
- Skip fully empty leading rows so headers don't have to be on row 1.
- If no Tag column is still found, the error message will list the headers it actually saw (e.g. "Found columns: TAGS, Item, Place — expected a Tag column") so the real mismatch is visible instead of a dead end.

No database or layout changes; one file edited. Verified with a typecheck and a quick browser import of an Excel file whose header is `TAG`.
