-- Finance tracker: transactions + budgets, scoped per user via Row Level Security.
-- Run this once in your Supabase project's SQL editor (or via `supabase db push`
-- if you're using the CLI).

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_created_at_idx
  on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- One row per user: overall cap + per-category caps as JSON.
create table if not exists public.budgets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  overall numeric,
  by_category jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);
