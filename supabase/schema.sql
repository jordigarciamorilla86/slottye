create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.user_role as enum ('customer','business','admin');
create type public.slot_status as enum ('available','booked','blocked');
create type public.booking_status as enum ('confirmed','cancelled_by_user','cancelled_by_business','completed','no_show');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  slug text not null unique,
  description text,
  address text not null,
  city text not null,
  postal_code text,
  location geography(point,4326),
  phone text,
  email text,
  website text,
  active boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_location_idx on public.businesses using gist(location);

create table public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text not null,
  position integer not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  unique (business_id, day_of_week, open_time, close_time)
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.slot_status not null default 'available',
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  unique (business_id, start_at)
);
create index slots_business_start_idx on public.slots(business_id,start_at);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id),
  user_id uuid not null references public.profiles(id),
  business_id uuid not null references public.businesses(id),
  service_id uuid references public.services(id),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index one_active_booking_per_slot on public.bookings(slot_id) where status = 'confirmed';

create table public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id,business_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,business_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Perfil automático tras registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id,email,full_name,avatar_url,role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'requested_role' = 'business'
      then 'business'::public.user_role
      else 'customer'::public.user_role
    end
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_images enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;
alter table public.business_subscriptions enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;

create policy "categories public read" on public.categories for select using (active = true);
create policy "businesses public read" on public.businesses for select using (active = true);
create policy "services public read" on public.services for select using (active = true);
create policy "slots public read available" on public.slots for select using (status = 'available');
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own bookings read" on public.bookings for select using (auth.uid() = user_id);
create policy "own subscriptions manage" on public.business_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own favorites manage" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "business owner update" on public.businesses for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);


-- Alta OAuth de negocio: permite únicamente customer -> business.
-- Nunca permite autoasignarse admin.
create or replace function public.promote_self_to_business()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = 'business'
  where id = auth.uid() and role = 'customer';
end;
$$;
grant execute on function public.promote_self_to_business() to authenticated;

-- Un usuario no puede cambiar directamente su propio role mediante la Data API.
revoke update(role) on public.profiles from authenticated;
