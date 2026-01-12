-- Function to cancel user subscription
-- Reverts user to free plan with 3 credits
-- Returns information about the old and new plan

CREATE OR REPLACE FUNCTION cancel_subscription(user_id UUID)
RETURNS json AS $$
DECLARE
  old_plan TEXT;
  old_credits INTEGER;
  result json;
BEGIN
  -- Get current plan and credits
  SELECT plan_type, credits_remaining INTO old_plan, old_credits
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check if user exists
  IF old_plan IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already on free plan
  IF old_plan = 'free' THEN
    RAISE EXCEPTION 'User is already on free plan';
  END IF;
  
  -- Update to free plan
  UPDATE public.profiles
  SET plan_type = 'free',
      credits_remaining = 3,
      updated_at = timezone('utc'::text, now())
  WHERE id = user_id;
  
  -- Return old and new plan info
  result := json_build_object(
    'old_plan', old_plan,
    'old_credits', old_credits,
    'new_plan', 'free',
    'new_credits', 3,
    'cancelled_at', timezone('utc'::text, now())
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;
