-- Run in Supabase SQL Editor
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  wilaya_code int,
  wilaya_name text,
  commune text,
  delivery_type text not null default 'home',
  product_name text not null,
  product_id text,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  shipping_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_store on public.orders(store_id);
create index if not exists idx_orders_created on public.orders(created_at desc);

alter table public.orders enable row level security;

-- Merchant sees own store orders
drop policy if exists orders_select_owner on public.orders;
create policy orders_select_owner on public.orders
  for select using (public.is_store_owner(store_id));

-- Public can create order only for published stores
drop policy if exists orders_insert_public on public.orders;
create policy orders_insert_public on public.orders
  for insert with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.is_published = true
    )
  );

-- Merchant can update status
drop policy if exists orders_update_owner on public.orders;
create policy orders_update_owner on public.orders
  for update using (public.is_store_owner(store_id));
