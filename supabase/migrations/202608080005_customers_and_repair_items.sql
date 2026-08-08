begin;

create type public.customer_repair_status as enum ('received', 'delivered');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is null or char_length(trim(phone)) between 7 and 30)
);

create unique index customers_phone_unique
  on public.customers(phone)
  where phone is not null;

create table public.customer_repair_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) between 2 and 200),
  details text,
  status public.customer_repair_status not null default 'received',
  received_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'received' and delivered_at is null)
    or
    (status = 'delivered' and delivered_at is not null)
  )
);

create index customer_repair_items_customer_status_idx
  on public.customer_repair_items(customer_id, status, received_at desc);

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create trigger customer_repair_items_set_updated_at before update on public.customer_repair_items
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_repair_items enable row level security;

create policy customers_select on public.customers for select to authenticated
using (public.is_manager_or_admin());
create policy customers_insert on public.customers for insert to authenticated
with check (public.is_manager_or_admin() and created_by = auth.uid());
create policy customers_update on public.customers for update to authenticated
using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy customer_repair_items_select on public.customer_repair_items for select to authenticated
using (public.is_manager_or_admin());
create policy customer_repair_items_insert on public.customer_repair_items for insert to authenticated
with check (public.is_manager_or_admin() and created_by = auth.uid());
create policy customer_repair_items_update on public.customer_repair_items for update to authenticated
using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

grant select, insert, update on public.customers, public.customer_repair_items to authenticated;

commit;
