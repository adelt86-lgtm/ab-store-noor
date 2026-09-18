-- AB-STORE-NOOR: Super Admin security layer
-- Run once in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'merchant' check (role in ('merchant','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email, updated_at = now();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Users can only read their own profile. Role changes must be done in SQL/server-side.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated using (id = auth.uid() or public.is_super_admin());

-- Super admin can manage platform data without exposing it to normal merchants.
drop policy if exists super_admin_all_stores on public.stores;
create policy super_admin_all_stores on public.stores
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists super_admin_all_products on public.products;
create policy super_admin_all_products on public.products
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists super_admin_all_store_channels on public.store_channels;
create policy super_admin_all_store_channels on public.store_channels
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- IMPORTANT: promote your account only after replacing the email below.
-- update public.profiles set role = 'super_admin' where email = 'YOUR_ADMIN_EMAIL';
