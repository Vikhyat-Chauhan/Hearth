# Supabase Setup — Schema and Auth Patterns

## Read this when: setting up Supabase for the first time in a project, or designing schema

## Quick schema template (paste into Supabase SQL editor)
```sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

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
```

## Generic content table template
```sql
-- Replace "items" with your domain noun
create table public.items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  content text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.items enable row level security;
create policy "Users see own items" on public.items
  for all using (auth.uid() = user_id);
```

## Auth setup (Next.js App Router)
```bash
# Install
npm install @supabase/ssr

# Middleware (src/middleware.ts) — protects all routes
# Get from: https://supabase.com/docs/guides/auth/server-side/nextjs
```

## Magic link auth (fastest to implement)
```ts
// Sign in
await supabase.auth.signInWithOtp({ email })

// Sign out
await supabase.auth.signOut()

// Get session
const { data: { session } } = await supabase.auth.getSession()
```

## OAuth (Google — second fastest)
1. Supabase dashboard → Auth → Providers → Google → Enable
2. Add Google client ID + secret (from Google Cloud Console)
3. Add callback URL from Supabase to Google Console
```ts
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

## RLS cheat sheet
- Always enable RLS on every table
- `auth.uid()` = current user's UUID
- `using (auth.uid() = user_id)` = user can only see their rows
- Use `service_role` key server-side to bypass RLS when needed
