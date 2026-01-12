-- Migration: Add Recurring Subscriptions Support
-- This migration adds tables and functions to support Mercado Pago recurring subscriptions

-- 1. Add subscription-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Create subscriptions table to track subscription details
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  mp_subscription_id TEXT UNIQUE NOT NULL,
  mp_plan_id TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('pro', 'ultra')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ARS',
  billing_day INTEGER,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  paused_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create payment history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions ON DELETE SET NULL,
  mp_payment_id TEXT UNIQUE NOT NULL,
  mp_subscription_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ARS',
  status TEXT NOT NULL,
  status_detail TEXT,
  payment_type TEXT,
  credits_added INTEGER DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS for new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Function to create or update subscription
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_mp_subscription_id TEXT,
  p_mp_plan_id TEXT,
  p_plan_type TEXT,
  p_status TEXT,
  p_amount DECIMAL,
  p_billing_day INTEGER DEFAULT NULL,
  p_next_billing_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_subscription_id UUID;
  result json;
BEGIN
  -- Insert or update subscription
  INSERT INTO public.subscriptions (
    user_id, mp_subscription_id, mp_plan_id, plan_type, 
    status, amount, billing_day, next_billing_date
  )
  VALUES (
    p_user_id, p_mp_subscription_id, p_mp_plan_id, p_plan_type,
    p_status, p_amount, p_billing_day, p_next_billing_date
  )
  ON CONFLICT (mp_subscription_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    next_billing_date = EXCLUDED.next_billing_date,
    updated_at = timezone('utc'::text, now()),
    paused_at = CASE WHEN EXCLUDED.status = 'paused' THEN timezone('utc'::text, now()) ELSE subscriptions.paused_at END,
    cancelled_at = CASE WHEN EXCLUDED.status = 'cancelled' THEN timezone('utc'::text, now()) ELSE subscriptions.cancelled_at END
  RETURNING id INTO v_subscription_id;

  -- Update profile with subscription info
  UPDATE public.profiles
  SET 
    subscription_id = p_mp_subscription_id,
    subscription_status = p_status,
    subscription_plan_id = p_mp_plan_id,
    plan_type = p_plan_type,
    next_billing_date = p_next_billing_date,
    subscription_started_at = CASE WHEN subscription_started_at IS NULL THEN timezone('utc'::text, now()) ELSE subscription_started_at END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  result := json_build_object(
    'subscription_id', v_subscription_id,
    'mp_subscription_id', p_mp_subscription_id,
    'status', p_status
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to record payment and renew credits
CREATE OR REPLACE FUNCTION record_payment_and_renew_credits(
  p_user_id UUID,
  p_mp_payment_id TEXT,
  p_mp_subscription_id TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_status_detail TEXT DEFAULT NULL,
  p_credits_to_add INTEGER DEFAULT 50
)
RETURNS json AS $$
DECLARE
  v_subscription_id UUID;
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  result json;
BEGIN
  -- Get subscription ID
  SELECT id INTO v_subscription_id
  FROM public.subscriptions
  WHERE mp_subscription_id = p_mp_subscription_id;

  -- Record payment in history
  INSERT INTO public.payment_history (
    user_id, subscription_id, mp_payment_id, mp_subscription_id,
    amount, status, status_detail, credits_added, payment_date
  )
  VALUES (
    p_user_id, v_subscription_id, p_mp_payment_id, p_mp_subscription_id,
    p_amount, p_status, p_status_detail, p_credits_to_add, timezone('utc'::text, now())
  )
  ON CONFLICT (mp_payment_id) DO NOTHING;

  -- If payment approved, add credits
  IF p_status = 'approved' THEN
    SELECT credits_remaining INTO v_current_credits
    FROM public.profiles
    WHERE id = p_user_id;

    v_new_credits := COALESCE(v_current_credits, 0) + p_credits_to_add;

    UPDATE public.profiles
    SET 
      credits_remaining = v_new_credits,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  ELSE
    v_new_credits := v_current_credits;
  END IF;

  result := json_build_object(
    'payment_recorded', true,
    'credits_added', p_credits_to_add,
    'new_total_credits', v_new_credits,
    'payment_status', p_status
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to cancel subscription
CREATE OR REPLACE FUNCTION cancel_user_subscription(p_user_id UUID)
RETURNS json AS $$
DECLARE
  v_old_plan TEXT;
  v_mp_subscription_id TEXT;
  result json;
BEGIN
  -- Get current subscription info
  SELECT plan_type, subscription_id 
  INTO v_old_plan, v_mp_subscription_id
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

  -- Update profile to free plan (keep remaining credits)
  UPDATE public.profiles
  SET 
    plan_type = 'free',
    subscription_status = 'cancelled',
    subscription_cancelled_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  result := json_build_object(
    'old_plan', v_old_plan,
    'new_plan', 'free',
    'mp_subscription_id', v_mp_subscription_id,
    'cancelled_at', timezone('utc'::text, now())
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_subscription(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment_and_renew_credits(UUID, TEXT, TEXT, DECIMAL, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_user_subscription(UUID) TO authenticated;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_subscription_id ON public.subscriptions(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON public.payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_mp_payment_id ON public.payment_history(mp_payment_id);

-- Migration complete
