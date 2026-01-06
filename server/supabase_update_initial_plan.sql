-- Update handle_new_user to NOT assign a plan initially
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We now initialize with NO plan (NULL) and 0 credits
  -- The user must select a plan explicitly via the UI to get credits
  INSERT INTO public.profiles (id, email, plan_type, credits_remaining)
  VALUES (new.id, new.email, NULL, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
