-- users: profile + stats
create table public.users (
  uid text primary key,           -- device-uid (UUID format)
  username text not null,
  total_seconds integer default 0,
  streak integer default 0,
  last_day_worked text,
  week_seconds integer default 0,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

-- rooms
create table public.rooms (
  id text primary key,            -- generated UUID
  name text not null,
  owner_uid text not null references public.users(uid) on delete cascade,
  invite_code text not null unique,
  member_count integer default 1,
  created_at timestamptz default now()
);

-- room_members: many-to-many
create table public.room_members (
  room_id text not null references public.rooms(id) on delete cascade,
  user_uid text not null references public.users(uid) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_uid)
);

-- presence: ephemeral status
create table public.presence (
  room_id text not null references public.rooms(id) on delete cascade,
  user_uid text not null references public.users(uid) on delete cascade,
  status text not null check (status in ('running', 'paused', 'finished', 'idle')),
  elapsed_ms integer default 0,
  updated_at timestamptz default now(),
  primary key (room_id, user_uid)
);

-- reactions: short messages
create table public.reactions (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  target_uid text not null references public.users(uid) on delete cascade,
  sender_uid text not null references public.users(uid) on delete cascade,
  sender_username text not null,
  text text not null check (length(text) <= 60),
  created_at timestamptz default now(),
  expire_at timestamptz not null    -- 4 hours after created_at
);

-- sessions: weekly stats source
create table public.sessions (
  id text primary key,
  user_uid text not null references public.users(uid) on delete cascade,
  day_key text not null,           -- YYYY-MM-DD
  started_at timestamptz not null,
  ended_at timestamptz not null,
  elapsed_ms integer not null
);

-- Indexes for performance
create index idx_room_members_user on public.room_members(user_uid);
create index idx_presence_room on public.presence(room_id);
create index idx_reactions_room on public.reactions(room_id, created_at desc);
create index idx_reactions_expire on public.reactions(expire_at);
create index idx_sessions_user on public.sessions(user_uid, ended_at desc);
