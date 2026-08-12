-- Auto-update last_active_at on user row update
create or replace function public.touch_user() returns trigger as $$
begin
  new.last_active_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_touch before update on public.users
  for each row execute function public.touch_user();

-- Note: pg_cron is NOT available on free tier. Reactions cleanup
-- will be handled by client-side query filter (expire_at < now())
-- or by an Edge Function scheduled via Supabase.
-- We do not enable cron here to avoid breaking free-tier assumptions.
