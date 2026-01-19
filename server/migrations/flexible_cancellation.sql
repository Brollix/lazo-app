-- Migration: Add Flexible Cancellation Support
-- Adds field to track whether user chose to keep credits when cancelling

-- Add cancellation_type field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cancellation_type TEXT CHECK (cancellation_type IN ('immediate', 'keep_credits'));

-- Update the cancel_user_subscription function to support keepCredits parameter
CREATE OR REPLACE FUNCTION cancel_user_subscription(
  p_user_id UUID,
  p_keep_credits BOOLEAN DEFAULT FALSE
)
RETURNS json AS $$
DECLARE
  v_old_plan TEXT;
  v_mp_subscription_id TEXT;
  v_current_credits INTEGER;
  v_current_premium_credits INTEGER;
  result json;
BEGIN
  -- Get current subscription info
  SELECT plan_type, subscription_id, credits_remaining, premium_credits_remaining
  INTO v_old_plan, v_mp_subscription_id, v_current_credits, v_current_premium_credits
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check if user has active subscription
  IF v_old_plan IS NULL OR v_old_plan = 'free' THEN
    RAISE EXCEPTION 'User does not have an active subscription';
  END IF;

  -- Update subscription status
  UPDATE public.subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE mp_subscription_id = v_mp_subscription_id;

  -- Update profile based on keepCredits choice
  IF p_keep_credits THEN
    -- Keep credits, just downgrade plan
    UPDATE public.profiles
    SET 
      plan_type = 'free',
      subscription_status = 'cancelled',
      subscription_cancelled_at = timezone('utc'::text, now()),
      cancellation_type = 'keep_credits',
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  ELSE
    -- Reset credits to free tier
    UPDATE public.profiles
    SET 
      plan_type = 'free',
      credits_remaining = 3,
      premium_credits_remaining = 0,
      subscription_status = 'cancelled',
      subscription_cancelled_at = timezone('utc'::text, now()),
      cancellation_type = 'immediate',
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  END IF;

  result := json_build_object(
    'old_plan', v_old_plan,
    'new_plan', 'free',
    'mp_subscription_id', v_mp_subscription_id,
    'cancelled_at', timezone('utc'::text, now()),
    'kept_credits', p_keep_credits,
    'credits_after_cancellation', CASE 
      WHEN p_keep_credits THEN v_current_credits 
      ELSE 3 
    END,
    'premium_credits_after_cancellation', CASE 
      WHEN p_keep_credits THEN v_current_premium_credits 
      ELSE 0 
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cancel_user_subscription(UUID, BOOLEAN) TO authenticated;

-- Migration complete
