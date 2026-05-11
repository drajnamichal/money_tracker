-- Adds soft-delete (archive) support to asset_accounts.
-- An account with `archived_at IS NOT NULL` is hidden from the "new wealth
-- record" form but all historical wealth_records remain untouched, so past
-- totals stay accurate. Setting archived_at back to NULL un-archives.

alter table public.asset_accounts
  add column if not exists archived_at timestamptz null;

comment on column public.asset_accounts.archived_at is
  'When the account was archived (soft-deleted). NULL = active.';

create index if not exists asset_accounts_archived_at_idx
  on public.asset_accounts (archived_at);
