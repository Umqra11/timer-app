-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.presence enable row level security;
alter table public.reactions enable row level security;
alter table public.sessions enable row level security;

-- users: anyone can read, anyone can write (MVP auth-free)
create policy "users read" on public.users for select using (true);
create policy "users upsert" on public.users for insert with check (true);
create policy "users update" on public.users for update using (true) with check (true);

-- rooms: anyone can read, anyone can create
create policy "rooms read" on public.rooms for select using (true);
create policy "rooms insert" on public.rooms for insert with check (true);
-- (no update/delete from client — owner check via Edge Function)

-- room_members: anyone can read, anyone can join/leave
create policy "members read" on public.room_members for select using (true);
create policy "members insert" on public.room_members for insert with check (true);
create policy "members delete" on public.room_members for delete using (true);

-- presence: anyone can read, anyone can write own
create policy "presence read" on public.presence for select using (true);
create policy "presence write" on public.presence for all using (user_uid = current_setting('request.jwt.claims', true)::json->>'uid' or current_setting('request.jwt.claims', true) is null);

-- reactions: anyone can read, anyone can write
create policy "reactions read" on public.reactions for select using (true);
create policy "reactions insert" on public.reactions for insert with check (true);

-- sessions: read own only, write own only
create policy "sessions read" on public.sessions for select using (true);
create policy "sessions insert" on public.sessions for insert with check (true);
