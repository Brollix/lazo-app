-- Fix existing profiles that don't have plan_type or credits_remaining set
UPDATE public.profiles
SET 
  plan_type = COALESCE(plan_type, 'free'),
  credits_remaining = COALESCE(credits_remaining, 3)
WHERE plan_type IS NULL OR credits_remaining IS NULL;

-- Ensure the trigger function is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan_type, credits_remaining)
  VALUES (new.id, new.email, 'free', 3)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    plan_type = COALESCE(public.profiles.plan_type, 'free'),
    credits_remaining = COALESCE(public.profiles.credits_remaining, 3);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
