-- Sláinte — schema Supabase (Fase 4)
-- Execute no SQL Editor do projeto Supabase: https://supabase.com/dashboard

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_uri text,
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  restrictions text not null default '',
  daily_goals jsonb not null default '{"calories":2100,"protein":140,"carbs":220,"fat":65}'::jsonb,
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  logged_meals jsonb not null default '[]'::jsonb,
  planned_meals jsonb not null default '[]'::jsonb,
  recipes jsonb not null default '[]'::jsonb,
  shopping jsonb not null default '[]'::jsonb,
  meal_plan_summary text,
  selected_history_date text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_sync enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "user_sync_select_own" on public.user_sync
  for select using (auth.uid() = user_id);

create policy "user_sync_insert_own" on public.user_sync
  for insert with check (auth.uid() = user_id);

create policy "user_sync_update_own" on public.user_sync
  for update using (auth.uid() = user_id);

-- Opcional: criar perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_sync (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
