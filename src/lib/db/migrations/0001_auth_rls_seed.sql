-- Auth integration + RLS + seed del super_admin.
-- (migración custom: Drizzle no introspecciona el schema `auth` de Supabase)

-- ────────────────────────────── Helpers ──────────────────────────────
-- SECURITY DEFINER → corren como owner y saltan RLS (evita recursión).

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'super_admin'
  );
$$;

create or replace function public.is_account_owner(acc uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts
    where id = acc and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_trade_owner(tr uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trades t
    join public.accounts a on a.id = t.account_id
    where t.id = tr and a.user_id = (select auth.uid())
  );
$$;

-- ───────────── Trigger: auth.users → public.users ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────── RLS ──────────────────────────────
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.setups enable row level security;
alter table public.tags enable row level security;
alter table public.trades enable row level security;
alter table public.transactions enable row level security;
alter table public.trade_tags enable row level security;
alter table public.screenshots enable row level security;
alter table public.pre_trade_evaluations enable row level security;
alter table public.daily_prep enable row level security;
alter table public.journal_entries enable row level security;

-- users: cada quien su fila (alta vía trigger; no hay policy de insert)
create policy "users_select" on public.users for select
  using (id = (select auth.uid()) or public.is_super_admin());
create policy "users_update" on public.users for update
  using (id = (select auth.uid()) or public.is_super_admin())
  with check (id = (select auth.uid()) or public.is_super_admin());

-- accounts / setups / tags / daily_prep / journal_entries: llaveadas por user_id
create policy "accounts_owner" on public.accounts for all
  using (user_id = (select auth.uid()) or public.is_super_admin())
  with check (user_id = (select auth.uid()) or public.is_super_admin());

create policy "setups_owner" on public.setups for all
  using (user_id = (select auth.uid()) or public.is_super_admin())
  with check (user_id = (select auth.uid()) or public.is_super_admin());

create policy "tags_owner" on public.tags for all
  using (user_id = (select auth.uid()) or public.is_super_admin())
  with check (user_id = (select auth.uid()) or public.is_super_admin());

create policy "daily_prep_owner" on public.daily_prep for all
  using (user_id = (select auth.uid()) or public.is_super_admin())
  with check (user_id = (select auth.uid()) or public.is_super_admin());

create policy "journal_entries_owner" on public.journal_entries for all
  using (user_id = (select auth.uid()) or public.is_super_admin())
  with check (user_id = (select auth.uid()) or public.is_super_admin());

-- trades / transactions / pre_trade_evaluations: ownership vía account_id
create policy "trades_owner" on public.trades for all
  using (public.is_account_owner(account_id) or public.is_super_admin())
  with check (public.is_account_owner(account_id) or public.is_super_admin());

create policy "transactions_owner" on public.transactions for all
  using (public.is_account_owner(account_id) or public.is_super_admin())
  with check (public.is_account_owner(account_id) or public.is_super_admin());

create policy "pre_trade_evaluations_owner" on public.pre_trade_evaluations for all
  using (public.is_account_owner(account_id) or public.is_super_admin())
  with check (public.is_account_owner(account_id) or public.is_super_admin());

-- screenshots / trade_tags: ownership vía trade_id
create policy "screenshots_owner" on public.screenshots for all
  using (public.is_trade_owner(trade_id) or public.is_super_admin())
  with check (public.is_trade_owner(trade_id) or public.is_super_admin());

create policy "trade_tags_owner" on public.trade_tags for all
  using (public.is_trade_owner(trade_id) or public.is_super_admin())
  with check (public.is_trade_owner(trade_id) or public.is_super_admin());

-- ──────────────────── Seed: super_admin ────────────────────
-- Email: me@josebedoya.co · Password inicial: changeme123 (CAMBIAR tras login).
do $$
declare
  uid uuid := '00000000-0000-0000-0000-000000000001';
  uemail text := 'me@josebedoya.co';
begin
  if not exists (select 1 from auth.users where email = uemail) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      uemail, extensions.crypt('changeme123', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    values (
      extensions.gen_random_uuid(), uid::text, uid,
      jsonb_build_object('sub', uid::text, 'email', uemail),
      'email', now(), now(), now()
    );
  end if;

  -- El trigger ya creó public.users; lo elevamos a super_admin.
  update public.users
    set role = 'super_admin', max_accounts = 10
    where id = uid;
end $$;
