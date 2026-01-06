-- Function to decrement credits
-- This should be run in Supabase SQL Editor
create or replace function decrement_credits(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set credits_remaining = credits_remaining - 1,
      updated_at = now()
  where id = user_id
  and credits_remaining > 0;
end;
$$;
