-- GigSync schema
-- profiles: extends auth.users, supports both musician and client roles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'client' check (role in ('musician', 'client')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Allow public reads for musician discovery
create policy "Public can read profiles" on public.profiles
  for select using (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- musician_profiles: detailed musician listing info
create table public.musician_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  instrument text not null,
  genres text[] not null default '{}',
  hourly_rate numeric(10,2),
  day_rate numeric(10,2),
  bio text,
  audio_sample_url text,
  city text not null,
  is_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.musician_profiles enable row level security;

create policy "Public can read musician profiles" on public.musician_profiles
  for select using (true);

create policy "Musicians manage own profile" on public.musician_profiles
  for all using (auth.uid() = user_id);

-- bookings: booking requests from clients to musicians
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  musician_id uuid references public.profiles(id) on delete cascade not null,
  event_date date not null,
  event_type text not null check (event_type in ('studio', 'live')),
  rate_offer numeric(10,2) not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  platform_fee numeric(10,2) generated always as (rate_offer * 0.1) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings enable row level security;

create policy "Clients see own bookings" on public.bookings
  for select using (auth.uid() = client_id);

create policy "Musicians see bookings for them" on public.bookings
  for select using (auth.uid() = musician_id);

create policy "Clients create bookings" on public.bookings
  for insert with check (auth.uid() = client_id);

create policy "Musicians update booking status" on public.bookings
  for update using (auth.uid() = musician_id);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_musician_profiles_updated_at
  before update on public.musician_profiles
  for each row execute procedure public.set_updated_at();

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();
