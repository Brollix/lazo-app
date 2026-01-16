-- Migration: Fix Function Search Path Security
-- This migration adds SET search_path = public, pg_temp to all functions
-- to prevent SQL injection attacks via search_path manipulation
-- Fixes 14 security warnings from Supabase Database Linter

-- ============================================================================
-- DROP EXISTING FUNCTIONS (to handle signature changes)
-- ============================================================================

-- Drop functions that might have different signatures
DROP FUNCTION IF EXISTS public.decrement_credits(uuid);
DROP FUNCTION IF EXISTS public.cancel_subscription(uuid);
DROP FUNCTION IF EXISTS public.create_or_update_subscription(uuid, text, text, text, text, numeric, integer, timestamp without time zone, boolean, text);

-- ============================================================================
-- FUNCTIONS FROM EXISTING MIGRATIONS (Re-creating with search_path)
-- ============================================================================

-- 1. upsert_subscription (from supabase_subscriptions_migration.sql)
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_mp_subscription_id TEXT,
  p_mp_plan_id TEXT,
  p_plan_type TEXT,
  p_status TEXT,
  p_amount DECIMAL,
  p_billing_day INTEGER DEFAULT NULL,
  p_next_billing_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_should_update_plan BOOLEAN DEFAULT TRUE
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
  IF p_should_update_plan THEN
    UPDATE public.profiles
    SET 
      subscription_id = p_mp_subscription_id,
      subscription_status = p_status,
      subscription_plan_id = p_mp_plan_id,
      plan_type = p_plan_type,
      next_billing_date = p_next_billing_date,
      subscription_started_at = CASE WHEN subscription_started_at IS NULL THEN timezone('utc'::text, now()) ELSE subscription_started_at END,
      credits_remaining = CASE 
        WHEN p_plan_type = 'pro' THEN 100
        WHEN p_plan_type = 'ultra' THEN 100
        ELSE credits_remaining
      END,
      premium_credits_remaining = CASE 
        WHEN p_plan_type = 'ultra' THEN 20
        WHEN p_plan_type = 'pro' THEN 0
        ELSE premium_credits_remaining
      END,
      last_credit_renewal = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET 
      subscription_id = p_mp_subscription_id,
      subscription_status = p_status,
      subscription_plan_id = p_mp_plan_id,
      next_billing_date = p_next_billing_date,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  END IF;

  result := json_build_object(
    'subscription_id', v_subscription_id,
    'mp_subscription_id', p_mp_subscription_id,
    'status', p_status,
    'plan_updated', p_should_update_plan
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. record_payment_and_renew_credits (from supabase_subscriptions_migration.sql)
CREATE OR REPLACE FUNCTION record_payment_and_renew_credits(
  p_user_id UUID,
  p_mp_payment_id TEXT,
  p_mp_subscription_id TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_status_detail TEXT DEFAULT NULL,
  p_credits_to_add INTEGER DEFAULT 0
)
RETURNS json AS $$
DECLARE
  v_subscription_id UUID;
  v_plan_type TEXT;
  v_current_profile_plan TEXT;
  v_plan_determined BOOLEAN := FALSE;
  result json;
BEGIN
  -- Try to get plan from subscriptions table
  SELECT id, plan_type INTO v_subscription_id, v_plan_type
  FROM public.subscriptions
  WHERE mp_subscription_id = p_mp_subscription_id;

  IF v_plan_type IS NOT NULL THEN
    v_plan_determined := TRUE;
  ELSE
    SELECT plan_type INTO v_current_profile_plan
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF v_current_profile_plan IN ('pro', 'ultra') THEN
      v_plan_type := v_current_profile_plan;
      v_plan_determined := TRUE;
    END IF;
  END IF;

  -- Record payment in history
  INSERT INTO public.payment_history (
    user_id, subscription_id, mp_payment_id, mp_subscription_id,
    amount, status, status_detail, credits_added, payment_date
  )
  VALUES (
    p_user_id, v_subscription_id, p_mp_payment_id, p_mp_subscription_id,
    p_amount, p_status, p_status_detail, 0, timezone('utc'::text, now())
  )
  ON CONFLICT (mp_payment_id) DO NOTHING;

  -- If payment approved AND plan determined, RENEW credits and UPDATE plan
  IF p_status = 'approved' AND v_plan_determined THEN
    IF v_plan_type = 'pro' THEN
      UPDATE public.profiles
      SET 
        plan_type = 'pro',
        credits_remaining = 100,
        premium_credits_remaining = 0,
        subscription_status = 'authorized',
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    ELSIF v_plan_type = 'ultra' THEN
      UPDATE public.profiles
      SET 
        plan_type = 'ultra',
        credits_remaining = 100,
        premium_credits_remaining = 20,
        subscription_status = 'authorized',
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    END IF;
  END IF;

  result := json_build_object(
    'payment_recorded', true,
    'credits_renewed', CASE WHEN p_status = 'approved' AND v_plan_determined THEN true ELSE false END,
    'plan_type', COALESCE(v_plan_type, 'unknown'),
    'plan_determined', v_plan_determined,
    'payment_status', p_status,
    'warning', CASE 
      WHEN NOT v_plan_determined AND p_status = 'approved' 
      THEN 'Plan type could not be determined from subscription or profile. Payment recorded but credits not renewed.'
      ELSE NULL
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. cancel_user_subscription (from supabase_subscriptions_migration.sql)
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

  -- Update profile to free plan
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 4. reset_monthly_transcriptions (from add_monthly_transcription_tracking.sql)
CREATE OR REPLACE FUNCTION reset_monthly_transcriptions()
RETURNS void AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  UPDATE public.profiles
  SET monthly_transcriptions_used = 0,
      transcription_month_year = current_month,
      updated_at = timezone('utc'::text, now())
  WHERE plan_type = 'free' 
    AND transcription_month_year != current_month;
    
  RAISE NOTICE 'Reset monthly transcriptions for % users', (
    SELECT COUNT(*) FROM public.profiles 
    WHERE plan_type = 'free' AND transcription_month_year = current_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 5. cleanup_old_processing_sessions (from create_processing_sessions.sql)
CREATE OR REPLACE FUNCTION cleanup_old_processing_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_sessions
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- FUNCTIONS CREATED DIRECTLY IN SUPABASE (Retrieved from database)
-- ============================================================================

-- 6. check_user_exists
CREATE OR REPLACE FUNCTION check_user_exists(email_to_check TEXT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 7. get_next_session_number
CREATE OR REPLACE FUNCTION get_next_session_number(p_patient_id UUID)
RETURNS integer AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(session_number), 0) + 1 INTO next_num
  FROM public.sessions
  WHERE patient_id = p_patient_id;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 8. decrement_credits
CREATE OR REPLACE FUNCTION decrement_credits(p_user_id UUID)
RETURNS json AS $$
DECLARE
  current_credits INTEGER;
  current_plan TEXT;
  result json;
BEGIN
  SELECT credits_remaining, plan_type 
  INTO current_credits, current_plan
  FROM public.profiles
  WHERE id = p_user_id;

  IF current_plan = 'pro' THEN
    result := json_build_object(
      'success', true,
      'credits_remaining', -1,
      'message', 'Unlimited credits for Pro plan'
    );
    RETURN result;
  END IF;

  IF current_credits <= 0 THEN
    result := json_build_object(
      'success', false,
      'credits_remaining', 0,
      'message', 'No credits remaining'
    );
    RETURN result;
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  result := json_build_object(
    'success', true,
    'credits_remaining', current_credits - 1,
    'message', 'Credit decremented successfully'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 9. delete_session_and_reorder
CREATE OR REPLACE FUNCTION delete_session_and_reorder(
  p_session_id UUID,
  p_patient_id UUID
)
RETURNS void AS $$
DECLARE
  r RECORD;
  new_number INTEGER := 1;
BEGIN
  -- Delete the session
  DELETE FROM public.sessions WHERE id = p_session_id;

  -- Reorder remaining sessions
  FOR r IN 
    SELECT id 
    FROM public.sessions 
    WHERE patient_id = p_patient_id
    ORDER BY session_date ASC, created_at ASC
  LOOP
    UPDATE public.sessions
    SET session_number = new_number
    WHERE id = r.id;
    
    new_number := new_number + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 10. handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION handle_new_user()
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 11. update_subscription_plans_updated_at (trigger function)
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 12. cancel_subscription (simpler version, different from cancel_user_subscription)
CREATE OR REPLACE FUNCTION cancel_subscription(user_id UUID)
RETURNS json AS $$
DECLARE
  old_plan TEXT;
  result json;
BEGIN
  -- Get current plan
  SELECT plan_type INTO old_plan
  FROM public.profiles
  WHERE id = user_id;
  
  -- Update to free plan
  UPDATE public.profiles
  SET plan_type = 'free',
      credits_remaining = 3,
      updated_at = timezone('utc'::text, now())
  WHERE id = user_id;
  
  result := json_build_object(
    'old_plan', old_plan,
    'new_plan', 'free',
    'credits', 3
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 13. create_or_update_subscription
CREATE OR REPLACE FUNCTION create_or_update_subscription(
  p_user_id UUID,
  p_mp_subscription_id TEXT,
  p_subscription_name TEXT,
  p_plan_type TEXT,
  p_status TEXT,
  p_amount NUMERIC,
  p_billing_day INTEGER DEFAULT NULL,
  p_next_billing_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  p_should_update_plan BOOLEAN DEFAULT FALSE,
  p_mp_plan_id TEXT DEFAULT NULL
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
    p_status, p_amount, p_billing_day, p_next_billing_date::timestamptz
  )
  ON CONFLICT (mp_subscription_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    next_billing_date = EXCLUDED.next_billing_date,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_subscription_id;

  -- Update profile if requested
  IF p_should_update_plan THEN
    UPDATE public.profiles
    SET
      subscription_id = p_mp_subscription_id,
      subscription_status = p_status,
      plan_type = p_plan_type,
      next_billing_date = p_next_billing_date::timestamptz,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  END IF;

  result := json_build_object(
    'subscription_id', v_subscription_id,
    'mp_subscription_id', p_mp_subscription_id,
    'status', p_status
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display all functions with their search_path settings
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.proconfig IS NULL THEN 'NOT SET (VULNERABLE)'
    ELSE array_to_string(p.proconfig, ', ')
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'upsert_subscription',
    'record_payment_and_renew_credits',
    'cancel_user_subscription',
    'reset_monthly_transcriptions',
    'cleanup_old_processing_sessions',
    'check_user_exists',
    'get_next_session_number',
    'decrement_credits',
    'delete_session_and_reorder',
    'handle_new_user',
    'update_subscription_plans_updated_at',
    'cancel_subscription',
    'create_or_update_subscription'
  )
ORDER BY p.proname;

-- Migration complete
-- All 13 functions now have SET search_path = public, pg_temp
-- This prevents SQL injection via search_path manipulation
