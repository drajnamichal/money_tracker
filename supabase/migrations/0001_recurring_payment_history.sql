-- Recurring payment price-change history.
--
-- Stores every amount the user has had for a recurring payment so the UI can
-- show the full price-history timeline (and not just the most recent change
-- captured by recurring_payments.last_amount).
--
-- Apply this migration once in the Supabase SQL Editor.

create table if not exists public.recurring_payment_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.recurring_payments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  effective_from date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists recurring_payment_history_payment_id_idx
  on public.recurring_payment_history (payment_id);

create index if not exists recurring_payment_history_payment_id_effective_from_idx
  on public.recurring_payment_history (payment_id, effective_from desc);

create index if not exists recurring_payment_history_user_id_idx
  on public.recurring_payment_history (user_id);

alter table public.recurring_payment_history enable row level security;

-- Owner-only access (mirrors policies on recurring_payments).
drop policy if exists "Users can view their payment history"
  on public.recurring_payment_history;
create policy "Users can view their payment history"
  on public.recurring_payment_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their payment history"
  on public.recurring_payment_history;
create policy "Users can insert their payment history"
  on public.recurring_payment_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their payment history"
  on public.recurring_payment_history;
create policy "Users can update their payment history"
  on public.recurring_payment_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their payment history"
  on public.recurring_payment_history;
create policy "Users can delete their payment history"
  on public.recurring_payment_history
  for delete
  using (auth.uid() = user_id);

-- Backfill: seed history for every existing payment.
-- 1) Older entry from last_amount (if it differs from current).
insert into public.recurring_payment_history (payment_id, user_id, amount, effective_from, note)
select
  rp.id,
  rp.user_id,
  rp.last_amount,
  coalesce(rp.created_at::date, current_date),
  'Pôvodná suma (automatický záznam)'
from public.recurring_payments rp
where rp.last_amount is not null
  and rp.last_amount <> rp.amount
  and not exists (
    select 1 from public.recurring_payment_history h
    where h.payment_id = rp.id
  );

-- 2) Current amount entry for every payment that still has no history rows.
insert into public.recurring_payment_history (payment_id, user_id, amount, effective_from, note)
select
  rp.id,
  rp.user_id,
  rp.amount,
  current_date,
  'Aktuálna suma (automatický záznam)'
from public.recurring_payments rp
where not exists (
  select 1 from public.recurring_payment_history h
  where h.payment_id = rp.id
    and h.amount = rp.amount
);
